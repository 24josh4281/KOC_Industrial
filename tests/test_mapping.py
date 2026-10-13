from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from stage_workbook import code_version, input_date, map_records
from kets_dashboard.core import validate, ValidationError


def record(raw, sheet='sample', row=2):
    return {'raw': raw, 'source_sheet': sheet, 'source_row': row}


class MappingTests(unittest.TestCase):
    def reference(self, version='01'):
        return record({'방법론 고유번호': '03A-999-Ver' + version, '방법론명': '합성 시험 방법론',
                       '산업/발전 구분': '산업', '대분류': '원문 분류 ', '신규/개정': '신규' if version == '01' else '개정',
                       '방법론유효시작일': '2020-01-01'})

    def test_method_and_version_units_and_missing_dates(self):
        result = map_records([self.reference(), self.reference('02')], [], [], observed_on='2026-10-13', source_hash='test')
        self.assertEqual(len(result['proposed_methodologies']), 1)
        self.assertEqual(len(result['proposed_versions']), 2)
        self.assertIsNone(result['proposed_methodologies'][0]['first_registered_on'])
        self.assertIsNone(result['proposed_methodologies'][0]['registration_confirmed_on'])
        self.assertTrue(all(v['registered_on'] is None for v in result['proposed_versions']))
        self.assertEqual(result['proposed_methodologies'][0]['official_sector'], '원문 분류 ')
        self.assertEqual(result['proposed_status_events'], [])
        self.assertRaises(ValidationError, validate, result)

    def test_conflict_and_missing_revision_link_are_not_guessed(self):
        app = record({'번호': 1, '방법론명': '동일 명칭', '신청유형': '개정', '방법론고유번호': None,
                      '최초신청일': '2025-01-01', '처리상태': '검토승인',
                      '이력': '2025-01-01 11:00:00 - 방법론신청\n2025-02-01 12:00:00 - 검토승인'})
        internal = record({'번호': 99, '방법론명': '동일 명칭', '최초신청일': '2025-01-01',
                           '신청유형': '신규', '진행상태': '내부 검토완료'})
        result = map_records([], [app], [internal], observed_on='2026-10-13', source_hash='test')
        candidate = result['proposed_applications'][0]
        self.assertIn('application_type_conflict', candidate['blockers'])
        self.assertIn('revision_methodology_link_missing', candidate['blockers'])
        self.assertIsNone(candidate['proposed']['methodology_id'])
        self.assertEqual(candidate['proposed']['scope'], 'unclassified')
        self.assertTrue(all(e['stage'] is None for e in result['raw_review_history']))

    def test_ambiguous_code_and_dates_rejected(self):
        self.assertEqual(code_version('03A-999-Ver01'), ('03A-999', '01'))
        self.assertEqual(code_version('03A-999-Ver01 / 02'), (None, None))
        self.assertIsNone(input_date('-'))
        self.assertRaises(ValidationError, input_date, 0)
        self.assertRaises(ValidationError, input_date, '2026-10-13 13:30')

    def test_duplicate_application_number_rejected(self):
        app = record({'번호': 1, '방법론명': '시험', '신청유형': '신규', '방법론고유번호': None,
                      '최초신청일': '2025-01-01', '처리상태': '미확인', '이력': ''})
        self.assertRaises(ValidationError, map_records, [], [app, app], [], observed_on='2026-10-13', source_hash='test')
