"""Public catalog scenarios; effective dates do not stand in for registration dates."""
from datetime import date
from collections import Counter
from math import floor
from statistics import median

def percent(n,d):
    return floor(n/d*1000+0.5)/10 if d else None

def public_insights(data, **options):
    o=dict(as_of=data['captured_on'],year=int(data['captured_on'][:4]),sector='all',registration='all',revision='all',query='',recent_days=365,watch_days=1095)
    o.update(options)
    asof=date.fromisoformat(o['as_of'])
    if o['as_of']>data['captured_on'] or type(o['year']) is not int or not 1900<=o['year']<=asof.year or o['revision'] not in ('all','revised','unrevised') or any(type(o[k]) is not int or not 1<=o[k]<=36500 for k in ('recent_days','watch_days')):
        raise ValueError('Invalid scenario')
    rows=[]
    for m in data['methods']:
        vs=sorted((v for v in data['versions'] if v['code']==m['code'] and v['effective_from']<=o['as_of']),key=lambda v:(v['effective_from'],v['id']))
        if not vs: continue
        latest=vs[-1];first=next((v for v in vs if v['change_type']=='new'),None)
        revisions=sum(v['change_type']=='revision' for v in vs)
        if o['sector']!='all' and m['sector']!=o['sector'] or o['registration']!='all' and m['registration_type']!=o['registration'] or o['revision']=='revised' and not revisions or o['revision']=='unrevised' and revisions or o['query'].strip().lower() not in f"{m['code']} {m['name']} {m['sector']}".lower(): continue
        rows.append(dict(m,latest_version=latest['version'],latest_effective=latest['effective_from'],first_effective=first['effective_from'] if first else None,version_count=len(vs),revision_count=revisions,age_days=(asof-date.fromisoformat(latest['effective_from'])).days))
    rows.sort(key=lambda r:r['code']);codes={r['code'] for r in rows}
    versions=sorted((v for v in data['versions'] if v['code'] in codes and v['effective_from']<=o['as_of']),key=lambda v:v['id'])
    earliest=min((int(v['effective_from'][:4]) for v in versions),default=o['year'])
    annual=[dict(year=y,new=sum(v['change_type']=='new' and int(v['effective_from'][:4])==y for v in versions),revisions=sum(v['change_type']=='revision' and int(v['effective_from'][:4])==y for v in versions),cumulative_methods=sum(r['first_effective'] is not None and int(r['first_effective'][:4])<=y for r in rows)) for y in range(earliest,asof.year+1)]
    def group(key):
        return sorted((dict(name=k,count=n,share=percent(n,len(rows))) for k,n in Counter(r[key] for r in rows).items()),key=lambda r:(-r['count'],r['name']))
    end=min(f"{o['year']}-12-31",o['as_of'])
    try: previous_end=date.fromisoformat(end).replace(year=o['year']-1).isoformat()
    except ValueError: previous_end=f"{o['year']-1}-02-28"
    selected=[v for v in versions if f"{o['year']}-01-01"<=v['effective_from']<=end]
    previous=[v for v in versions if f"{o['year']-1}-01-01"<=v['effective_from']<=previous_end]
    ages=[r['age_days'] for r in rows];sectors=group('sector');revised=sum(r['revision_count']>0 for r in rows)
    recent=sorted((v for v in versions if (asof-date.fromisoformat(v['effective_from'])).days<o['recent_days']),key=lambda v:(-date.fromisoformat(v['effective_from']).toordinal(),v['id']))
    return dict(options=o,metrics=dict(methods=len(rows),versions=len(versions),revised_methods=revised,revision_share=percent(revised,len(rows)),selected_new=sum(v['change_type']=='new' for v in selected),selected_revisions=sum(v['change_type']=='revision' for v in selected),recent_versions=len(recent),watch_methods=sum(a>o['watch_days'] for a in ages),median_age=median(ages) if ages else None,top3_share=percent(sum(r['count'] for r in sectors[:3]),len(rows)),applications=None,reviewing=None,overdue=None),comparison=dict(end=end,previous_end=previous_end,current=len(selected),previous=len(previous),delta=len(selected)-len(previous),percent=percent(len(selected)-len(previous),len(previous))),annual=annual,sectors=sectors,registration=group('registration_type'),version_distribution=group('latest_version'),ages=[dict(name='1년 이내',count=sum(a<=365 for a in ages)),dict(name='1~3년',count=sum(365<a<=1095 for a in ages)),dict(name='3년 초과',count=sum(a>1095 for a in ages))],rows=rows,versions=versions,recent=recent)
