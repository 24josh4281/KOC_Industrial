"""Read-only classified source rows, not canonical applications or registrations."""
import json,re
from pathlib import Path
from datetime import date
from collections import Counter
CONFIG=json.loads((Path(__file__).resolve().parents[2]/'config/management_views.json').read_text(encoding='utf-8'))
FIELDS=['unit','region','year','month','raw_status','stage','owner','sector','type','hold','date_quality']
def text(v):
    if v is None or v=='': return None
    return str(v).strip() or None
def date_parts(value):
    value=text(value)
    if not value:return None,None,'신청일 미확보'
    m=re.fullmatch(r'(\d{4})-(\d{2})(?:-(\d{2})(?:T.*| .*)?)?',value)
    if not m:return None,None,'날짜 형식 확인'
    try: date(int(m[1]),int(m[2]),int(m[3] or 1))
    except ValueError:return None,None,'날짜 형식 확인'
    return m[1],m[2],('월까지만 확인' if m[3] is None else '일자 확인')
def management_rows(data):
    sheets={s['name']:s for s in data['sheets']}
    apps={a['internal_source_row']:a for a in data.get('applications',[])}
    ors={r['row']:{c['col']:c for c in r['cells']} for r in sheets.get('ORS 방법론',{}).get('rows',[])}
    out=[]
    for spec in CONFIG['sheets']:
        sheet=sheets.get(spec['name'])
        if not sheet or sheet['header_row'] is None:continue
        for row in sheet['rows']:
            if row['row']<=sheet['header_row']:continue
            cells={c['col']:c for c in row['cells']}
            def get(field):
                c=cells.get(spec.get(field),{})
                return '원본 오류' if c.get('error') else text(c.get('value'))
            title=get('title')
            if not title or title=='0':continue
            r=dict(id=f"{spec['name']}:{row['row']}",book=spec['book'],source_sheet=spec['name'],source_row=row['row'],unit=spec['unit'],region=spec['region'],title=title,source_key=get('key'),apply_date=get('date'),type=get('type'),sector=get('sector'),raw_status=get('status'),stage=get('stage'),owner=get('owner'),hold='해당 없음',ors_row=None)
            if spec.get('method_lookup'):
                a=apps.get(row['row']);r['hold']='연결 미확정'
                if a:
                    r['ors_row']=a['source_row'];c=ors.get(a['source_row'],{}).get(19,{})
                    r['sector']='원본 오류' if c.get('error') else text(c.get('value'))
                    origin=ors.get(a['source_row'],{}).get(7,{})
                    if a['type_conflict']:r['hold']='유형 불일치·보류'
                    elif origin.get('error') or r['type']=='원본 오류':r['hold']='원본 오류'
                    elif not text(origin.get('value')) or not r['type']:r['hold']='연결 미확정'
                    else:r['hold']='유형 일치' if text(origin.get('value'))==r['type'] else '유형 불일치·보류'
            r['year'],r['month'],r['date_quality']=date_parts(r['apply_date']);out.append(r)
    return out
def management_summary(rows,book='management',filters=None,query=''):
    filters=filters or {};q=query.strip().lower()
    selected=[r for r in rows if r['book']==book and all(not v or (r.get(k) or '미확보') in v for k,v in filters.items()) and (not q or any(q in str(r.get(k) or '').lower() for k in ['title','source_key','owner','source_sheet']))]
    distributions={k:[{'name':name,'count':n} for name,n in sorted(Counter(r.get(k) or '미확보' for r in selected).items(),key=lambda x:(-x[1],x[0]))] for k in FIELDS}
    return {'row_count':len(selected),'ids':[r['id'] for r in selected],'distributions':distributions,'missing_dates':sum(r['year'] is None for r in selected),'type_holds':sum(r['hold']=='유형 불일치·보류' for r in selected)}
