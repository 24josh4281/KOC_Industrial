"""Compute both engines now, and compare every snapshot field (no stale fixtures)."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'python'))
from kets_dashboard.core import load, snapshot

OPTIONS = [{}, {'scope': 'all'}, {'scope': 'industry_transition'},
           {'as_of': '2026-09-01'}, {'knowledge_as_of': '2026-09-01'},
           {'scope': 'unclassified'}, {'scope': 'transition', 'year': 2025},
           {'threshold': 0, 'start_year': 2020}]


def compare(data, options=None):
    options = OPTIONS if options is None else options
    node = shutil.which('node')
    if not node:
        raise RuntimeError('Node is required for live Python/JS parity verification')
    expected = [snapshot(data, **opts) for opts in options]
    result = subprocess.run([node, str(ROOT / 'scripts/snapshot.mjs')],
                            input=json.dumps({'dataset': data, 'options': options}, ensure_ascii=False),
                            text=True, encoding='utf-8', capture_output=True, check=True)
    actual = json.loads(result.stdout)
    if expected != actual:
        mismatches = [i for i, (a, b) in enumerate(zip(expected, actual)) if a != b]
        raise AssertionError(f'Python/JS snapshots differ for options {mismatches}')
    return {'passed': True, 'comparisons': len(options), 'full_snapshot': True,
            'fresh_python_and_javascript': True}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input')
    parser.add_argument('--out')
    args = parser.parse_args()
    result = compare(load(args.input))
    output = json.dumps(result, indent=2) + '\n'
    if args.out:
        path = Path(args.out)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(output, encoding='utf-8')
    print(output)
