import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from zipfile import ZipFile
from kets_dashboard.refresh_ledger import (collect_sources, fingerprint, load_ledger, record_completed,
                                         record_failed, reusable, source_manifest)

class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root/'source_20260102.xlsx'; self.source.write_bytes(b'synthetic source')
        self.book = self.root/'book.xlsx'; self.book.write_bytes(b'synthetic workbook')
        self.catalog = self.root/'data.json'; self.catalog.write_text('{}', encoding='utf-8')
        self.code = self.root/'processor.py'; self.code.write_text('version=1', encoding='utf-8')
        self.output = self.root/'dashboard.html'; self.output.write_text('synthetic output', encoding='utf-8')
        self.books = [{'id':'sample','source_id':'SRC','baseline_date':'2026-01-01','path':str(self.book)}]

    def observe(self, day='2026-01-03', configuration=None):
        return fingerprint([self.source], self.books, self.catalog, [self.code], configuration or {}, day)

    def complete(self):
        record_completed(self.root, self.observe(), [self.book,self.catalog,self.output], '2026-01-03T12:00:00+09:00')

    def test_only_completed_unchanged_outputs_can_be_reused(self):
        self.assertFalse(reusable(load_ledger(self.root),self.observe()))
        self.complete(); self.assertTrue(reusable(load_ledger(self.root),self.observe()))

    def test_changed_source_book_code_or_config_requires_processing(self):
        for path in [self.source,self.book,self.catalog,self.code]:
            with self.subTest(file=path.name):
                original=path.read_bytes();self.complete();path.write_bytes(original+b' changed')
                self.assertFalse(reusable(load_ledger(self.root),self.observe()));path.write_bytes(original)
        self.complete();self.assertFalse(reusable(load_ledger(self.root),self.observe(configuration={'rule':'changed'})))

    def test_tampered_or_missing_output_is_not_completed(self):
        self.complete();self.output.write_text('changed',encoding='utf-8')
        self.assertFalse(reusable(load_ledger(self.root),self.observe()))
        self.output.unlink();self.assertFalse(reusable(load_ledger(self.root),self.observe()))

    def test_failure_is_not_a_completion_and_keeps_last_success(self):
        self.complete();previous=load_ledger(self.root)['completed']
        self.source.write_bytes(b'new synthetic input');observed=self.observe()
        record_failed(self.root,observed,ValueError('synthetic mapping failure'))
        ledger=load_ledger(self.root)
        self.assertEqual(ledger['completed'],previous)
        self.assertEqual(ledger['failed']['signature'],observed['signature'])
        self.assertFalse(reusable(ledger,observed))

    def test_date_gate_changes_only_when_future_file_becomes_eligible(self):
        early=self.observe('2026-01-01');self.assertNotEqual(early['signature'],self.observe('2026-01-02')['signature'])
        self.assertEqual(self.observe('2026-01-02')['signature'],self.observe('2026-02-01')['signature'])

    def test_source_collection_ignores_lock_files_and_duplicates(self):
        (self.root/'~$source.xlsx').write_bytes(b'lock')
        sources=collect_sources([self.source,self.root,self.root/'missing'])
        self.assertEqual(len(sources),2) # Synthetic source and workbook, not the lock file.
        self.assertEqual(sources.count(self.source.resolve()),1)

    def test_zip_member_date_gate_is_used_and_no_files_are_extracted(self):
        archive=self.root/'exports.zip'
        with ZipFile(archive,'w') as z:z.writestr('../synthetic_20260105.xls',b'synthetic bytes')
        self.assertEqual(source_manifest([archive],'2026-01-04')[0]['date_gates'][0]['gate'],'future')
        self.assertEqual(source_manifest([archive],'2026-01-05')[0]['date_gates'][0]['gate'],'eligible')
        self.assertFalse((self.root.parent/'synthetic_20260105.xls').exists())

    def test_invalid_ledger_version_is_explicit(self):
        (self.root/'refresh-ledger.json').write_text(json.dumps({'schema_version':'other'}),encoding='utf-8')
        with self.assertRaises(ValueError):load_ledger(self.root)
