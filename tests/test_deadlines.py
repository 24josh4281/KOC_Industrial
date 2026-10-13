import copy,json,subprocess,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'python'))
from kets_dashboard.core import load,snapshot
from kets_dashboard.deadlines import deadline_alerts

class DeadlineTests(unittest.TestCase):
    def test_boundaries_completion_missing_and_parity(self):
        sample=snapshot(load(ROOT/'data/demo/dataset.json'))
        template=copy.deepcopy(sample['application_rows'][0])
        sample['application_rows']=[]
        for key,due in [('late','2026-10-12'),('today','2026-10-13'),('soon','2026-10-20'),('later','2026-10-21'),('unknown',None)]:
            sample['application_rows'].append({**template,'id':key,'due_on':due,'is_reviewing':True,'waiting':True})
        sample['metadata']['as_of']='2026-10-13'
        sample['application_rows'].append({**template,'id':'completed','due_on':'2026-10-10','is_reviewing':False,'waiting':False})
        sample['application_rows'].append({**template,'id':'received','due_on':'2026-10-10','is_reviewing':True,'waiting':False})
        result=deadline_alerts(sample)
        self.assertEqual([result[k] for k in ('overdue','today','upcoming','unknown')],[1,1,1,1])
        self.assertEqual([r['id'] for r in result['rows']],['late','today','soon','unknown'])
        self.assertEqual([r['days_remaining'] for r in result['rows']],[-1,0,7,None])
        missing=copy.deepcopy(sample);missing['metadata']['coverage']['reviews']='missing'
        empty=copy.deepcopy(sample);empty['application_rows']=[]
        cases=[(s,n) for s in (sample,missing,empty) for n in (0,1,7,30)]
        expected=[deadline_alerts(s,n) for s,n in cases]
        actual=json.loads(subprocess.run(['node',str(ROOT/'scripts/deadline_snapshot.mjs')],input=json.dumps(cases),text=True,encoding="utf-8",capture_output=True,check=True).stdout)
        self.assertEqual(actual,expected)
        self.assertIsNone(deadline_alerts(missing)['overdue'])
        self.assertEqual(deadline_alerts(empty)['overdue'],0)
    def test_invalid_window(self):
        sample=snapshot(load(ROOT/'data/demo/dataset.json'))
        for value in (-1,1.5,True):
            with self.assertRaises(ValueError):deadline_alerts(sample,value)
