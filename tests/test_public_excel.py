"""Read-only export checks against the public catalog; standard library only."""
import json
import posixpath
import unittest
import zipfile
from datetime import date, timedelta
from pathlib import Path
import xml.etree.ElementTree as ET

from kets_dashboard.insights import public_insights

ROOT = Path(__file__).resolve().parents[1]
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
RID = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'


class PublicExcelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / 'data/public/catalog.json').read_text(encoding='utf-8'))
        cls.sheets = {}
        with zipfile.ZipFile(ROOT / 'excel/KETS_Public_Insights_20261014.xlsx') as z:
            shared = []
            if 'xl/sharedStrings.xml' in z.namelist():
                shared = [''.join(s.itertext()) for s in ET.fromstring(z.read('xl/sharedStrings.xml'))]
            rels = {r.attrib['Id']: r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
            for sheet in ET.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet', NS):
                target = rels[sheet.attrib[RID]]
                target = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/' + target)
                cells = {}
                for c in ET.fromstring(z.read(target)).findall('.//m:c', NS):
                    value = c.find('m:v', NS)
                    value = value.text if value is not None else None
                    kind = c.attrib.get('t')
                    if kind == 's':
                        value = shared[int(value)]
                    elif kind == 'inlineStr':
                        value = ''.join(c.find('m:is', NS).itertext())
                    elif kind not in ('str', 'e') and value is not None:
                        value = float(value)
                    cells[c.attrib['r']] = (value, c.find('m:f', NS) is not None, kind)
                cls.sheets[sheet.attrib['name']] = cells
            cls.charts = [n for n in z.namelist() if '/charts/chart' in n and n.endswith('.xml')]

    def test_public_source_values_and_versions_preserved(self):
        self.assertEqual(list(self.sheets), ['대시보드', '분석조건', '통계', '방법론', '버전'])
        methods = self.sheets['방법론']
        actual = {methods[f'A{r}'][0]: [methods[f'{c}{r}'][0] for c in 'BCDE'] for r in range(7, 40)}
        expected = {m['code']: [m['name'], m['sector'], m['registration_type'], m['source_url']] for m in self.data['methods']}
        self.assertEqual(actual, expected)
        versions = self.sheets['버전']
        actual = {}
        for r in range(7, 47):
            effective = (date(1899, 12, 30) + timedelta(days=versions[f'E{r}'][0])).isoformat()
            actual[versions[f'A{r}'][0]] = [versions[f'B{r}'][0], versions[f'C{r}'][0], versions[f'D{r}'][0], effective, versions[f'F{r}'][0], versions[f'G{r}'][0]]
        expected = {v['id']: [v['code'], v['version'], v['change_type'], v['effective_from'], v['name'], v['source_url']] for v in self.data['versions']}
        self.assertEqual(actual, expected)

    def test_saved_formulas_match_public_metrics_and_charts_exist(self):
        s = public_insights(self.data)
        mapping = {7:'methods', 8:'versions', 9:'revised_methods', 10:'selected_new', 11:'selected_revisions', 12:'recent_versions', 13:'watch_methods', 19:'median_age'}
        for row, key in mapping.items():
            value, formula, _ = self.sheets['통계'][f'B{row}']
            self.assertTrue(formula, key)
            self.assertEqual(value, s['metrics'][key], key)
        self.assertAlmostEqual(self.sheets['통계']['B14'][0], 6 / 33)
        self.assertAlmostEqual(self.sheets['통계']['B18'][0], -1 / 3)
        self.assertAlmostEqual(self.sheets['통계']['B20'][0], 26 / 33)
        for row, record in enumerate(s['annual'], 7):
            self.assertEqual(int(self.sheets['통계'][f'D{row}'][0]), record['year'])
            self.assertEqual([self.sheets['통계'][f'{c}{row}'][0] for c in 'EFG'], [record['new'], record['revisions'], record['cumulative_methods']])
        self.assertEqual(len(self.charts), 2)
        self.assertEqual([(sheet, ref) for sheet, cells in self.sheets.items() for ref, (_, _, kind) in cells.items() if kind == 'e'], [])
        self.assertTrue(any('미확보' in str(value) for value, _, _ in self.sheets['대시보드'].values()))


if __name__ == '__main__':
    unittest.main()
