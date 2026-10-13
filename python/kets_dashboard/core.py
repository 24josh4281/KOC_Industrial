"""Validated, deterministic day-level snapshots. No network or database side effects."""
from __future__ import annotations
import copy
import json
from collections import Counter
from datetime import date
from pathlib import Path
from statistics import median
from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[2]
REVIEWING = {'submitted', 'review', 'consultation', 'committee'}
TERMINAL = {'registered', 'rejected', 'withdrawn'}
COVERAGE_KEYS = ('registered', 'active', 'unknown_status', 'unknown_year', 'new_year', 'revisions_year')
REVIEW_KEYS = ('reviewing', 'waiting', 'pending_registration', 'overdue', 'completed', 'median_completed_days', 'unknown_stage')

class ValidationError(ValueError):
    pass

def load(path: str | Path) -> dict:
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))

def validate(data: dict) -> list[str]:
    """Reject structural/identity/reference errors; return non-fatal data-quality warnings."""
    schema = load(ROOT / 'schemas/dataset.schema.json')
    errors = sorted(Draft202012Validator(schema, format_checker=FormatChecker()).iter_errors(data), key=lambda x: str(x.path))
    if errors:
        raise ValidationError('\n'.join(f'{list(e.path)}: {e.message}' for e in errors[:20]))
    buckets = ('methodologies', 'versions', 'applications', 'review_events', 'status_events', 'sources')
    ids = {}
    for bucket in buckets:
        vals = [x['id'] for x in data[bucket]]
        if len(vals) != len(set(vals)):
            raise ValidationError(f'{bucket}: duplicate id')
        ids[bucket] = set(vals)
        for row in data[bucket]:
            if any(isinstance(v, str) and '\x00' in v for v in row.values()):
                raise ValidationError('NUL characters forbidden')
    codes = [m['code'] for m in data['methodologies']]
    if len(codes) != len(set(codes)):
        raise ValidationError('methodologies: duplicate official code; review aliases before merging')
    for bucket in buckets[:-1]:
        for row in data[bucket]:
            if row['source_id'] not in ids['sources']:
                raise ValidationError(f'{bucket}/{row["id"]}: unknown source_id')
            mid = row.get('methodology_id')
            if mid and mid not in ids['methodologies']:
                raise ValidationError(f'{bucket}/{row["id"]}: unknown methodology_id')
    for row in data['applications']:
        if row['type'] == 'revision' and row['methodology_id'] is None:
            raise ValidationError('revision application requires methodology_id')
        if row['recorded_on'] < row['submitted_on']:
            raise ValidationError('application recorded before submission')
    vv = [(r['methodology_id'], r['version']) for r in data['versions']]
    if len(vv) != len(set(vv)):
        raise ValidationError('duplicate methodology/version pair')
    for bucket in ('review_events', 'status_events'):
        seq = [r['sequence'] for r in data[bucket]]
        if len(seq) != len(set(seq)):
            raise ValidationError(f'{bucket}: sequence must be globally unique within this table')
        for row in data[bucket]:
            if row['recorded_on'] < row['occurred_on']:
                raise ValidationError('event recorded before occurrence')
    apps = {a['id']: a for a in data['applications']}
    for event in data['review_events']:
        if event['application_id'] not in apps:
            raise ValidationError('review event references unknown application')
        if event['occurred_on'] < apps[event['application_id']]['submitted_on']:
            raise ValidationError('review event before submission')
        if event['stage'] in TERMINAL and event['waiting']:
            raise ValidationError('terminal application cannot be awaiting response')
    for aid in apps:
        prev = None
        for event in sorted((e for e in data['review_events'] if e['application_id'] == aid), key=event_key):
            if prev is None and event['action'] != 'transition':
                raise ValidationError('first event must be a transition')
            if prev and event['stage'] != prev['stage'] and event['action'] != 'transition':
                raise ValidationError('stage change requires transition action')
            prev = event
    meta = data['metadata']
    if meta['mode'] == 'production':
        if any(r['kind'] == 'demo' for r in data['sources']) or 'demo' in meta['coverage'].values():
            raise ValidationError('demo data/coverage cannot be promoted to production')
        if any(r['id'].startswith('DEMO-') for b in buckets for r in data[b]):
            raise ValidationError('demo IDs forbidden in production')
    if meta['coverage']['registrations'] == 'missing' and data['methodologies']:
        raise ValidationError('missing registration coverage conflicts with nonempty methodology table')
    if meta['coverage']['reviews'] == 'missing' and data['applications']:
        raise ValidationError('missing review coverage conflicts with nonempty application table')
    warnings = []
    for m in data['methodologies']:
        if m['scope'] == 'unclassified': warnings.append(f'{m["id"]}: 산업부문 분류 확인 필요')
        if not m['first_registered_on']: warnings.append(f'{m["id"]}: 최초 등록연도 미확인')
        if not m['first_registered_on'] and not m['registration_confirmed_on']:
            warnings.append(f'{m["id"]}: 등록 근거일 미확인; 등록 KPI 제외')
    for v in data['versions']:
        if not v['registered_on']: warnings.append(f'{v["id"]}: 버전 등록일 미확인; 연도별 신규/개정 제외')
    for a in data['applications']:
        if not any(e['application_id'] == a['id'] for e in data['review_events']):
            warnings.append(f'{a["id"]}: 검토 이력 미확보')
    return warnings

def event_key(e: dict) -> tuple:
    return e['occurred_on'], e['sequence']

def scope_match(value: str, scope: str) -> bool:
    if scope == 'all': return True
    if scope == 'industry_transition': return value in ('industry', 'transition')
    return value == scope

def snapshot(data: dict, *, as_of: str | None = None, knowledge_as_of: str | None = None,
             scope: str = 'industry', year: int | None = None, threshold: int = 45, start_year: int = 2015) -> dict:
    warnings = validate(data)
    end = as_of or data['metadata']['as_of']
    known = knowledge_as_of or data['metadata']['knowledge_as_of']
    date.fromisoformat(end); date.fromisoformat(known)
    if scope not in {'all', 'industry', 'transition', 'industry_transition', 'other', 'unclassified'}:
        raise ValidationError('unknown scope')
    year = int(year if year is not None else end[:4])
    if threshold < 0: raise ValidationError('threshold must be nonnegative')
    def available(r): return r['occurred_on'] <= end and r['recorded_on'] <= known
    methods = []
    for m in data['methodologies']:
        if not scope_match(m['scope'], scope) or m['recorded_on'] > known: continue
        rd = m['first_registered_on'] or m['registration_confirmed_on']
        included = bool(rd and rd <= end)
        history = sorted((s for s in data['status_events'] if s['methodology_id'] == m['id'] and available(s)), key=event_key)
        status = history[-1]['status'] if history else 'unknown'
        methods.append({**m, 'registered': included, 'applicability': status, 'registration_year': int(m['first_registered_on'][:4]) if m['first_registered_on'] else None})
    eligible_ids = {m['id'] for m in methods if m['registered']}
    versions = [v for v in data['versions'] if v['methodology_id'] in eligible_ids and v['recorded_on'] <= known]
    app_rows = []
    for a in data['applications']:
        if a['recorded_on'] > known or a['submitted_on'] > end or not scope_match(a['scope'], scope): continue
        ev = sorted((e for e in data['review_events'] if e['application_id'] == a['id'] and available(e)), key=event_key)
        latest = ev[-1] if ev else None
        stage = latest['stage'] if latest else 'unknown'
        entered = None; previous = None
        for e in ev:
            if e['stage'] != previous: entered = e['occurred_on']
            previous = e['stage']
        age = (date.fromisoformat(end) - date.fromisoformat(entered)).days if entered else None
        complete_days = (date.fromisoformat(entered) - date.fromisoformat(a['submitted_on'])).days if stage in TERMINAL and entered else None
        app_rows.append({**a, 'stage': stage, 'stage_started_on': entered, 'stage_age_days': age,
            'waiting': latest['waiting'] if latest else False, 'next_action': latest['next_action'] if latest else '',
            'due_on': latest['due_on'] if latest else None, 'completed_days': complete_days,
            'is_reviewing': stage in REVIEWING, 'is_overdue': bool(stage in REVIEWING and age is not None and age > threshold),
            'latest_event_id': latest['id'] if latest else None})
    reg = [m for m in methods if m['registered']]
    completed = [a['completed_days'] for a in app_rows if a['completed_days'] is not None]
    kpi = {'registered':len(reg),'active':sum(m['applicability']=='active' for m in reg),
      'unknown_status':sum(m['applicability']=='unknown' for m in reg),'unknown_year':sum(m['registration_year'] is None for m in reg),
      'new_year':sum(m['registration_year']==year for m in reg),
      'revisions_year':sum(v['change_type']=='revision' and bool(v['registered_on']) and v['registered_on']<=end and int(v['registered_on'][:4])==year for v in versions),
      'reviewing':sum(a['is_reviewing'] for a in app_rows),'waiting':sum(a['is_reviewing'] and a['waiting'] for a in app_rows),
      'pending_registration':sum(a['stage']=='approved' for a in app_rows),'overdue':sum(a['is_overdue'] for a in app_rows),
      'completed':len(completed),'median_completed_days':median(completed) if completed else None,
      'unknown_stage':sum(a['stage']=='unknown' for a in app_rows)}
    annual = []
    for y in range(start_year, int(end[:4])+1):
        cutoff = min(f'{y}-12-31', end)
        annual.append({'year':y,'new':sum(bool(m['first_registered_on']) and m['first_registered_on']<=cutoff and m['registration_year']==y for m in reg),
            'cumulative_known_year':sum(bool(m['first_registered_on']) and m['first_registered_on']<=cutoff for m in reg),
            'revisions':sum(v['change_type']=='revision' and bool(v['registered_on']) and v['registered_on']<=cutoff and int(v['registered_on'][:4])==y for v in versions)})
    coverage = data['metadata']['coverage']
    if coverage['registrations']=='missing':
        for k in COVERAGE_KEYS:kpi[k]=None
        annual=[]
    if coverage['reviews']=='missing':
        for k in REVIEW_KEYS:kpi[k]=None
    return {'metadata':{**data['metadata'],'as_of':end,'knowledge_as_of':known,'scope':scope,'selected_year':year,'internal_threshold_days':threshold},
      'kpis':kpi,'annual':annual,'stage_counts':dict(Counter(a['stage'] for a in app_rows)),
      'technology_counts':dict(Counter(m['technology'] for m in reg)),
      'methodology_rows':methods,'application_rows':app_rows,'quality_warnings':warnings}

def public_dataset(data: dict) -> dict:
    """Allowlist export. Real review data is NEVER exported by this function."""
    validate(data)
    out = copy.deepcopy(data)
    if data['metadata']['mode']=='demo': return out
    src = {s['id'] for s in data['sources'] if s['access']=='public' and s['kind']=='official'}
    out['methodologies'] = [m for m in out['methodologies'] if m['public_allowed'] and m['source_id'] in src]
    mids = {m['id'] for m in out['methodologies']}
    for bucket in ('versions','status_events'):
        out[bucket] = [r for r in out[bucket] if r['methodology_id'] in mids and r['source_id'] in src]
    out['applications']=[];out['review_events']=[]
    used={r['source_id'] for b in ('methodologies','versions','status_events') for r in out[b]}
    out['sources']=[s for s in out['sources'] if s['id'] in used]
    out['metadata']['coverage']={'registrations':'partial' if mids else 'missing','reviews':'missing','scope_note':'공개승인·공식출처 확인 자료만 포함. 검토자료는 비공개·미제공.'}
    out['metadata']['dataset_id']='PUBLIC-SNAPSHOT-'+data['metadata']['as_of']
    validate(out)
    return out
