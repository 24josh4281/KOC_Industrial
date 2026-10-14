"""One-command local ORS -> preserved Excel -> JSON -> offline dashboard refresh."""
import argparse,copy,csv,hashlib,html,json,os,re,shutil,subprocess,sys,uuid
from collections import Counter
from datetime import datetime
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import xml.etree.ElementTree as E

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'python'))
from kets_dashboard.ors_refresh import CONFIG,read_exports,make_plan
from kets_dashboard.xlsx_snapshot import read_xlsx,update_catalog_book,S
from kets_dashboard.management import management_rows,management_summary
from kets_dashboard.materials import material_summary
from kets_dashboard.refresh_ledger import (collect_sources,fingerprint,load_ledger,reusable,record_completed,
    record_failed,source_manifest,SEOUL)

def write_json(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def restore_calculation(source,target):
    with ZipFile(source) as z:old=E.fromstring(z.read('xl/workbook.xml')).find(S+'calcPr')
    with ZipFile(target) as z:entries={n:z.read(n) for n in z.namelist()}
    # Preserve namespace prefixes/extension attributes using lxml for package edits.
    from lxml import etree as L
    root=L.fromstring(entries['xl/workbook.xml']);cur=root.find(S+'calcPr')
    if cur is not None:root.remove(cur)
    if old is not None:
        copied=L.fromstring(E.tostring(old));ext=root.find(S+'extLst');root.insert(list(root).index(ext) if ext is not None else len(root),copied)
    entries['xl/workbook.xml']=L.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)
    tmp=Path(str(target)+'.package.tmp')
    with ZipFile(tmp,'w',ZIP_DEFLATED) as z:
        for n,v in entries.items():z.writestr(n,v)
    tmp.replace(target)

def verify(before,after,writes,calculated):
    changes={(w['sheet'],w['row'],w['col']):w for w in writes};cache_changes=[];new_errors=[]
    assert before.keys()==after.keys(),'Sheet collection changed'
    for name,cells in before.items():
        for addr in cells.keys()|after[name].keys():
            a=cells.get(addr);b=after[name].get(addr)
            assert a is not None and b is not None,f'Unexpected cell addition/removal {name}!{addr}'
            norm=lambda f:re.sub(r"'([^' !]+)'!",r'\1!',f or '')
            assert norm(a.get('formula'))==norm(b.get('formula')) and a.get('_array_ref')==b.get('_array_ref'),f'Formula changed {name}!{addr}'
            if b.get('error') and not a.get('error'):new_errors.append([name,addr,b['value']])
            if a['value']!=b['value'] or a.get('error')!=b.get('error'):
                row=int(re.search(r'\d+',addr)[0]);key=(name,row,a['col'])
                if key in changes:assert b['value']==changes[key]['value'],f'Imported value mismatch {key}'
                else:assert a.get('formula') and name in calculated,f'Unapproved manual value changed {name}!{addr}'
                cache_changes.append({'sheet':name,'cell':addr,'before':a['value'],'after':b['value']})
    assert not new_errors,f'New formula errors; outputs remain unpublished: {new_errors[:12]}'
    return cache_changes

def package(data,build,destination):
    index=(build/'index.html').read_text(encoding='utf-8');js=re.search(r'<script[^>]*src="([^"]+)"',index).group(1);css=re.search(r'<link[^>]*href="([^"]+\.css)"',index).group(1)
    bundle=(build/'assets'/Path(js).name).read_text(encoding='utf-8');styles=(build/'assets'/Path(css).name).read_text(encoding='utf-8')
    raw=json.dumps(data,ensure_ascii=False,separators=(',',':'));(destination/'dashboard-data.json').write_text(raw,encoding='utf-8')
    output='<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; connect-src \'none\'; base-uri \'none\'; form-action \'none\'"><title>ORS 자동반영 · 로컬 대시보드</title><style>'+styles.replace('</style','<\\/style')+'</style></head><body><div id="root"></div><script id="local-materials-data" type="application/json">'+raw.replace('<','\\u003c')+'</script><script type="module">'+bundle.replace('</script','<\\/script')+'</script></body></html>'
    (destination/'dashboard.html').write_text(output,encoding='utf-8')
    assert json.loads(re.search(r'<script id="local-materials-data" type="application/json">(.*?)</script>',output,re.S).group(1))==data
    downloads=destination/'downloads';downloads.mkdir()
    for name in ['KETS_Methodology_Dashboard.xlsx','KETS_Public_Insights_20261014.xlsx','KETS_Dashboard_Manual_20261014.pdf']:
        shutil.copyfile(build/'downloads'/name,downloads/name)

def implementation_paths():
    return (list((ROOT/'python/kets_dashboard').glob('*.py'))+
        [ROOT/'scripts'/name for name in ['refresh_ors.py','ors_refresh_native.ps1','management_snapshot.mjs']]+
        [ROOT/'web/src/management.mjs',ROOT/'config/ors_refresh.json',ROOT/'config/management_views.json',ROOT/'schemas/local_materials.schema.json',ROOT/'requirements-ingest.txt']+
        [p for p in (ROOT/'web/dist').rglob('*') if p.is_file()])

def observe(cfg,books,catalog,dashboard,sources):
    configuration={k:v for k,v in cfg.items() if k not in ('catalog','books')}
    configuration['current_dashboard']=dashboard
    return fingerprint(sources,books,catalog,implementation_paths(),configuration)

def output_paths(state,store):
    folder=Path(state['dashboard']).parent
    return [Path(state['catalog']),Path(state['dashboard']),Path(store)/'최근결과.html']+[Path(b['path']) for b in state['books']]+[
        folder/'verification.json',folder/'refresh-plan.json',folder/'value-changes.json']+[
        folder/'downloads'/name for name in ['KETS_Methodology_Dashboard.xlsx','KETS_Public_Insights_20261014.xlsx','KETS_Dashboard_Manual_20261014.pdf']]

def register_existing(cfg,state,sources,observed):
    if not state:raise ValueError('등록할 검증 완료 결과가 없습니다.')
    folder=Path(state['dashboard']).parent
    proof=json.loads((folder/'verification.json').read_text(encoding='utf-8'))
    required={'python_js_conditions':12,'excel_classification_fields':11,'source_hashes_preserved':True,
        'formulas_preserved':True,'new_formula_errors':0,'charts_per_book':6,'slicers_per_book':10}
    if any(type(proof.get(k)) is not type(v) or proof.get(k)!=v for k,v in required.items()):raise ValueError('완료 검사 근거가 부족하여 기존 결과를 등록하지 않습니다.')
    data=json.loads(Path(state['catalog']).read_text(encoding='utf-8'))
    import jsonschema
    jsonschema.validate(data,json.loads((ROOT/'schemas/local_materials.schema.json').read_text(encoding='utf-8')))
    exports=read_exports(sources)
    actual={(e['filename'],e['sha256'],e['as_of']) for e in exports}
    recorded={(e['filename'],e['sha256'],e['source_date']) for e in data['refresh']['files']}
    if not actual or actual!=recorded:raise ValueError('기존 결과와 수신 ORS 자료가 다릅니다. 새 자료의 갱신 검증이 필요합니다.')
    if data['refresh']['baseline_dates']!={b['id']:b['baseline_date'] for b in state['books']}:
        raise ValueError('기존 결과와 기준 날짜가 다릅니다.')
    if data['refresh']['run_at']!=state['run_at']:raise ValueError('현재 결과와 실행 기록의 날짜가 다릅니다.')
    for b in state['books']:
        file=next(f for f in data['files'] if f['id']==b['source_id'])
        if file['sha256']!=sha(b['path']) or file['filename']!=Path(b['path']).name:
            raise ValueError('Excel/JSON 파일 정보가 달라 등록할 수 없습니다.')
    page=Path(state['dashboard']).read_text(encoding='utf-8')
    embedded=re.search(r'<script id="local-materials-data" type="application/json">(.*?)</script>',page,re.S)
    if embedded is None or json.loads(embedded.group(1))!=data:raise ValueError('HTML/JSON 데이터가 달라 등록할 수 없습니다.')
    index=(ROOT/'web/dist/index.html').read_text(encoding='utf-8')
    for pattern,closing in [(r'<script[^>]*src="([^"]+)"','</script'),(r'<link[^>]*href="([^"]+\.css)"','</style')]:
        path=ROOT/'web/dist/assets'/Path(re.search(pattern,index).group(1)).name
        if path.read_text(encoding='utf-8').replace(closing,closing.replace('</','<\\/')) not in page:
            raise ValueError('현재 웹 빌드와 기존 HTML이 다릅니다. 판본 검증이 필요합니다.')
    if observed!=observe(cfg,state['books'],state['catalog'],state['dashboard'],collect_sources(cfg['sources'])):
        raise ValueError('등록 검사 중 자료가 변경됐습니다.')
    record_completed(cfg['output_dir'],observed,output_paths(state,cfg['output_dir']),state['run_at'],registration=True)
    print('기존 검증 완료 결과를 실행 장부에 등록했습니다. 엑셀·대시보드는 재생성하지 않았습니다.',flush=True)
    return folder

def run(settings,apply,retry_reviewed=False,register_current=False):
    cfg=json.loads(settings.read_text(encoding='utf-8-sig'))
    for p in cfg.get('python_module_paths',[]):sys.path.insert(0,p)
    store=Path(cfg['output_dir']);store.mkdir(parents=True,exist_ok=True)
    state_path=store/'current.json';state=json.loads(state_path.read_text(encoding='utf-8')) if state_path.exists() else None
    books=state['books'] if state else cfg['books'];catalog=state['catalog'] if state else cfg['catalog']
    sources=collect_sources(cfg['sources'])
    if not sources:raise ValueError('ORS 입력 파일이 없습니다. 입력 폴더의 Excel/ZIP을 확인하세요.')
    observed=observe(cfg,books,catalog,state['dashboard'] if state else None,sources)
    ledger=load_ledger(store)
    if state and reusable(ledger,observed):
        print('새 자료·판본 변경이 없어 검증 완료 결과를 유지합니다.',flush=True)
        print(json.dumps({'status':'skipped_unchanged','current':state['dashboard']},ensure_ascii=False),flush=True)
        return Path(state['dashboard']).parent
    if register_current:return register_existing(cfg,state,sources,observed)
    if apply and ledger.get('failed') and ledger['failed']['signature']==observed['signature'] and not retry_reviewed:
        raise RuntimeError('같은 자료의 실패 기록이 있어 반복 실행을 중단합니다. 원인 또는 외부 상태를 확인한 뒤 --retry-reviewed로 한 번 재시도하세요.')
    try:return perform(cfg,state,sources,apply,observed)
    except Exception as exc:
        if apply:record_failed(store,observed,exc)
        raise

def perform(cfg,state,sources,apply,observed):
    store=Path(cfg['output_dir']);state_path=store/'current.json'
    catalog_path=Path(state['catalog'] if state else cfg['catalog']);data=json.loads(catalog_path.read_text(encoding='utf-8'))
    books=copy.deepcopy(state['books'] if state else cfg['books']);before={};input_hashes={}
    for b in books:
        input_hashes[b['id']]=sha(b['path']);before[b['id']]=update_catalog_book(data,b['id'],b['path'],b['source_id'])
    exports=read_exports(sources);sheetmap={}
    for b in books:
        for s in data['sheets']:
            if s['source_id']==b['source_id']:sheetmap[(b['id'],s['name'])]=s
    plan=make_plan(exports,sheetmap,{b['id']:b['baseline_date'] for b in books})
    stamp=datetime.now(SEOUL).isoformat(timespec='seconds');destination=store/(datetime.now(SEOUL).strftime('%Y%m%d_%H%M%S')+'_'+uuid.uuid4().hex[:6]);destination.mkdir()
    plan['run_at']=stamp;plan['books']=[]
    for b in books:
        touched={w['sheet'] for w in plan['writes'] if w['book']==b['id']}
        calculate=[]
        if touched:
            calculate=sorted(touched)
            for name,cells in before[b['id']].items():
                if name.startswith('DB_') or name in touched:continue
                if any(any(("'"+s.replace("'","''")+"'!") in (c.get('formula') or '') or (s+'!') in (c.get('formula') or '') for s in touched) for c in cells.values()):calculate.append(name)
            # Existing indirect lookups and dashboard helpers settle in a second pass.
            calculate+=calculate[:]+['DB_연동원장','DB_분류집계','DB_대시보드']
        plan['books'].append({'id':b['id'],'input':b['path'],'output':str(destination/(b['id']+'_ORS_자동반영.xlsx')),'calculate':calculate})
    write_json(destination/'refresh-plan.json',plan)
    if not apply:
        print(json.dumps({'preview':str(destination),'summary':plan['summary']},ensure_ascii=False));return destination
    shell=cfg.get('powershell') or shutil.which('pwsh')
    if not shell:raise RuntimeError('PowerShell 7을 찾을 수 없습니다.')
    subprocess.run([shell,'-NoProfile','-File',str(ROOT/'scripts/ors_refresh_native.ps1'),'-PlanPath',str(destination/'refresh-plan.json')],check=True)
    allchanges=[];final_books={}
    for b,job in zip(books,plan['books']):
        assert sha(b['path'])==input_hashes[b['id']],'Source workbook changed during refresh'
        restore_calculation(b['path'],job['output'])
        after=update_catalog_book(data,b['id'],job['output'],b['source_id'])
        final_books[b['id']]=after
        changes=verify(before[b['id']],after,[w for w in plan['writes'] if w['book']==b['id']],set(job['calculate']))
        allchanges.extend({'book':b['id'],**c} for c in changes)
        with ZipFile(job['output']) as z:
            assert len([n for n in z.namelist() if re.fullmatch(r'xl/slicerCaches/slicerCache\d+\.xml',n)])==10
            assert len([n for n in z.namelist() if re.fullmatch(r'xl/charts/chart\d+\.xml',n)])==6
            assert not any(n.startswith('xl/externalLinks/') for n in z.namelist())
        b['path']=job['output']
        imported_dates=[w['source_date'] for w in plan['writes'] if w['book']==b['id']]
        if imported_dates:b['baseline_date']=max([b['baseline_date']]+imported_dates)
    # Refresh linked application text only; original held type decisions remain held.
    ors=next((s for s in data['sheets'] if s['name']=='ORS 방법론'),None)
    if ors:
        rows={r['row']:{c['col']:c.get('value') for c in r['cells']} for r in ors['rows']}
        for a in data['applications']:
            if a['source_row'] in rows:a['official_status_text']=rows[a['source_row']].get(27)
    data['catalog_version']='local-materials-1.1';data['captured_on']=datetime.now(SEOUL).date().isoformat()
    data['refresh']={k:plan[k] for k in ['schema_version','run_at','files','pending','summary']}
    data['refresh']['mode']='local_files';data['refresh']['baseline_dates']={b['id']:b['baseline_date'] for b in books}
    data['notice']='ORS 파일 갱신 결과. 오래된 자료·신규 연결·충돌은 보류하며 수동 업무 열과 기존 보류는 유지합니다.'
    data['summary'].update(material_summary(data))
    # Full snapshots, not just headline counts, are compared in both engines.
    rows=management_rows(data);cases=[]
    field_cols={'unit':2,'region':3,'year':9,'month':10,'type':11,'sector':12,'raw_status':13,'stage':14,'owner':15,'hold':16,'date_quality':17}
    for b in books:
        native={}
        for a,c in final_books[b['id']]['DB_연동원장'].items():
            n=int(re.search(r'\d+',a)[0])
            if n>=25:native.setdefault(n,{})[c['col']]=c['value']
        byid={r.get(1):r for r in native.values() if r.get(1)}
        expected_rows=[r for r in rows if r['book']==b['id']]
        assert set(byid)=={r['id'] for r in expected_rows},'Excel/source row linkage differs'
        for r in expected_rows:
            for field,col in field_cols.items():
                assert str(byid[r['id']].get(col) or '미확보').strip()==str(r.get(field) or '미확보').strip(),f'Excel/JSON classification differs: {r["id"]} / {field}'
    for book in ['management','disclosure']:
        for filters in [{},{'year':['2022']},{'year':['미확보']},{'region':['국내']},{'region':['국외']},{'hold':['유형 불일치·보류']}]:cases.append({'book':book,'filters':filters,'query':''})
    expected={'rows':rows,'snapshots':[management_summary(rows,c['book'],c['filters'],c['query']) for c in cases]}
    actual=json.loads(subprocess.run([cfg['node'],str(ROOT/'scripts/management_snapshot.mjs')],input=json.dumps({'data':data,'cases':cases},ensure_ascii=False),capture_output=True,text=True,encoding='utf-8',check=True).stdout)
    assert expected==actual,'Python/JS parity failed'
    import jsonschema
    jsonschema.validate(data,json.loads((ROOT/'schemas/local_materials.schema.json').read_text(encoding='utf-8')))
    write_json(destination/'value-changes.json',allchanges)
    package(data,ROOT/'web/dist',destination)
    write_json(destination/'verification.json',{'python_js_conditions':len(cases),'excel_classification_fields':len(field_cols),'source_hashes_preserved':True,'formulas_preserved':True,'new_formula_errors':0,'charts_per_book':6,'slicers_per_book':10,'changed_cached_or_source_cells':len(allchanges)})
    state={'catalog':str(destination/'dashboard-data.json'),'books':books,'dashboard':str(destination/'dashboard.html'),'run_at':stamp}
    if source_manifest(collect_sources(cfg['sources']))!=observed['manifest']['sources']:
        raise ValueError('검증 중 수신 파일이 변경됐습니다. 기존 최근 결과를 유지합니다.')
    completed=observe(cfg,books,state['catalog'],state['dashboard'],sources)
    tmp=store/'current.next.json';write_json(tmp,state);tmp.replace(state_path)
    (store/'최근결과.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><title>최근 ORS 갱신 결과</title><h1>최근 검증 완료 결과</h1><p>'+html.escape(stamp)+'</p><p><a href="'+html.escape(destination.name+'/dashboard.html',quote=True)+'">대시보드 열기</a></p>'+''.join('<p><a href="'+html.escape(destination.name+'/'+Path(b['path']).name,quote=True)+'">'+html.escape(b['id'])+' Excel 열기</a></p>' for b in books)+'</html>',encoding='utf-8')
    record_completed(store,completed,output_paths(state,store),stamp)
    print(json.dumps({'completed':str(destination),'summary':plan['summary'],'parity_cases':len(cases)},ensure_ascii=False),flush=True)
    return destination

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--config',type=Path,required=True);parser.add_argument('--apply',action='store_true')
    parser.add_argument('--register-current',action='store_true',help='Register a verified existing result without regenerating it')
    parser.add_argument('--retry-reviewed',action='store_true',help='Retry once after reviewing a previous failure')
    args=parser.parse_args()
    if args.apply and args.register_current:parser.error('--apply와 --register-current는 함께 사용할 수 없습니다.')
    if args.retry_reviewed and not args.apply:parser.error('--retry-reviewed는 --apply와 함께 사용합니다.')
    if (args.apply or args.register_current) and os.name=='nt':
        import msvcrt
        settings=json.loads(args.config.read_text(encoding='utf-8-sig'));lockpath=Path(settings['output_dir'])/'.refresh.lock';lockpath.parent.mkdir(parents=True,exist_ok=True)
        with lockpath.open('a+b') as lock:
            if lock.tell()==0:lock.write(b'0');lock.flush()
            lock.seek(0)
            try:msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
            except OSError:raise RuntimeError('다른 ORS 갱신이 실행 중입니다. 완료 후 다시 실행하세요.')
            try:run(args.config,args.apply,args.retry_reviewed,args.register_current)
            finally:lock.seek(0);msvcrt.locking(lock.fileno(),msvcrt.LK_UNLCK,1)
    else:run(args.config,args.apply,args.retry_reviewed,args.register_current)
