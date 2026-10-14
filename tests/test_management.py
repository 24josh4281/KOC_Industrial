import json,subprocess,unittest
from pathlib import Path
from kets_dashboard.management import CONFIG,date_parts,management_rows,management_summary
ROOT=Path(__file__).resolve().parents[1]

def fixture():
    sheets=[]
    for spec in CONFIG['sheets']:
        rows=[]
        for n in range(2,8):
            values={'title':f'합성 업무 {n}','key':n,'date':[None,'2024-02-29','2023-02-29','2025-07','2026-01-03','0001-01-01'][n-2],'status':'합성 승인' if n%2 else None,'stage':'합성 보완' if n%2 else '합성 검토','owner':f'담당 {n%2}','type':'신규','sector':'합성 분야'}
            rows.append({'row':n,'cells':[{'col':spec[k],'value':v} for k,v in values.items() if spec.get(k)]})
        rows.append({'row':8,'cells':[{'col':spec['title'],'value':''}]})
        sheets.append({'name':spec['name'],'header_row':1,'rows':rows})
    sheets.append({'name':'ORS 방법론','header_row':1,'rows':[{'row':n,'cells':[{'col':19,'value':'합성 분야'},{'col':7,'value':'신규'}]} for n in range(2,8)]})
    return {'sheets':sheets,'applications':[{'internal_source_row':n,'source_row':n,'type_conflict':n==2} for n in range(2,8)]}

class ManagementTests(unittest.TestCase):
    def test_dates_without_invented_day(self):
        self.assertEqual(date_parts(None),(None,None,'신청일 미확보'))
        self.assertEqual(date_parts('2025-07'),('2025','07','월까지만 확인'))
        self.assertEqual(date_parts('2023-02-29'),(None,None,'날짜 형식 확인'))
        self.assertEqual(date_parts('2024-02-29'),('2024','02','일자 확인'))

    def test_full_mapping_and_multi_select_parity(self):
        data=fixture();rows=management_rows(data)
        cases=[{'book':b,'filters':f,'query':q} for b in ['management','disclosure'] for f in [{},{'year':['2024','2025']},{'region':['국내'],'stage':['합성 보완']},{'year':['미확보']},{'owner':['담당 0'],'type':['신규']},{'hold':['유형 불일치·보류']},{'year':['1999']}] for q in ['','업무 3']]
        output=subprocess.run(['node',str(ROOT/'scripts/management_snapshot.mjs')],input=json.dumps({'data':data,'cases':cases}),capture_output=True,text=True,encoding='utf-8',check=True)
        self.assertEqual(json.loads(output.stdout),{'rows':rows,'snapshots':[management_summary(rows,c['book'],c['filters'],c['query']) for c in cases]})
        self.assertEqual(len(rows),54)
        self.assertEqual(management_summary(rows)['type_holds'],1)
        self.assertTrue(all(r['hold']=='해당 없음' for r in rows if r['book']=='disclosure'))

    def test_missing_sheets_are_not_fabricated(self):
        self.assertEqual(management_rows({'sheets':[]}),[])
        self.assertEqual(management_summary([])['row_count'],0)
