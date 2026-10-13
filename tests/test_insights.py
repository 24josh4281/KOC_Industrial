import copy,json,subprocess,unittest
from pathlib import Path
from kets_dashboard.insights import public_insights
ROOT=Path(__file__).resolve().parents[1]

class PublicInsightTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=json.loads((ROOT/'data/public/catalog.json').read_text(encoding='utf-8'))
    def test_public_schema_and_only_public_sources(self):
        from jsonschema import Draft202012Validator,FormatChecker
        schema=json.loads((ROOT/'schemas/public_catalog.schema.json').read_text(encoding='utf-8'))
        Draft202012Validator(schema,format_checker=FormatChecker()).validate(self.data)
        self.assertEqual(len({m['code'] for m in self.data['methods']}),33)
        self.assertEqual(len({v['id'] for v in self.data['versions']}),40)
        for m in self.data['methods']:
            self.assertTrue(m['source_url'].startswith('https://ors.gir.go.kr/home/orme010/historyRead.do?'))
        self.assertNotIn('applications',self.data)
    def test_full_python_js_public_scenarios(self):
        sectors=sorted({m['sector'] for m in self.data['methods']})
        options=[{}]+[dict(sector=s,year=y,revision=r) for s in ['all',*sectors] for y in [2016,2025,2026] for r in ['all','revised','unrevised']]
        options += [dict(as_of='2024-02-29',year=2024),dict(query='03A-030'),dict(query='no-match'),dict(registration='직권등록'),dict(recent_days=1),dict(watch_days=365)]
        expected=[public_insights(self.data,**o) for o in options]
        actual=json.loads(subprocess.run(['node',str(ROOT/'scripts/insights_snapshot.mjs')],input=json.dumps(dict(dataset=self.data,options=options)),encoding='utf-8',text=True,capture_output=True,check=True).stdout)
        self.assertEqual(actual,expected)
        self.assertGreater(len(options),60)
    def test_units_missing_and_reconciliation(self):
        s=public_insights(self.data)
        self.assertEqual(sum(r['count'] for r in s['sectors']),s['metrics']['methods'])
        self.assertEqual(sum(r['new']+r['revisions'] for r in s['annual']),s['metrics']['versions'])
        self.assertEqual(s['annual'][-1]['cumulative_methods'],s['metrics']['methods'])
        self.assertIsNone(s['metrics']['applications'])
        self.assertIsNone(s['metrics']['overdue'])
        empty=public_insights(self.data,query='no-match')
        self.assertEqual(empty['metrics']['methods'],0)
        self.assertIsNone(empty['metrics']['revision_share'])
        self.assertIsNone(empty['comparison']['percent'])
    def test_cutoffs_and_thresholds(self):
        d=copy.deepcopy(self.data);d['methods']=d['methods'][:1];code=d['methods'][0]['code']
        d['versions']=[dict(d['versions'][0],code=code,id=code+'-Ver01',version='01',change_type='new',effective_from='2026-10-14')]
        self.assertEqual(public_insights(d,recent_days=1)['metrics']['recent_versions'],1)
        self.assertEqual(public_insights(d,as_of='2026-10-13',year=2026)['metrics']['methods'],0)
        d['versions'][0]['effective_from']='2026-10-13'
        self.assertEqual(public_insights(d,recent_days=1,watch_days=1)['metrics']['recent_versions'],0)
        self.assertEqual(public_insights(d,watch_days=1)['metrics']['watch_methods'],0)
