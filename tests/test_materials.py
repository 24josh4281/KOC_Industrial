import json,subprocess,unittest
from pathlib import Path
from kets_dashboard.materials import material_summary,source_coverage
ROOT=Path(__file__).resolve().parents[1]

class MaterialsParityTests(unittest.TestCase):
    def test_source_units_and_raw_status_parity(self):
        fixture={'files':[{'id':'test'}],'sheets':[{'rows':[{'row':1,'cells':[{'col':1,'value':'header'}]},{'row':2,'cells':[{'col':1,'value':None},{'col':2,'value':0},{'col':3,'value':'#REF!','error':True}]}]}], 'applications':[{'official_status_text':'보완요청','type_conflict':True},{'official_status_text':None}], 'history':[{},{}]}
        for data in [{},fixture,{**fixture,'sheets':fixture['sheets']*2}]:
            with self.subTest(sheet_count=len(data.get('sheets',[]))):
                expected=material_summary(data)
                result=subprocess.run(['node',str(ROOT/'scripts/materials_summary.mjs')],input=json.dumps(data,ensure_ascii=False),capture_output=True,text=True,encoding='utf-8',check=True)
                self.assertEqual(json.loads(result.stdout),expected)
        self.assertEqual(material_summary(fixture)['methodology_applications'],2)
        self.assertEqual(material_summary(fixture)['nonempty_rows'],2)
        self.assertEqual(material_summary(fixture)['cached_error_cells'],1)

    def test_file_cell_coverage_matches_web_without_business_counting(self):
        fixture={'files':[{'id':'M','filename':'managed.xlsx','format':'xlsx'},
                          {'id':'O','filename':'ors.xls','format':'xls'}],
                 'sheets':[{'source_id':'M','rows':[{'cells':[{'value':0},{'value':'기준 미확인','formula':'=A1'}, {'value':None,'error':True}]}]},
                           {'source_id':'O','rows':[{'cells':[{'value':'raw'}]}]}]}
        expected=source_coverage(fixture)
        result=subprocess.run(['node',str(ROOT/'scripts/source_coverage.mjs')],input=json.dumps(fixture,ensure_ascii=False),capture_output=True,text=True,encoding='utf-8',check=True)
        self.assertEqual(json.loads(result.stdout),expected)
        self.assertEqual(expected[0]['cells'],3)
        self.assertEqual(expected[0]['unavailable'],1)
        self.assertEqual(expected[0]['saved_errors'],1)
