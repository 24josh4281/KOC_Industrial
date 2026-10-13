import React,{useEffect,useMemo,useRef,useState} from 'react';
import {useReactTable,getCoreRowModel,getSortedRowModel,getPaginationRowModel,flexRender} from '@tanstack/react-table';
import {labels,scopes,csvValue} from './core.mjs';
import {applicabilityLabel,displayValue} from './presentation.mjs';
import {deadlineAlerts,deadlineLabel} from './deadlines.mjs';
import {presets,viewRows,visibleHistory,visibleVersions,downloadCsv} from './views.mjs';
import {EmptyState} from './Charts.jsx';

const fields={
  method:[['code','방법론 코드'],['name','방법론명'],['technology','기술'],['first_registered_on','최초 등록일'],['applicability','적용 상태']],
  version:[['code','방법론 코드'],['name','방법론명'],['version','버전'],['change_type','구분'],['registered_on','버전 등록일']],
  app:[['id','신청 ID'],['title','안건'],['stage','현재 단계'],['stage_age_days','단계 경과일'],['due_on','제출기한'],['next_action','다음 조치']]
};
const cellText=(key,value)=>key==='applicability'?applicabilityLabel(value):key==='change_type'?(value==='revision'?'개정':'신규'):key==='stage'?(labels[value]??'단계 미확인'):key==='scope'?(scopes[value]??'범위 미확인'):displayValue(value,'미확인');

export function WorkTable({data,snapshot:s,filter,setFilter,onOpen}) {
  const [sorting,setSorting]=useState([]);
  const rows=useMemo(()=>viewRows(data,s,filter),[data,s,filter]);
  const {tab,preset,status,query,technology}=filter;
  const columns=useMemo(()=>fields[tab].map(([accessorKey,header])=>({accessorKey,header,cell:info=>{
    const value=cellText(accessorKey,info.getValue()),r=info.row.original;
    if(['name','title'].includes(accessorKey))return <button className="record-link" onClick={()=>onOpen({type:tab==='app'?'app':'method',id:tab==='version'?r.methodology_id:r.id})}>{value}<span aria-hidden="true"> ↗</span></button>;
    if(accessorKey==='stage'||accessorKey==='applicability')return <span className={`status-badge ${info.getValue()}`}>{value}</span>;
    if(accessorKey==='stage_age_days')return <span className="numeric">{value}{info.getValue()!==null?'일':''}</span>;
    return value;
  }})),[tab,onOpen]);
  const table=useReactTable({data:rows,columns,state:{sorting},onSortingChange:setSorting,getCoreRowModel:getCoreRowModel(),getSortedRowModel:getSortedRowModel(),getPaginationRowModel:getPaginationRowModel(),initialState:{pagination:{pageSize:10}}});
  const change=next=>{setFilter({...filter,...next});table.setPageIndex(0);};
  const selectTab=next=>{change({tab:next,preset:'all',status:'all',query:'',technology:null});setSorting([]);};
  const missing=s.metadata.coverage[tab==='app'?'reviews':'registrations']==='missing';
  const statuses=tab==='method'?{active:'적용 가능 확인',inactive:'적용 불가',unknown:'적용 상태 미확인'}:tab==='version'?{new:'신규',revision:'개정'}:labels;
  const exportRows=()=>downloadCsv('현재_조회목록.csv',fields[tab].map(([,h])=>h),table.getSortedRowModel().rows.map(({original:r})=>fields[tab].map(([k])=>cellText(k,r[k]))),csvValue);
  return <section id="work" className="panel work-panel" aria-labelledby="work-title"><div className="section-head"><div><small className="eyebrow">05 / 원장 확인</small><h2 id="work-title">수치에서 개별 안건까지</h2></div><button className="button subtle" disabled={missing||!rows.length} onClick={exportRows}>조회 목록 CSV ↓</button></div>
    <div className="work-tabs" role="group" aria-label="원장 종류">{[['method','등록 방법론'],['version','등록 버전'],['app','검토 신청']].map(([key,name])=><button key={key} aria-pressed={tab===key} onClick={()=>selectTab(key)}>{name}</button>)}</div>
    <div className="table-toolbar"><label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="원장 검색" placeholder="명칭 · 코드 · 담당자 검색" value={query} onChange={e=>change({query:e.target.value})}/></label><select aria-label="목록 상태" value={status} onChange={e=>change({status:e.target.value})}><option value="all">모든 상태</option>{Object.entries(statuses).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select><button className="text-button" onClick={()=>change({preset:'all',status:'all',query:'',technology:null})}>필터 초기화</button></div>
    <div className="list-context" aria-live="polite"><span>{technology!==null&&technology!==undefined&&<span className="filter-chip">{technology||'기술 미확인'} <button aria-label="기술 필터 해제" onClick={()=>change({technology:null})}>×</button></span>}{preset!=='all'&&<span className="filter-chip">{['new_year','revisions_year'].includes(preset)?s.metadata.selected_year+'년 ':''}{presets[preset]} <button aria-label="선택 지표 필터 해제" onClick={()=>change({preset:'all'})}>×</button></span>}{missing?'자료 미확보':<><b>{rows.length.toLocaleString('ko-KR')}</b> {tab==='method'?'방법론':tab==='version'?'버전':'신청'}</>}</span><span>명칭을 선택하면 이력·근거를 확인할 수 있습니다.</span></div>
    {missing?<EmptyState>{tab==='app'?'검토':'등록'}자료 미확보</EmptyState>:<><div className="table-wrap" tabIndex="0" aria-label="원장 표 가로 스크롤"><table className="ledger-table"><thead>{table.getHeaderGroups().map(g=><tr key={g.id}>{g.headers.map(h=><th key={h.id} aria-sort={h.column.getIsSorted()==='asc'?'ascending':h.column.getIsSorted()==='desc'?'descending':'none'}><button onClick={h.column.getToggleSortingHandler()}>{flexRender(h.column.columnDef.header,h.getContext())}<span className="sort-mark" aria-hidden="true">{h.column.getIsSorted()==='asc'?'↑':h.column.getIsSorted()==='desc'?'↓':'↕'}</span></button></th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map(r=><tr key={r.original.id}>{r.getVisibleCells().map(c=><td key={c.id}>{flexRender(c.column.columnDef.cell,c.getContext())}</td>)}</tr>)}</tbody></table></div>
      {!rows.length&&<p className="no-results">현재 조건에 맞는 항목이 없습니다. 검색어나 필터를 확인하세요.</p>}
      <div className="pagination"><span>{rows.length?table.getState().pagination.pageIndex*10+1:0}–{Math.min((table.getState().pagination.pageIndex+1)*10,rows.length)} / {rows.length}건</span><div><button disabled={!table.getCanPreviousPage()} onClick={()=>table.previousPage()}>← 이전</button><span>{table.getState().pagination.pageIndex+1} / {Math.max(1,table.getPageCount())}</span><button disabled={!table.getCanNextPage()} onClick={()=>table.nextPage()}>다음 →</button></div></div></>}
    <p className="footnote">{tab==='app'?'전체 신청에는 종결·승인대기도 포함됩니다. 단계 경과일은 보완기간을 포함한 달력일이며 법정기한 판정이 아닙니다.':tab==='version'?'등록 확인 방법론에 연결된 버전입니다. 등록일 미확인은 그대로 표시하며, 선택연도 개정 집계에서 제외합니다.':'등록일 또는 등록사실 확인일이 기준일 이하인 방법론입니다. 최초등록일 미확인을 0이나 유효시작일로 대체하지 않습니다.'}</p>
  </section>;
}

export function DeadlinePanel({snapshot:s,onOpen}) {
  const [within,setWithin]=useState(7),[status,setStatus]=useState('all');
  const alerts=useMemo(()=>deadlineAlerts(s,within),[s,within]);
  const rows=alerts.rows.filter(r=>status==='all'||r.status===status);
  const names={overdue:'기한 초과',today:'오늘 마감',upcoming:'마감 예정',unknown:'기한 미확인'};
  const exportRows=()=>downloadCsv('제출기한_알림.csv',['신청 ID','안건','담당자','제출기한','잔여 달력일','알림 상태','다음 조치'],rows.map(r=>[r.id,r.title,r.owner,r.due_on,r.days_remaining,deadlineLabel(r),r.next_action]),csvValue);
  return <section id="deadlines" className="panel deadline-panel"><div className="section-head"><div><small className="eyebrow">04 / 업무 알림</small><h2>다가오는 제출기한을 놓치지 않도록</h2></div><label className="deadline-window">마감 <input aria-label="알림 일수" type="number" min="0" max="365" value={within} onChange={e=>setWithin(Math.max(0,Math.min(365,Math.trunc(Number(e.target.value)||0))))}/> 일 전부터</label></div><p className="panel-intro">보완 대기 중인 검토 신청 · 발생 기준일 {s.metadata.as_of} 기준</p>
    <div className="reminder-grid">{Object.entries(names).map(([key,name])=><button key={key} className={'reminder '+key} aria-pressed={status===key} onClick={()=>setStatus(status===key?'all':key)}><span>{name}</span><strong className={alerts[key]===null?'is-missing':''}>{displayValue(alerts[key],'자료 미확보')}<small>{alerts[key]!==null?'신청':''}</small></strong><span className="reminder-hint">{key==='overdue'?'기한이 지난 보완 건':key==='today'?'기준일에 제출 예정':key==='upcoming'?within+'일 이내 제출 예정':'제출일 확인 필요'}</span></button>)}</div>
    <div className="deadline-actions"><span>{status==='all'?'전체 알림':names[status]+'만 표시'}{status!=='all'&&<button className="text-button" onClick={()=>setStatus('all')}>전체 보기</button>}</span><button disabled={!rows.length} className="text-button" onClick={exportRows}>알림 목록 CSV ↓</button></div>
    {rows.length?<div className="deadline-list">{rows.map(r=><article key={r.id} className="deadline-row"><span className={'deadline-pill '+r.status}>{deadlineLabel(r)}</span><div><button className="record-link" onClick={()=>onOpen({type:'app',id:r.id})}>{r.title} ↗</button><p>{r.id} <span>·</span> {r.owner||'담당 미확인'}</p></div><div className="deadline-date"><small>제출기한</small><strong>{r.due_on||'미확인'}</strong></div><div className="deadline-next"><small>다음 조치</small><span>{r.next_action||'확인 필요'}</span></div></article>)}</div>:<p className="no-results">{alerts.overdue===null?'검토자료 미확보 · 제출기한을 추정하지 않습니다.':'현재 조건에 해당하는 보완 대기 알림이 없습니다.'}</p>}
    <p className="footnote">화면 확인용 알림입니다. 이메일·문자 자동 발송과 법정기한 판정은 제공하지 않습니다.</p>
  </section>;
}

const actions={transition:'단계 변경',supplement_requested:'보완 요청',supplement_received:'보완 회신',note:'검토 메모'};
function Source({data,id}) {
  const source=data.sources.find(s=>s.id===id);
  if(!source)return <span>출처 미확인</span>;
  return <span>{source.url&&/^https?:\/\//i.test(source.url)?<a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a>:source.label} <small>· 확인일 {source.retrieved_on}</small></span>;
}
export function RecordDialog({selection,onClose,data,snapshot:s}) {
  const ref=useRef(null);
  useEffect(()=>{if(selection&&ref.current&&!ref.current.open)ref.current.showModal();},[selection]);
  if(!selection)return null;
  const isApp=selection.type==='app';
  const r=(isApp?s.application_rows:s.methodology_rows).find(x=>x.id===selection.id);
  if(!r)return null;
  const history=isApp?visibleHistory(data,s,r.id):visibleVersions(data,s,r.id);
  return <dialog ref={ref} className="record-dialog" aria-labelledby="record-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="dialog-head"><div><small className="eyebrow">{isApp?'신청 상세':'방법론 상세'} / {r.id}</small><h2 id="record-title">{r.title||r.name}</h2></div><button className="close-button" onClick={onClose} aria-label="상세 닫기">×</button></div>
    <div className="detail-summary"><div><span>{isApp?'현재 단계':'적용 상태'}</span><strong>{isApp?labels[r.stage]:applicabilityLabel(r.applicability)}</strong></div><div><span>{isApp?'접수일':'최초등록일'}</span><strong>{displayValue(isApp?r.submitted_on:r.first_registered_on,'미확인')}</strong></div><div><span>{isApp?'담당자':'방법론 코드'}</span><strong>{displayValue(isApp?r.owner:r.code,'미확인')}</strong></div><div><span>{isApp?'제출기한':'기술'}</span><strong>{displayValue(isApp?r.due_on:r.technology,'미확인')}</strong></div></div>
    {isApp&&<div className="next-action"><small>다음 조치</small><strong>{r.next_action||'확인 필요'}</strong>{r.waiting&&<span className="status-badge">보완 대기</span>}</div>}
    <p className="detail-source"><b>원장 출처</b> <Source data={data} id={r.source_id}/></p>
    <div className="detail-section-head"><h3>{isApp?'검토 이력':'버전 이력'}</h3><span>{history.length}건 · 최근 순</span></div>
    <p className="footnote">발생·등록 기준일 {s.metadata.as_of} / 지식 기준일 {s.metadata.knowledge_as_of}에 확인 가능한 이력만 표시합니다.</p>
    {history.length?<ol className="history-timeline">{history.map(h=><li key={h.id}><div className="history-date">{isApp?h.occurred_on:h.registered_on||'등록일 미확인'}</div><div className="history-body"><strong>{isApp?labels[h.stage]:`버전 ${h.version}`}</strong><span className="status-badge">{isApp?actions[h.action]:h.change_type==='revision'?'개정':'신규'}</span>{isApp?<><p>{h.official_status_text||'공식 상태 원문 미확인'}</p>{h.note&&<p>{h.note}</p>}{h.next_action&&<p>다음 조치 · {h.next_action}</p>}<p>보완 대기 {h.waiting?'예':'아니오'} · 제출기한 {h.due_on||'미확인'}</p></>:<p>유효시작일 {h.effective_from||'미확인'} · 등록일과 별도 관리</p>}<small>기록일 {h.recorded_on} · <Source data={data} id={h.source_id}/></small></div></li>)}</ol>:<p className="no-results">선택한 기준일에 확인 가능한 이력이 없습니다.</p>}
    <div className="dialog-footer"><span>원장과 공식 상태를 변경하지 않는 조회 화면입니다.</span><button onClick={onClose}>확인 완료</button></div>
  </dialog>;
}
