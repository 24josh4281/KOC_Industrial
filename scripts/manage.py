#!/usr/bin/env python3
"""Repository-root CLI; no scraping or remote writes are performed."""
from __future__ import annotations
import argparse, csv, json, sys, zipfile, posixpath
from pathlib import Path
from datetime import date,timedelta
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'python'))
from kets_dashboard.core import load,validate,snapshot,public_dataset,ValidationError

def save(path,obj):
 p=Path(path);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def safe_text(value):
 if value is None:return ''
 if isinstance(value,bool):return 'true' if value else 'false'
 text=str(value)
 # Prevent spreadsheet formula injection, including tab/space prefixes.
 return "'"+text if text.lstrip(' \t\r\n').startswith(('=','+','-','@')) else text

def export_csv(data,directory):
 fields=load(ROOT/'config/field_map.json');out=Path(directory);out.mkdir(parents=True,exist_ok=True)
 for name,headers in fields.items():
  with (out/(name+'.csv')).open('w',encoding='utf-8-sig',newline='') as f:
   writer=csv.writer(f);writer.writerow(headers)
   for row in data[name]:writer.writerow([safe_text(row[k]) for k in headers])
 save(out/'metadata.json',data['metadata'])

def read_xlsx(path):
 """Read only contract input sheets, not cached/formula helper columns. Reject formulas in inputs."""
 ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 relns='{http://schemas.openxmlformats.org/package/2006/relationships}'
 rid='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
 mapping=load(ROOT/'config/excel_contract.json');fields=load(ROOT/'config/field_map.json')
 with zipfile.ZipFile(path) as z:
  if sum(i.file_size for i in z.infolist())>100_000_000:raise ValidationError('workbook uncompressed size >100 MB')
  strings=[]
  if 'xl/sharedStrings.xml' in z.namelist():
   strings=[''.join(si.itertext()) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
  relationships={r.attrib['Id']:r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
  sheets={}
  for s in ET.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet',ns):
   target=relationships[s.attrib[rid]]
   target=target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/'+target)
   sheets[s.attrib['name']]=ET.fromstring(z.read(target))
  workbook=ET.fromstring(z.read('xl/workbook.xml'))
  properties=workbook.find('s:workbookPr',ns)
  date1904=properties is not None and properties.attrib.get('date1904') in ('1','true')
  def cell_value(c):
   t=c.attrib.get('t');v=c.find('s:v',ns)
   if c.find('s:f',ns) is not None:raise ValidationError(f'formula found in editable input cell {c.attrib.get("r")}')
   if t=='inlineStr':return ''.join(c.find('s:is',ns).itertext())
   if v is None:return None
   if t=='s':return strings[int(v.text)]
   if t=='b':return v.text=='1'
   if t=='str':return v.text
   try:return float(v.text) if '.' in v.text else int(v.text)
   except (ValueError,TypeError):return v.text
  def col_index(ref):
   n=0
   for c in ref:
    if c.isalpha():n=n*26+ord(c)-64
    else:break
   return n-1
  def inputs(sheet,limit):
   if sheet not in sheets:raise ValidationError(f'missing input sheet: {sheet}')
   rows=[]
   for r in sheets[sheet].findall('s:sheetData/s:row',ns):
    if int(r.attrib['r'])<=mapping['header_row']:continue
    vals={col_index(c.attrib['r']):c for c in r.findall('s:c',ns)}
    # Ignore formulas in helper columns to the right of the canonical contract.
    row=[cell_value(vals[i]) if i in vals else None for i in range(limit)]
    if sheet!=mapping['metadata_sheet'] and row[0] in (None,'') and any(v not in (None,'') for v in row[1:]):
     raise ValidationError(f'{sheet}!{r.attrib["r"]}: populated row has no id')
    rows.append(row)
   return rows
  # Fail closed on moved/renamed columns instead of silently swapping their meaning.
  for bucket,headers in fields.items():
   sheet=mapping['sheets'][bucket]
   if sheet not in sheets:raise ValidationError(f'missing input sheet: {sheet}')
   header=sheets[sheet].find(f's:sheetData/s:row[@r="{mapping["header_row"]}"]',ns)
   actual={} if header is None else {col_index(c.attrib['r']):cell_value(c) for c in header.findall('s:c',ns)}
   if [actual.get(i) for i in range(len(headers))]!=headers:
    raise ValidationError(f'{sheet}: header names/order differ from field_map.json')
  meta={}
  for row in inputs(mapping['metadata_sheet'],2):
   if row[0]:
    if str(row[0]) in meta:raise ValidationError(f'duplicate metadata key: {row[0]}')
    meta[str(row[0])]=row[1]
  def date_val(v):
   if v in (None,''):return None
   if isinstance(v,bool):raise ValidationError('boolean is not a date')
   if isinstance(v,(int,float)):
    if int(v)!=v or v<0 or (not date1904 and v==60):raise ValidationError(f'invalid day-level Excel date: {v}')
    epoch=date(1904,1,1) if date1904 else date(1899,12,31) if v<60 else date(1899,12,30)
    return (epoch+timedelta(days=int(v))).isoformat()
   value=str(v)
   if len(value)!=10:raise ValidationError(f'date must be YYYY-MM-DD: {value}')
   date.fromisoformat(value)
   return value
  metadata={'schema_version':str(meta['schema_version']),'dataset_id':str(meta['dataset_id']),'mode':str(meta['mode']),'as_of':date_val(meta['as_of']),'knowledge_as_of':date_val(meta['knowledge_as_of']),'timezone':'Asia/Seoul','coverage':{'registrations':str(meta['coverage_registrations']),'reviews':str(meta['coverage_reviews']),'scope_note':str(meta['scope_note'])}}
  d={'metadata':metadata}
  sch=load(ROOT/'schemas/dataset.schema.json')
  for bucket,headers in fields.items():
   items=[];props=sch['properties'][bucket]['items']['properties']
   for row in inputs(mapping['sheets'][bucket],len(headers)):
    if row[0] in (None,''):continue
    obj={}
    for k,v in zip(headers,row):
     rule=props[k]
     if rule.get('format')=='date':v=date_val(v)
     elif rule.get('type')=='boolean':
      if v not in [True,False,1,0,'true','false','TRUE','FALSE']:raise ValidationError(f'invalid bool {k}: {v}')
      v=v in [True,1,'true','TRUE']
     elif rule.get('type')=='integer':
      if isinstance(v,bool) or v in (None,'') or str(v).strip()!=str(int(v)):raise ValidationError(f'invalid integer {k}: {v}')
      v=int(v)
     elif v is None:v=None if isinstance(rule['type'],list) else ''
     else:v=str(v)
     obj[k]=v
    items.append(obj)
   d[bucket]=items
  validate(d);return d

def main():
 p=argparse.ArgumentParser();p.add_argument('command',choices=['validate','snapshot','csv','from-xlsx','publish']);p.add_argument('input');p.add_argument('--out');p.add_argument('--scope',default='industry');p.add_argument('--as-of');p.add_argument('--knowledge-as-of');p.add_argument('--year',type=int);a=p.parse_args()
 try:
  d=read_xlsx(a.input) if a.command=='from-xlsx' else load(a.input)
  warnings=validate(d)
  if a.command=='validate':print(json.dumps({'valid':True,'warnings':warnings},ensure_ascii=False,indent=2));return
  if not a.out:p.error('--out required')
  if a.command=='snapshot':save(a.out,snapshot(d,scope=a.scope,as_of=a.as_of,knowledge_as_of=a.knowledge_as_of,year=a.year))
  elif a.command=='csv':export_csv(d,a.out)
  elif a.command=='from-xlsx':save(a.out,d)
  elif a.command=='publish':save(a.out,public_dataset(d))
 except (ValueError,KeyError,OSError) as e:
  print(f'ERROR: {e}',file=sys.stderr);sys.exit(2)
if __name__=='__main__':main()
