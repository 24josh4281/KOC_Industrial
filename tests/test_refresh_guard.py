"""Exercise the CLI decision before any Excel or dashboard generation."""
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import unittest
from kets_dashboard.refresh_ledger import record_completed

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('refresh_command',ROOT/'scripts/refresh_ors.py')
command=importlib.util.module_from_spec(spec);spec.loader.exec_module(command)

class RefreshGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp=TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.store=self.root/'runs';self.store.mkdir()
        self.source=self.root/'source_20260102.xlsx';self.source.write_bytes(b'synthetic input')
        self.book=self.root/'book.xlsx';self.book.write_bytes(b'synthetic workbook')
        self.catalog=self.root/'data.json';self.catalog.write_text('{}',encoding='utf-8')
        self.page=self.root/'dashboard.html';self.page.write_text('synthetic page',encoding='utf-8')
        self.code=self.root/'code.py';self.code.write_text('version=1',encoding='utf-8')
        self.state={'books':[{'id':'sample','source_id':'SRC','baseline_date':'2026-01-01','path':str(self.book)}],
                    'catalog':str(self.catalog),'dashboard':str(self.page),'run_at':'2026-01-03T12:00:00+09:00'}
        (self.store/'current.json').write_text(json.dumps(self.state),encoding='utf-8')
        self.cfg={'output_dir':str(self.store),'sources':[str(self.source)],'node':'synthetic-node'}
        self.settings=self.root/'settings.json';self.settings.write_text(json.dumps(self.cfg),encoding='utf-8')
        self.addCleanup(patch.stopall)
        patch.object(command,'implementation_paths',return_value=[self.code]).start()

    def complete(self):
        observed=command.observe(self.cfg,self.state['books'],self.state['catalog'],self.state['dashboard'],[self.source])
        record_completed(self.store,observed,[self.book,self.catalog,self.page],self.state['run_at'])

    def test_repeated_completed_request_never_calls_generation(self):
        self.complete();before=(self.store/'current.json').read_bytes()
        with patch.object(command,'perform',side_effect=AssertionError('Must not run Excel')) as generate:
            self.assertEqual(command.run(self.settings,True),self.root)
        generate.assert_not_called();self.assertEqual((self.store/'current.json').read_bytes(),before)
        self.assertEqual(sorted(p.name for p in self.store.iterdir()),['current.json','refresh-ledger.json'])

    def test_changed_input_reaches_generation(self):
        self.complete();self.source.write_bytes(b'new synthetic input')
        with patch.object(command,'perform',return_value=self.root) as generate:command.run(self.settings,True)
        generate.assert_called_once()

    def test_same_failure_stops_until_reviewed_and_keeps_current(self):
        before=(self.store/'current.json').read_bytes()
        with patch.object(command,'perform',side_effect=ValueError('synthetic mapping error')) as generate:
            with self.assertRaises(ValueError):command.run(self.settings,True)
            with self.assertRaisesRegex(RuntimeError,'실패 기록'):command.run(self.settings,True)
        self.assertEqual(generate.call_count,1);self.assertEqual((self.store/'current.json').read_bytes(),before)
        with patch.object(command,'perform',return_value=self.root) as retry:
            command.run(self.settings,True,retry_reviewed=True)
        retry.assert_called_once()

    def test_preview_is_not_blocked_by_previous_execution_failure(self):
        with patch.object(command,'perform',side_effect=ValueError('synthetic failure')):
            with self.assertRaises(ValueError):command.run(self.settings,True)
        with patch.object(command,'perform',return_value=self.root) as preview:command.run(self.settings,False)
        self.assertFalse(preview.call_args.args[3])

    def test_previous_success_does_not_mask_missing_dashboard(self):
        self.complete();self.page.unlink()
        with patch.object(command,'perform',return_value=self.root) as generate:command.run(self.settings,True)
        generate.assert_called_once()

    def test_damaged_zip_is_recorded_and_same_file_is_not_retried(self):
        damaged=self.root/'ors_20260102.zip';damaged.write_bytes(b'not a ZIP archive')
        self.cfg['sources']=[str(damaged)]
        self.settings.write_text(json.dumps(self.cfg),encoding='utf-8')
        with patch.object(command,'perform',side_effect=ValueError('bad ORS archive')) as generate:
            with self.assertRaisesRegex(ValueError,'bad ORS archive'):command.run(self.settings,True)
            with self.assertRaisesRegex(RuntimeError,'실패 기록'):command.run(self.settings,True)
        generate.assert_called_once()
        self.assertEqual(json.loads((self.store/'refresh-ledger.json').read_text(encoding='utf-8'))['failed']['error_type'],'ValueError')
