"""Calculation quality indicators derived from existing source cells."""
import re

UNAVAILABLE = '기준 미확인'

def broken_reference(formula):
    # A literal label such as ="#REF!" is not a broken reference.
    code = re.sub(r'"(?:[^"]|"")*"', '', formula or '')
    return '#REF!' in code.upper()

def formula_quality(data):
    cells = [c for s in data.get('sheets', []) for r in s.get('rows', []) for c in r['cells']]
    return {
        'saved_errors': sum(bool(c.get('error')) for c in cells),
        'broken_references': sum(broken_reference(c.get('formula')) for c in cells),
        'unavailable_results': sum(c.get('value') == UNAVAILABLE for c in cells),
    }
