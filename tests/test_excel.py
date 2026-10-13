"""Read-only OOXML checks; no spreadsheet-library dependency required."""
import json,sys,unittest,zipfile,posixpath,tempfile,copy
from pathlib import Path
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'));sys.path.insert(0,str(ROOT/'python'))
from manage import read_xlsx
from kets_dashboard.core import load,snapshot,ValidationError
class ExcelTests(unittest.TestCase):
 def test_dataset_roundtrip(self):
  self.assertEqual(read_xlsx(ROOT/'excel/KETS_Methodology_Dashboard.xlsx'),load(ROOT/'data/demo/dataset.json'))
 def test_cached_kpis_and_formula_errors(self):
  ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
  with zipfile.ZipFile(ROOT/'excel/KETS_Methodology_Dashboard.xlsx') as z:
   root=ET.fromstring(z.read('xl/workbook.xml'));rels={r.attrib['Id']:r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
   rid='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
   ss={s.attrib['name']:rels[s.attrib[rid]] for s in root.findall('m:sheets/m:sheet',ns)}
   target=ss['04_검토통계'];target=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
   cells={c.attrib['r']:c for c in ET.fromstring(z.read(target)).findall('.//m:c',ns)}
   expected=snapshot(load(ROOT/'data/demo/dataset.json'))['kpis'];mapping=load(ROOT/'config/excel_kpi_cells.json')
   for key,ref in mapping.items():
    c=cells[ref.split('!')[-1]];self.assertIsNotNone(c.find('m:f',ns));self.assertEqual(float(c.find('m:v',ns).text),expected[key],key)
   errors=[]
   for name in z.namelist():
    if name.startswith('xl/worksheets/sheet') and name.endswith('.xml'):
     errors += [name+':'+c.attrib.get('r','') for c in ET.fromstring(z.read(name)).findall('.//m:c',ns) if c.attrib.get('t')=='e']
   self.assertEqual(errors,[])

 def changed_input(self,sheet,edit):
  ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
  with zipfile.ZipFile(ROOT/'excel/KETS_Methodology_Dashboard.xlsx') as z:
   files={name:z.read(name) for name in z.namelist()}
  if sheet is None:
   target='xl/workbook.xml'
  else:
   root=ET.fromstring(files['xl/workbook.xml'])
   rels={r.attrib['Id']:r.attrib['Target'] for r in ET.fromstring(files['xl/_rels/workbook.xml.rels'])}
   rid='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
   target=next(rels[s.attrib[rid]] for s in root.findall('m:sheets/m:sheet',ns) if s.attrib['name']==sheet)
   target=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
  root=ET.fromstring(files[target]);edit(root,ns);files[target]=ET.tostring(root)
  with tempfile.TemporaryDirectory() as directory:
   output=Path(directory)/'changed.xlsx'
   with zipfile.ZipFile(output,'w') as z:
    for name,content in files.items():z.writestr(name,content)
   return read_xlsx(output)

 def test_reordered_header_rejected(self):
  def edit(root,ns):
   cell=root.find('.//m:c[@r="A5"]',ns)
   for child in list(cell):cell.remove(child)
   cell.set('t','inlineStr')
   ET.SubElement(ET.SubElement(cell,'{'+ns['m']+'}is'),'{'+ns['m']+'}t').text='code'
  self.assertRaisesRegex(ValidationError,'header',self.changed_input,'10_방법론',edit)

 def test_populated_row_without_id_rejected(self):
  def edit(root,ns):
   row=root.find('.//m:row[@r="6"]',ns);row.remove(row.find('m:c[@r="A6"]',ns))
  self.assertRaisesRegex(ValidationError,'no id',self.changed_input,'10_방법론',edit)

 def test_fractional_sequence_rejected(self):
  def edit(root,ns):root.find('.//m:c[@r="C6"]/m:v',ns).text='1.5'
  self.assertRaisesRegex(ValidationError,'integer',self.changed_input,'13_검토이력',edit)

 def test_input_formula_rejected(self):
  def edit(root,ns):
   cell=root.find('.//m:c[@r="A6"]',ns)
   ET.SubElement(cell,'{'+ns['m']+'}f').text='1+1'
  self.assertRaisesRegex(ValidationError,'formula',self.changed_input,'10_방법론',edit)

 def test_1904_date_system_respected(self):
  def edit(root,ns):
   prop=root.find('m:workbookPr',ns)
   if prop is None:prop=ET.SubElement(root,'{'+ns['m']+'}workbookPr')
   prop.set('date1904','1')
  from datetime import date,timedelta
  original=read_xlsx(ROOT/'excel/KETS_Methodology_Dashboard.xlsx')
  changed=self.changed_input(None,edit)
  self.assertEqual(changed['metadata']['as_of'],(date.fromisoformat(original['metadata']['as_of'])+timedelta(days=1462)).isoformat())
if __name__=='__main__':unittest.main()
