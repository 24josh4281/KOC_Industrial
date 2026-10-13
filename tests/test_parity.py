import copy
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from check_parity import compare
from kets_dashboard.core import load


class LiveParityTests(unittest.TestCase):
    def test_demo_all_conditions(self):
        self.assertEqual(compare(load(ROOT / 'data/demo/dataset.json'))['comparisons'], 8)

    def test_missing_partial_and_confirmed_zero(self):
        for registration in ('missing', 'partial', 'complete'):
            for review in ('missing', 'partial', 'complete'):
                with self.subTest(registrations=registration, reviews=review):
                    data = load(ROOT / 'data/templates/empty.dataset.json')
                    data['metadata']['coverage'].update(registrations=registration, reviews=review)
                    self.assertTrue(compare(data)['passed'])

    def test_same_day_and_unknown_history(self):
        data = load(ROOT / 'data/demo/dataset.json')
        event = copy.deepcopy(data['review_events'][0])
        event.update(id='DEMO-LAST', sequence=99999, stage='review', action='transition')
        data['review_events'].append(event)
        data['applications'].append({**data['applications'][0], 'id': 'DEMO-NO-HISTORY'})
        self.assertTrue(compare(data)['passed'])
