import json,subprocess,unittest
from pathlib import Path
from kets_dashboard.materials import material_summary
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
