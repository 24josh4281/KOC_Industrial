import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query';
import {useReactTable,getCoreRowModel,getSortedRowModel,getPaginationRowModel,flexRender} from '@tanstack/react-table';
import {init,use} from 'echarts/core';
import {BarChart,LineChart} from 'echarts/charts';
import {GridComponent,TooltipComponent,LegendComponent} from 'echarts/components';
import {CanvasRenderer} from 'echarts/renderers';
import {snapshot,validate,labels,scopes,csvValue} from './core.mjs';
import demo from './demo.json';
import empty from '../../data/templates/empty.dataset.json';
import {displayValue,coverageLabel,applicabilityLabel} from './presentation.mjs';
import './styles.css';
import {deadlineAlerts,deadlineLabel} from './deadlines.mjs';
use([BarChart,LineChart,GridComponent,TooltipComponent,LegendComponent,CanvasRenderer]);
const qc=new QueryClient();
function Chart({annual}){const ref=useRef(null);useEffect(()=>{const c=init(ref.current);c.setOption({color:['#2F62F0','#0B1739'],tooltip:{trigger:'axis'},legend:{bottom:0},grid:{left:45,right:20,top:20,bottom:55},xAxis:{type:'category',data:annual.map(x=>x.year)},yAxis:{type:'value',minInterval:1},series:[{name:'신규',type:'bar',data:annual.map(x=>x.new)},{name:'등록연도 확인분 누적',type:'line',data:annual.map(x=>x.cumulative_known_year)}]});const ro=new ResizeObserver(()=>c.resize());ro.observe(ref.current);return()=>{ro.disconnect();c.dispose();};},[annual]);return <div ref={ref} style={{height:320}}/>;}
const EXCEL='./downloads/KETS_Methodology_Dashboard.xlsx';
function DeadlinePanel({snapshot:s}){
 const [within,setWithin]=useState(7);
 const alerts=useMemo(()=>deadlineAlerts(s,within),[s,within]);
 function exportAlerts(){
  const keys=['id','title','owner','due_on','days_remaining','status','next_action'];
  const names=['신청 ID','안건','담당자','제출기한','잔여 달력일','알림 상태','다음 조치'];
  const lines=[names,...alerts.rows.map(r=>keys.map(k=>r[k]??''))];
  const url=URL.createObjectURL(new Blob(['\ufeff'+lines.map(row=>row.map(csvValue).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='제출기한_알림.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <section id="deadlines" className="panel">
  <div className="section-head"><div><small className="eyebrow">03 / 업무 알림</small><h2>보완서류 제출기한</h2></div><label>마감 <input aria-label="알림 일수" type="number" min="0" max="365" value={within} onChange={e=>setWithin(Math.max(0,Math.min(365,Math.trunc(Number(e.target.value)||0))))}/>일 전부터 표시</label></div>
  <p>발생 기준일과 원장에 기록된 제출기한의 차이입니다. 보완 대기 중인 신청만 표시하며, 자료가 없으면 기한을 추정하지 않습니다.</p>
  <div className="reminders">{[['overdue','기한 초과'],['today','오늘 마감'],['upcoming','마감 예정'],['unknown','기한 미확인']].map(([key,name])=><div key={key} className={key==='overdue'&&alerts[key]>0?'due-stat danger':'due-stat'}><span>{name}</span><strong>{displayValue(alerts[key],'자료 미확보')}</strong></div>)}</div>
  {!!alerts.rows.length&&<><div className="table-wrap"><table><thead><tr><th>신청 / 안건</th><th>담당</th><th>제출기한</th><th>알림</th><th>다음 조치</th></tr></thead><tbody>{alerts.rows.map(r=><tr key={r.id}><td>{r.title}<small className="record-id">{r.id}</small></td><td>{r.owner||'미확인'}</td><td>{r.due_on||'미확인'}</td><td><span className={'deadline '+r.status}>{deadlineLabel(r)}</span></td><td>{r.next_action||'확인 필요'}</td></tr>)}</tbody></table></div><button onClick={exportAlerts}>알림 목록 Excel용 CSV</button></>}
  {!alerts.rows.length&&<p className="empty">{alerts.overdue===null?'검토자료 미확보':'현재 확인된 자료에서 표시할 보완 대기 항목이 없습니다.'}</p>}
  <p className="footnote">화면에서 확인하는 알림입니다. 이메일·문자 자동 발송과 법정기한 판정은 제공하지 않습니다.</p>
 </section>;
}
function App(){const [data,setData]=useState(empty),[scope,setScope]=useState('industry'),[asof,setAsof]=useState(empty.metadata.as_of),[known,setKnown]=useState(empty.metadata.knowledge_as_of),[tab,setTab]=useState('method'),[q,setQ]=useState(''),[sorting,setSorting]=useState([]),[error,setError]=useState('');
const {data:s,error:queryError}=useQuery({queryKey:['snapshot',data,scope,asof,known],queryFn:()=>snapshot(data,{scope,as_of:asof,knowledge_as_of:known}),staleTime:Infinity,retry:false});
const filteredRows=useMemo(()=>{
 const rows=(tab==='method'?s?.methodology_rows:s?.application_rows)||[];
 return rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
},[s,tab,q]);
const columns=useMemo(()=>{
 const cols=tab==='method'?[['code','방법론 코드'],['name','방법론명'],['scope','범위'],['first_registered_on','최초 등록일'],['applicability','적용 상태']]:[['id','신청 ID'],['title','안건'],['stage','현재 단계'],['stage_age_days','현 단계 경과일'],['due_on','제출기한'],['next_action','다음 조치']];
 return cols.map(([accessorKey,header])=>({accessorKey,header,cell:i=>accessorKey==='applicability'?applicabilityLabel(i.getValue()):labels[i.getValue()]??scopes[i.getValue()]??displayValue(i.getValue())}));
},[tab]);
const table=useReactTable({data:filteredRows,columns,state:{sorting},onSortingChange:setSorting,getCoreRowModel:getCoreRowModel(),getSortedRowModel:getSortedRowModel(),getPaginationRowModel:getPaginationRowModel()});
function loadData(next){validate(next);setData(next);setAsof(next.metadata.as_of);setKnown(next.metadata.knowledge_as_of);setQ('');setSorting([]);setError('');table.setPageIndex(0);}
async function upload(e){try{const file=e.target.files[0];if(!file)return;if(file.size>10_000_000)throw Error('10MB 이내 JSON을 사용하십시오.');const next=JSON.parse(await file.text());loadData(next);}catch(e){setError(e.message);}finally{e.target.value='';}}
return <main className="shell">
  <header><div><small className="eyebrow">INNerCarry STYLE / METHODOLOGY DESK</small><h1>산업부문 외부사업<br/>방법론 업무 현황</h1><p className="lead">누적 등록, 진행 중 신청, 보완서류 제출기한을 함께 확인합니다.</p></div>
    <div className="controls"><a className="button primary" href={EXCEL} download>엑셀 대시보드 다운로드</a><label className="button">JSON 불러오기<input aria-label="JSON 불러오기" hidden type="file" accept=".json" onChange={upload}/></label></div>
  </header><nav className="section-nav" aria-label="현황 구역"><a href="#cumulative">누적 현황</a><a href="#work">신청·검토</a><a href="#deadlines">업무 알림</a><a href="#excel">엑셀과 웹</a></nav>
  <div className="notice">{data.metadata.mode==='demo'?'합성 예시 · 공식 통계 아님':'로컬 자료 · 서버에 저장하지 않음'} / {data.metadata.coverage.scope_note}</div>
  <div className="filters"><button onClick={()=>loadData(demo)}>합성 예시 보기</button><button onClick={()=>loadData(empty)}>자료 비우기</button></div>
  {(error||queryError)&&<p role="alert">{error||queryError.message}</p>}
  <div className="filters">
    <label>집계 범위 <select value={scope} onChange={e=>setScope(e.target.value)}>{Object.entries(scopes).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <label>발생 기준일 <input type="date" value={asof} onChange={e=>setAsof(e.target.value||asof)}/></label>
    <label>지식 기준일 <input type="date" value={known} onChange={e=>setKnown(e.target.value||known)}/></label>
  </div>
  <p>등록자료: {coverageLabel(data.metadata.coverage.registrations)} / 검토자료: {coverageLabel(data.metadata.coverage.reviews)}</p>
  {s&&<>
    <section id="cumulative" aria-label="주요 현황" className="kpis">{[['registered','누적 고유 방법론'],['active','적용 가능 확인'],['new_year','해당연도 신규'],['revisions_year','해당연도 개정'],['reviewing','검토 중 신청'],['pending_registration','승인·등록대기']].map(([k,l])=><div className="kpi" key={k}><span>{l}</span><strong className={s.kpis[k]===null?'missing':''}>{displayValue(s.kpis[k],'자료 미확보')}</strong><small>{k==='revisions_year'?'버전':['reviewing','pending_registration'].includes(k)?'신청':'방법론'}</small></div>)}</section>
    <section className="panel"><small className="eyebrow">01 / 누적 현황</small><h2>연도별 신규·누적 등록</h2>
      {data.metadata.coverage.registrations==='missing'?<p>등록자료 미확보 · 연도별 추이를 계산하지 않았습니다.</p>:<><p>등록연도 미확인 {s.kpis.unknown_year??'—'}건은 연도별 차트에서 제외</p><Chart annual={s.annual}/></>}
    </section>
    <section id="work" className="panel"><small className="eyebrow">02 / 진행 현황</small><h2>방법론과 검토 신청</h2>
      <div className="filters"><button aria-pressed={tab==='method'} onClick={()=>{setTab('method');table.setPageIndex(0);}}>등록 방법론</button><button aria-pressed={tab==='app'} onClick={()=>{setTab('app');table.setPageIndex(0);}}>검토 신청</button><input aria-label="검색" placeholder="검색" value={q} onChange={e=>setQ(e.target.value)}/></div>
      <div className="table-wrap"><table><thead>{table.getHeaderGroups().map(g=><tr key={g.id}>{g.headers.map(h=><th key={h.id}><button onClick={h.column.getToggleSortingHandler()}>{flexRender(h.column.columnDef.header,h.getContext())}</button></th>)}</tr>)}</thead>
        <tbody>{table.getRowModel().rows.map(r=><tr key={r.id}>{r.getVisibleCells().map(c=><td key={c.id}>{flexRender(c.column.columnDef.cell,c.getContext())}</td>)}</tr>)}</tbody>
      </table></div>
      {!table.getRowModel().rows.length&&<p>{data.metadata.coverage[tab==='method'?'registrations':'reviews']==='missing'?'자료 미확보':'현재 조회 조건에 맞는 항목이 없습니다.'}</p>}
      <button disabled={!table.getCanPreviousPage()} onClick={()=>table.previousPage()}>이전</button><button disabled={!table.getCanNextPage()} onClick={()=>table.nextPage()}>다음</button>
    </section>
    <DeadlinePanel snapshot={s}/>
    <section className="panel"><h2>데이터 품질</h2>{s.quality_warnings.length?s.quality_warnings.map(w=><p key={w}>{w}</p>):<p>입력 구조 경고 없음. 자료의 전수 확보나 공식 검증을 의미하지 않습니다.</p>}</section>
  </>}
  <section id="excel" className="panel excel-panel"><div><small className="eyebrow">04 / 동일 원장 사용</small><h2>엑셀에서 입력하고 웹에서 확인</h2><p>다운로드 엑셀은 수식·차트가 포함된 합성 예시입니다. 실제 자료는 표준 원장으로 확정한 뒤 JSON으로 변환해 웹에서 불러옵니다.</p><p>파일 단위로 교환하며 실시간 동기화는 제공하지 않습니다. 제출기한 알림 목록은 CSV로 내려받아 엑셀에서 확인할 수 있습니다.</p><a className="button primary" href={EXCEL} download>엑셀 파일 다운로드</a> <a className="button" href="https://github.com/24josh4281/KOC_Industrial/blob/main/docs/04_EXCEL.md" target="_blank" rel="noreferrer">엑셀·웹 사용 안내</a></div></section>
  <footer>조회 전용. 파일은 현재 탭에서만 사용됩니다. 공동편집·로그인·DB 연결은 아직 제공하지 않습니다.</footer>
</main>}
createRoot(document.getElementById('root')).render(<QueryClientProvider client={qc}><App/></QueryClientProvider>);
