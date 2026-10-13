// Read-only review of source rows. These are not official business totals.
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
  return (sheet?.rows||[]).filter(r=>(!errorsOnly||r.cells.some(c=>c.error))&&(!q||r.cells.some(c=>String(c.value??'').toLocaleLowerCase('ko-KR').includes(q))));
}
export function validateMaterials(data){
  if(data?.catalog_version!=='local-materials-1.0'||!Array.isArray(data.files)||!Array.isArray(data.sheets)||!Array.isArray(data.applications)||!Array.isArray(data.history))throw Error('전체자료 로컬 검토 JSON 형식인지 확인하세요.');
  if(!data.sheets.every(s=>Array.isArray(s.rows)&&s.rows.every(r=>Number.isInteger(r.row)&&Array.isArray(r.cells)&&r.cells.every(c=>Number.isInteger(c.col)))))throw Error('원본 행·열 정보가 올바르지 않습니다.');
  return data;
}
