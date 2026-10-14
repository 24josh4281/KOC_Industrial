import copy,unittest
from kets_dashboard.ors_refresh import make_plan,dated_filename,classify

CONFIG={'datasets':{'sample':{'keys':['번호','방법론명'],'targets':[['management','ORS']]}}}
def fixtures():
    cols=[{'col':1,'label':'번호'},{'col':2,'label':'방법론명'},{'col':3,'label':'처리상태'},{'col':4,'label':'수량'},{'col':5,'label':'처리일자'}]
    row={'row':2,'cells':[{'col':1,'value':1},{'col':2,'value':'합성 방법론'},{'col':3,'value':'검토'},{'col':4,'value':7},{'col':5,'value':'2026-01-02'}]}
    source={'filename':'합성_20260103.xls','sheet':'합성','sha256':'a','as_of':'2026-01-03','kind':'sample','columns':cols,'rows':[copy.deepcopy(row)]}
    source['rows'][0]['cells'][2]['value']='보완'
    target={('management','ORS'):{'columns':copy.deepcopy(cols),'rows':[row],'header_row':1}}
    return source,target
def plan(s,t):return make_plan(s,t,{'management':'2026-01-02'},CONFIG)

class RefreshTests(unittest.TestCase):
    def test_future_export_waits_until_eligible_seoul_date(self):
        s,t=fixtures()
        early=make_plan([s],t,{'management':'2026-01-02'},CONFIG,as_of='2026-01-02')
        self.assertFalse(early['writes']);self.assertEqual(early['files'][0]['status'],'future_date')
        ready=make_plan([s],t,{'management':'2026-01-02'},CONFIG,as_of='2026-01-03')
        self.assertEqual(len(ready['writes']),1)
    def test_exact_match_preserves_rows_and_only_changed_values(self):
        s,t=fixtures();p=plan([s],t)
        self.assertEqual([(w['row'],w['col'],w['value']) for w in p['writes']],[(2,3,'보완')])
        self.assertEqual(t[('management','ORS')]['rows'][0]['cells'][2]['value'],'검토')
    def test_old_and_undated_exports_never_overwrite(self):
        for dt in ['2026-01-01',None]:
            s,t=fixtures();s['as_of']=dt;p=plan([s],t);self.assertFalse(p['writes']);self.assertIn(p['files'][0]['status'],['stale','date_unknown'])
    def test_reordered_headers_map_by_name(self):
        s,t=fixtures();s['columns'][2]['col']=6;s['rows'][0]['cells'][2]['col']=6
        self.assertEqual(plan([s],t)['writes'][0]['col'],3)
    def test_duplicate_identity_and_unmatched_are_held(self):
        s,t=fixtures();s['rows'].append(copy.deepcopy(s['rows'][0]));self.assertFalse(plan([s],t)['writes'])
        s,t=fixtures();s['rows'][0]['cells'][0]['value']=2;p=plan([s],t);self.assertFalse(p['writes']);self.assertEqual(p['pending'][0]['reason'],'new_or_unmatched')
    def test_blank_preserved_and_zero_is_valid(self):
        s,t=fixtures();s['rows'][0]['cells'][3]['value']=None;p=plan([s],t);self.assertFalse(any(w['col']==4 for w in p['writes']))
        s['rows'][0]['cells'][3]['value']=0;self.assertTrue(any(w['value']==0 for w in plan([s],t)['writes']))
    def test_formulas_not_overwritten(self):
        s,t=fixtures();t[('management','ORS')]['rows'][0]['cells'][2]['formula']='=A1';self.assertFalse(plan([s],t)['writes'])
    def test_equal_date_conflict_and_newer_unchanged_value(self):
        s,t=fixtures();other=copy.deepcopy(s);other['sha256']='b';other['rows'][0]['cells'][2]['value']='검토'
        self.assertFalse(plan([s,other],t)['writes'])
        other['as_of']='2026-01-04';self.assertFalse(plan([s,other],t)['writes'])
    def test_processing_date_regression_is_held(self):
        s,t=fixtures();s['rows'][0]['cells'][4]['value']='2026-01-01';p=plan([s],t)
        self.assertFalse(p['writes']);self.assertEqual(p['pending'][0]['reason'],'older_record_date')
    def test_changed_identity_does_not_merge_by_title(self):
        s,t=fixtures();s['rows'][0]['cells'][1]['value']='다른 방법론';self.assertFalse(plan([s],t)['writes'])
    def test_filename_and_dataset_detection(self):
        self.assertEqual(dated_filename('국내_20260921092518.xls'),'2026-09-21');self.assertIsNone(dated_filename('0921.zip'))
        self.assertEqual(classify('국내 사업신청', ['번호','신청유형','[신청정보] 신청사업명']),'domestic_project')
    def test_duplicate_file_is_not_counted_twice(self):
        s,t=fixtures();p=plan([s,s],t);self.assertEqual(len(p['writes']),1);self.assertEqual(p['files'][1]['status'],'duplicate_file')
    def test_formula_like_data_held(self):
        s,t=fixtures();s['rows'][0]['cells'][2]['value']='=HYPERLINK("x")';self.assertFalse(plan([s],t)['writes'])
    def test_amount_change_is_review_only_in_operational_policy(self):
        s,t=fixtures();s['rows'][0]['cells'][3]['value']=99;cfg=copy.deepcopy(CONFIG);cfg['auto_update_headers']=['처리상태','처리일자']
        p=make_plan([s],t,{'management':'2026-01-02'},cfg)
        self.assertFalse(any(w['col']==4 for w in p['writes']));self.assertTrue(any(p['reason']=='non_status_change_review' for p in p['pending']))
    def test_duplicate_helper_header_does_not_hide_unique_raw_header(self):
        s,t=fixtures();target=t[('management','ORS')];target['columns'].append({'col':6,'label':'방법론명'});target['rows'][0]['cells'].append({'col':6,'value':'합성 방법론','formula':'=B2'})
        self.assertEqual(len(plan([s],t)['writes']),1)
