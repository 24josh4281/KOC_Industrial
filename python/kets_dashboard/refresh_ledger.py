"""Local refresh reuse decisions. Hash files without recalculating workbooks."""
from datetime import datetime
from pathlib import Path
from zipfile import ZipFile,BadZipFile
import hashlib
import json
from .ors_refresh import dated_filename,SEOUL

VERSION = 'ors-ledger-1.0'

def file_hash(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()

def collect_sources(configured):
    sources = set()
    for item in configured:
        path = Path(item)
        candidates = path.iterdir() if path.is_dir() else [path] if path.is_file() else []
        for candidate in candidates:
            if candidate.is_file() and not candidate.name.startswith('~$') and candidate.suffix.lower() in ('.xls', '.xlsx', '.zip'):
                sources.add(candidate.resolve())
    return sorted(sources, key=str)

def source_manifest(paths, day=None):
    day = day or datetime.now(SEOUL).date().isoformat()
    records = []
    for path in sorted(map(Path, paths), key=str):
        names = [path.name]
        if path.suffix.lower() == '.zip':
            try:
                with ZipFile(path) as archive:
                    names = sorted(item.filename for item in archive.infolist()
                                   if not item.is_dir() and item.filename.lower().endswith(('.xls', '.xlsx')))
            except BadZipFile:
                names = []
        gates = []
        for name in names:
            date = dated_filename(name)
            gates.append({'name': name, 'date': date,
                          'gate': 'unknown' if date is None else 'future' if date > day else 'eligible'})
        if not names and path.suffix.lower() == '.zip':
            gates.append({'name': path.name, 'date': None, 'gate': 'no_readable_excel_entries'})
        records.append({'path': str(path.resolve()), 'sha256': file_hash(path), 'date_gates': gates})
    return records

def fingerprint(sources, books, catalog, implementations, configuration, day=None):
    manifest = {
        'schema_version': VERSION,
        'sources': source_manifest(sources, day),
        'books': [{**{k: b[k] for k in ('id', 'source_id', 'baseline_date')},
                   'path': str(Path(b['path']).resolve()), 'sha256': file_hash(b['path'])} for b in books],
        'catalog': {'path': str(Path(catalog).resolve()), 'sha256': file_hash(catalog)},
        'implementations': [{'path': str(Path(p).resolve()), 'sha256': file_hash(p)}
                            for p in sorted(map(Path, implementations), key=str)],
        'configuration': configuration,
    }
    raw = json.dumps(manifest, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')
    return {'signature': hashlib.sha256(raw).hexdigest(), 'manifest': manifest}

def output_manifest(paths):
    return [{'path': str(Path(p).resolve()), 'sha256': file_hash(p)} for p in sorted(map(Path, paths), key=str)]

def load_ledger(store):
    path = Path(store) / 'refresh-ledger.json'
    if not path.exists():
        return {'schema_version': VERSION, 'completed': None, 'failed': None}
    ledger = json.loads(path.read_text(encoding='utf-8'))
    if ledger.get('schema_version') != VERSION:
        raise ValueError('갱신 실행 장부 판본을 확인하세요.')
    return ledger

def reusable(ledger, observed):
    completed = ledger.get('completed')
    if not completed or completed.get('signature') != observed['signature']:
        return False
    outputs = completed.get('outputs', [])
    if not outputs:
        return False
    return all(Path(o['path']).is_file() and file_hash(o['path']) == o['sha256'] for o in outputs)

def save_ledger(store, ledger):
    path = Path(store) / 'refresh-ledger.json'
    temp = path.with_suffix('.next.json')
    temp.write_text(json.dumps(ledger, ensure_ascii=False, indent=2), encoding='utf-8')
    temp.replace(path)

def record_completed(store, observed, outputs, run_at, registration=False):
    ledger = load_ledger(store)
    ledger['completed'] = {**observed, 'outputs': output_manifest(outputs), 'run_at': run_at,
                           'registered_existing': registration}
    ledger['failed'] = None
    save_ledger(store, ledger)

def record_failed(store, observed, error):
    ledger = load_ledger(store)
    ledger['failed'] = {'signature': observed['signature'], 'run_at': datetime.now(SEOUL).isoformat(timespec='seconds'),
                        'error_type': type(error).__name__, 'message': str(error)}
    save_ledger(store, ledger)
