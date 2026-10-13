"""Source-row review counts, explicitly separate from official business counts."""
from collections import Counter

def material_summary(data):
    sheets=data.get('sheets',[])
    apps=data.get('applications',[])
    return dict(files=len(data.get('files',[])),sheets=len(sheets),
        nonempty_rows=sum(len(s.get('rows',[])) for s in sheets),
        cached_error_cells=sum(bool(c.get('error')) for s in sheets for r in s.get('rows',[]) for c in r['cells']),
        methodology_applications=len(apps),history_lines=len(data.get('history',[])),
        type_conflicts=sum(bool(a.get('type_conflict')) for a in apps),
        status_counts=dict(Counter(a.get('official_status_text') or '미확인' for a in apps)))
