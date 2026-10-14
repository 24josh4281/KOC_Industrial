import json
from pathlib import Path
import subprocess
import unittest
from kets_dashboard.formula_health import broken_reference, formula_quality

class FormulaHealthTests(unittest.TestCase):
    def test_cached_zero_does_not_hide_broken_reference(self):
        data={'sheets':[{'rows':[{'cells':[{'value':0,'formula':'=SUMIF(A1:A3,#REF!,B1:B3)'}]}]}]}
        self.assertEqual(formula_quality(data),{'saved_errors':0,'broken_references':1,'unavailable_results':0})

    def test_literals_and_real_zero_are_not_missing(self):
        self.assertFalse(broken_reference('="#REF!"'))
        self.assertTrue(broken_reference('=IF(A1="a""#REF!",0,#REF!)'))
        data={'sheets':[{'rows':[{'cells':[{'value':0},{'value':None},{'value':'기준 미확인'}]}]}]}
        self.assertEqual(formula_quality(data)['unavailable_results'],1)

    def test_python_web_quality_parity(self):
        data={'sheets':[{'rows':[{'cells':[{'value':0,'formula':'=SUM(#REF!)'},
              {'value':'기준 미확인','formula':'="기준 미확인"'},
              {'value':'#REF!','error':True},{'value':'#REF!','formula':'="#REF!"'}]}]}]}
        script=Path(__file__).resolve().parents[1]/'scripts/formula_quality.mjs'
        result=subprocess.run(['node',str(script)],input=json.dumps(data,ensure_ascii=False),capture_output=True,text=True,encoding='utf-8',check=True)
        self.assertEqual(json.loads(result.stdout),formula_quality(data))
