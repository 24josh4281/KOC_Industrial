// Read-only review of source rows. These are not official business totals.
import {brokenReference,unavailableResult} from './formulaHealth.mjs';
export function sourceCoverage(data){
  const sheetsByFile=new Map();
  for(const sheet of data.sheets||[]){const group=sheetsByFile.get(sheet.source_id)||[];group.push(sheet);sheetsByFile.set(sheet.source_id,group);}
  return (data.files||[]).map(source=>{
    const sheets=sheetsByFile.get(source.id)||[];
    let rows=0,cells=0,formulas=0,saved_errors=0,unavailable=0;
    for(const sheet of sheets){rows+=(sheet.rows||[]).length;for(const row of sheet.rows||[]){for(const cell of row.cells){cells++;if(cell.formula)formulas++;if(cell.error)saved_errors++;if(cell.value===unavailableResult)unavailable++;}}}
    return {id:source.id,filename:source.filename,format:source.format,sheets:sheets.length,rows,cells,formulas,saved_errors,unavailable};
  });
}
export function materialSummary(data) {
  const sheets=data.sheets||[], apps=data.applications||[];
  const statuses={}; for(const a of apps){const key=a.official_status_text||'미확인';statuses[key]=(statuses[key]||0)+1;}
  return {files:(data.files||[]).length,sheets:sheets.length,
    nonempty_rows:sheets.reduce((n,s)=>n+(s.rows||[]).length,0),
    cached_error_cells:sheets.reduce((n,s)=>n+(s.rows||[]).reduce((a,r)=>a+r.cells.filter(c=>c.error).length,0),0),
    methodology_applications:apps.length,history_lines:(data.history||[]).length,
    type_conflicts:apps.filter(a=>a.type_conflict).length,status_counts:statuses};
}
export function sourceRows(sheet,query='',errorsOnly=false){
  const q=query.trim().toLocaleLowerCase('ko-KR');
  return (sheet?.rows||[]).filter(r=>(!errorsOnly||r.cells.some(c=>c.error||brokenReference(c.formula)||c.value===unavailableResult))&&(!q||r.cells.some(c=>String(c.value??'').toLocaleLowerCase('ko-KR').includes(q))));
}
export function validateMaterials(data){
  if(!['local-materials-1.0','local-materials-1.1'].includes(data?.catalog_version)||!Array.isArray(data.files)||!Array.isArray(data.sheets)||!Array.isArray(data.applications)||!Array.isArray(data.history))throw Error('전체자료 로컬 검토 JSON 형식인지 확인하세요.');
  if(data.catalog_version==='local-materials-1.1'&&(!data.refresh||data.refresh.schema_version!=='ors-refresh-1.0'||!Array.isArray(data.refresh.files)||!Array.isArray(data.refresh.pending)||!data.refresh.summary))throw Error('ORS 갱신 기록이 누락되었거나 올바르지 않습니다.');
  if(!data.sheets.every(s=>Array.isArray(s.rows)&&s.rows.every(r=>Number.isInteger(r.row)&&Array.isArray(r.cells)&&r.cells.every(c=>Number.isInteger(c.col)))))throw Error('원본 행·열 정보가 올바르지 않습니다.');
  return data;
}
