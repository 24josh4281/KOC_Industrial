"""Source-row review counts, explicitly separate from official business counts."""
from collections import Counter


def source_coverage(data):
    """Count recorded source cells by file without treating rows as business cases."""
    sheets_by_file = {}
    for sheet in data.get('sheets', []):
        sheets_by_file.setdefault(sheet.get('source_id'), []).append(sheet)
    files = []
    for source in data.get('files', []):
        sheets = sheets_by_file.get(source['id'], [])
        rows = cells = formulas = saved_errors = unavailable = 0
        for sheet in sheets:
            rows += len(sheet.get('rows', []))
            for row in sheet.get('rows', []):
                for cell in row['cells']:
                    cells += 1
                    formulas += bool(cell.get('formula'))
                    saved_errors += bool(cell.get('error'))
                    unavailable += cell.get('value') == '기준 미확인'
        files.append({
            'id': source['id'], 'filename': source['filename'], 'format': source['format'],
            'sheets': len(sheets), 'rows': rows,
            'cells': cells, 'formulas': formulas,
            'saved_errors': saved_errors, 'unavailable': unavailable,
        })
    return files

def material_summary(data):
    sheets=data.get('sheets',[])
    apps=data.get('applications',[])
    return dict(files=len(data.get('files',[])),sheets=len(sheets),
        nonempty_rows=sum(len(s.get('rows',[])) for s in sheets),
        cached_error_cells=sum(bool(c.get('error')) for s in sheets for r in s.get('rows',[]) for c in r['cells']),
        methodology_applications=len(apps),history_lines=len(data.get('history',[])),
        type_conflicts=sum(bool(a.get('type_conflict')) for a in apps),
        status_counts=dict(Counter(a.get('official_status_text') or '미확인' for a in apps)))
