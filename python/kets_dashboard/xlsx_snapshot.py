"""Read XLSX values/formulas without saving or dropping native objects."""
from datetime import datetime,date
from pathlib import Path
from collections import Counter
import copy,hashlib,json,re,posixpath,xml.etree.ElementTree as E
from zipfile import ZipFile
from openpyxl.formula.translate import Translator
from openpyxl.styles.numbers import is_date_format,BUILTIN_FORMATS
from openpyxl.utils.datetime import from_excel,CALENDAR_MAC_1904,CALENDAR_WINDOWS_1900

S='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
R='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
def col_num(address):
    n=0
    for c in re.match('[A-Z]+',address)[0]:n=n*26+ord(c)-64
    return n

def read_xlsx(path):
    out={}
    with ZipFile(path) as z:
        strings=[]
        if 'xl/sharedStrings.xml' in z.namelist():strings=[''.join(t.text or '' for t in si.iter(S+'t')) for si in E.fromstring(z.read('xl/sharedStrings.xml'))]
        styles=E.fromstring(z.read('xl/styles.xml'));custom={int(e.get('numFmtId')):e.get('formatCode') for e in styles.findall(S+'numFmts/'+S+'numFmt')}
        date_styles={i for i,e in enumerate(styles.find(S+'cellXfs')) if is_date_format(custom.get(int(e.get('numFmtId','0')),BUILTIN_FORMATS.get(int(e.get('numFmtId','0')),'')))}
        rels={e.get('Id'):posixpath.normpath('xl/'+e.get('Target')) for e in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        book=E.fromstring(z.read('xl/workbook.xml'));prop=book.find(S+'workbookPr');epoch=CALENDAR_MAC_1904 if prop is not None and prop.get('date1904') in ('1','true') else CALENDAR_WINDOWS_1900
        for sh in book.find(S+'sheets'):
            cells={};shared={}
            for cell in E.fromstring(z.read(rels[sh.get(R+'id')])).iter(S+'c'):
                a=cell.get('r');v=cell.find(S+'v');f=cell.find(S+'f');t=cell.get('t');value=v.text if v is not None else None
                if t=='s' and value is not None:value=strings[int(value)]
                elif t=='inlineStr':value=''.join(e.text or '' for e in cell.iter(S+'t'))
                elif t in (None,'n') and value is not None:
                    value=float(value);value=int(value) if value.is_integer() else value
                    if int(cell.get('s','0')) in date_styles:
                        converted=from_excel(value,epoch)
                        if isinstance(converted,(datetime,date)):value=converted.isoformat()
                elif t=='b':value=value=='1'
                c={'col':col_num(a),'value':value}
                if t=='e':c['error']=True
                if f is not None:
                    c['formula']='='+f.text if f.text else None
                    if f.get('t')=='shared':
                        c['_shared']=f.get('si')
                        if f.text:shared[f.get('si')]=(a,'='+f.text)
                    if f.get('t')=='array':c['_array_ref']=f.get('ref')
                if value is not None or f is not None:cells[a]=c
            for a,c in cells.items():
                if '_shared' in c:
                    origin,formula=shared[c.pop('_shared')]
                    if c['formula'] is None:c['formula']=Translator(formula,origin=origin).translate_formula(a)
            out[sh.get('name')]=cells
    return out

def update_catalog_book(data,book_id,path,source_id):
    sheets=read_xlsx(path)
    for sheet in data['sheets']:
        if sheet['source_id']!=source_id:continue
        cells=sheets[sheet['name']];rows={}
        for a,c in cells.items():rows.setdefault(int(re.search(r'\d+',a)[0]),[]).append({k:v for k,v in c.items() if not k.startswith('_')})
        sheet['rows']=[{'row':r,'cells':v} for r,v in sorted(rows.items())]
        if sheet.get('header_row'):
            columns=[{'col':c['col'],'label':str(c['value'])} for c in rows.get(sheet['header_row'],[]) if c['value'] is not None]
            if columns!=sheet['columns']:raise ValueError(f'관리 파일의 열 구조가 바뀌었습니다. 매핑 확인 필요: {sheet["name"]}')
        sheet['status_distributions']={}
        for column in sheet['columns']:
            if column['label'].strip() in ('처리상태','진행상태','현재 상태','현황'):
                counts=Counter(str(c['value']).strip() for row,cells_in_row in rows.items() if row>(sheet.get('header_row') or 0) for c in cells_in_row if c['col']==column['col'] and c['value'] is not None and str(c['value']).strip())
                sheet['status_distributions'][f"{column['col']}:{column['label']}"]=dict(counts)
        sheet['formula_count']=sum('formula' in c for c in cells.values());sheet['cached_error_count']=sum(bool(c.get('error')) for c in cells.values());sheet['nonempty_rows']=len(rows)
    file=next(f for f in data['files'] if f['id']==source_id);file['filename']=Path(path).name;file['sha256']=hashlib.sha256(Path(path).read_bytes()).hexdigest()
    return sheets
