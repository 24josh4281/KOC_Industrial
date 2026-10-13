// View selection only. Official metrics remain in the shared Python/JS contract.
export const presets = {
  all:'전체', registered:'누적 등록', active:'적용 가능', new_year:'선택연도 신규',
  revisions_year:'선택연도 개정', reviewing:'검토 중', pending_registration:'승인·등록대기',
  waiting:'보완 대기', overdue:'단계 경과 확인', unknown_stage:'단계 미확인'
};

export function visibleHistory(data, snapshot, applicationId) {
  const {as_of,knowledge_as_of}=snapshot.metadata;
  return data.review_events.filter(e=>e.application_id===applicationId&&e.occurred_on<=as_of&&e.recorded_on<=knowledge_as_of)
    .sort((a,b)=>b.occurred_on.localeCompare(a.occurred_on)||b.sequence-a.sequence);
}

export function visibleVersions(data, snapshot, methodologyId) {
  const {as_of,knowledge_as_of}=snapshot.metadata;
  return data.versions.filter(v=>v.methodology_id===methodologyId&&v.recorded_on<=knowledge_as_of&&(!v.registered_on||v.registered_on<=as_of))
    .sort((a,b)=>(b.registered_on||'').localeCompare(a.registered_on||''));
}

export function viewRows(data, snapshot, {tab='method',preset='all',status='all',query='',technology=null}={}) {
  const year=snapshot.metadata.selected_year;
  const methods=snapshot.methodology_rows.filter(m=>m.registered);
  let rows=tab==='method'?methods:tab==='version'?methods.flatMap(m=>visibleVersions(data,snapshot,m.id).map(v=>({...v,code:m.code,name:m.name,technology:m.technology}))):snapshot.application_rows;
  const matches={
    active:r=>r.applicability==='active', new_year:r=>r.registration_year===year,
    revisions_year:r=>r.change_type==='revision'&&Number(r.registered_on?.slice(0,4))===year,
    reviewing:r=>r.is_reviewing, pending_registration:r=>r.stage==='approved',
    waiting:r=>r.is_reviewing&&r.waiting, overdue:r=>r.is_overdue, unknown_stage:r=>r.stage==='unknown'
  };
  if(matches[preset])rows=rows.filter(matches[preset]);
  if(status!=='all')rows=rows.filter(r=>(tab==='method'?r.applicability:tab==='version'?r.change_type:r.stage)===status);
  if(technology!==null)rows=rows.filter(r=>r.technology===technology);
  const q=query.trim().toLocaleLowerCase('ko-KR');
  if(q)rows=rows.filter(r=>[r.id,r.code,r.name,r.title,r.owner,r.technology].some(v=>String(v??'').toLocaleLowerCase('ko-KR').includes(q)));
  return rows;
}

export function downloadCsv(filename, headers, rows, escape) {
  const content='\ufeff'+[headers,...rows].map(row=>row.map(escape).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
