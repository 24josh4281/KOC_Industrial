import copy, json, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'python'))
from kets_dashboard.core import load,validate,snapshot,public_dataset,ValidationError
class CoreTests(unittest.TestCase):
 def setUp(self): self.d=load(ROOT/'data/demo/dataset.json')
 def test_baseline(self):
  k=snapshot(self.d)['kpis'];self.assertEqual([k[x] for x in ['registered','active','new_year','revisions_year','reviewing','pending_registration','unknown_year','overdue']],[9,7,2,3,5,1,1,1])
 def test_revision_not_new(self):
  d=copy.deepcopy(self.d);v=copy.deepcopy(d['versions'][-1]);v.update(id='DEMO-X',version='99');d['versions'].append(v)
  self.assertEqual(snapshot(d)['kpis']['registered'],9);self.assertEqual(snapshot(d)['kpis']['revisions_year'],4)
 def test_missing_not_zero(self):
  d=load(ROOT/'data/templates/empty.dataset.json');k=snapshot(d)['kpis'];self.assertIsNone(k['registered']);self.assertIsNone(k['reviewing'])
 def test_unknown_year_not_assigned(self):
  s=snapshot(self.d);self.assertEqual(s['annual'][-1]['cumulative_known_year'],8);self.assertEqual(s['kpis']['registered'],9)
 def test_supplement_does_not_reset_age(self):
  a=next(a for a in snapshot(self.d)['application_rows'] if a['id']=='DEMO-A001');self.assertEqual(a['stage_started_on'],'2026-07-05');self.assertTrue(a['waiting'])
 def test_historical_stage(self):
  s=snapshot(self.d,as_of='2026-09-01');a=next(a for a in s['application_rows'] if a['id']=='DEMO-A004');self.assertEqual(a['stage'],'committee')
 def test_knowledge_cutoff(self):
  d=copy.deepcopy(self.d);e=d['review_events'][-1];e['recorded_on']='2026-10-20';a=next(a for a in snapshot(d)['application_rows'] if a['id']=='DEMO-A010');self.assertTrue(a['waiting'])
 def test_duplicate_rejected(self):
  self.d['methodologies'].append(copy.deepcopy(self.d['methodologies'][0]));self.assertRaises(ValidationError,validate,self.d)
 def test_dangling_fk_rejected(self):
  self.d['review_events'][0]['application_id']='missing';self.assertRaises(ValidationError,validate,self.d)
 def test_demo_promotion_rejected(self):
  self.d['metadata']['mode']='production';self.assertRaises(ValidationError,validate,self.d)
 def test_same_day_sequence(self):
  d=copy.deepcopy(self.d);e=copy.deepcopy(d['review_events'][1]);e.update(id='DEMO-E999',sequence=999,occurred_on='2026-07-05',recorded_on='2026-07-05',stage='consultation');d['review_events'].append(e)
  # Later review event changes stage but is supplement -> invalid rather than silently corrupting chronology.
  self.assertRaises(ValidationError,validate,d)
 def test_industry_transition(self):self.assertEqual(snapshot(self.d,scope='industry_transition')['kpis']['registered'],10)
 def test_public_export_strips_all_reviews(self):
  d=load(ROOT/'data/templates/empty.dataset.json');d['metadata']['coverage']['registrations']='partial';d['sources']=[{'id':'S','label':'Official','url':'https://example.org','kind':'official','access':'public','retrieved_on':'2026-10-13','file_sha256':None}];m=copy.deepcopy(self.d['methodologies'][0]);m.update(id='M',code='M',source_id='S',public_allowed=True);d['methodologies']=[m];d['metadata']['coverage']['scope_note']='sensitive note';p=public_dataset(d);self.assertEqual(len(p['methodologies']),1);self.assertEqual(p['applications'],[]);self.assertNotIn('sensitive',json.dumps(p));self.assertEqual(p['metadata']['coverage']['reviews'],'missing')
 def test_transition_required(self):
  self.d['review_events'][1]['action']='note';self.assertRaises(ValidationError,validate,self.d)
if __name__=='__main__':unittest.main()
