import React,{useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query';
import {snapshot,validate,scopes} from './core.mjs';
import {displayValue,coverageLabel} from './presentation.mjs';
import {AnnualChart,StageChart,TechnologyChart} from './Charts.jsx';
import {WorkTable,DeadlinePanel,RecordDialog} from './Workspace.jsx';
import demo from './demo.json';
import empty from '../../data/templates/empty.dataset.json';
import './dashboard.css';

const qc=new QueryClient();
const EXCEL='./downloads/KETS_Methodology_Dashboard.xlsx';
const initialFilter={tab:'method',preset:'all',status:'all',query:'',technology:null};
const metricDefinitions=[
  ['registered','누적 고유 방법론','방법론','개정 버전 중복 제외','method'],
  ['active','적용 가능 확인','방법론','적용 상태 근거 확인분','method'],
  ['new_year','신규 등록','방법론','최초등록일 기준','method'],
  ['revisions_year','개정 등록','버전','버전 등록일 기준','version'],
  ['reviewing','검토 중','신청','접수·검토·협의·심의','app'],
  ['pending_registration','승인·등록대기','신청','등록 완료와 별도','app']
];
function App() {
  const [data,setData]=useState(empty),[scope,setScope]=useState('industry');
  const [asof,setAsof]=useState(empty.metadata.as_of),[known,setKnown]=useState(empty.metadata.knowledge_as_of),[year,setYear]=useState(Number(empty.metadata.as_of.slice(0,4)));
  const [filter,setFilter]=useState(initialFilter),[selection,setSelection]=useState(null),[error,setError]=useState('');
  const {data:s,error:queryError}=useQuery({queryKey:['snapshot',data,scope,asof,known,year],queryFn:()=>snapshot(data,{scope,as_of:asof,knowledge_as_of:known,year}),staleTime:Infinity,retry:false});
  const years=useMemo(()=>{const end=Number(asof.slice(0,4));return Array.from({length:Math.max(1,end-2015+1)},(_,i)=>end-i);},[asof]);
  const coverage=data.metadata.coverage;
  const isMissing=coverage.registrations==='missing'&&coverage.reviews==='missing';
  function loadData(next) {
    validate(next);setData(next);setAsof(next.metadata.as_of);setKnown(next.metadata.knowledge_as_of);setYear(Number(next.metadata.as_of.slice(0,4)));setFilter(initialFilter);setSelection(null);setError('');
  }
  async function upload(e) {
    try{const file=e.target.files[0];if(!file)return;if(file.size>10_000_000)throw Error('10MB 이내 JSON을 사용하십시오.');loadData(JSON.parse(await file.text()));}
    catch(err){setError(err.message);}finally{e.target.value='';}
  }
  function focusRows(tab,preset='all',status='all',query='',technology=null) {
    setFilter({tab,preset,status,query,technology});document.getElementById('work')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  const updateAsOf=value=>{if(value){setAsof(value);setYear(y=>Math.min(y,Number(value.slice(0,4))));setSelection(null);}};
  return <div className="dashboard">
    <a className="skip-link" href="#cumulative">주요 현황으로 이동</a>
    <div className="topbar"><a className="wordmark" href="#top"><span className="brand-mark" aria-hidden="true">K</span><b>KOC <span>INDUSTRIAL</span></b></a><div className="topbar-meta"><span>방법론 운영 대시보드</span><span className="read-only">조회 전용</span></div></div>
    <main className="shell" id="top">
      <header className="page-header"><div><small className="eyebrow">INDUSTRIAL METHODOLOGY / OVERVIEW</small><h1>방법론 현황을 <span>한눈에.</span></h1><p className="lead">누적 등록에서 검토 진행, 다음 조치까지 — 산업부문 외부사업 업무 현황</p></div><div className="header-actions"><button className="button subtle" onClick={()=>window.print()}>화면 인쇄</button><a className="button primary" href={EXCEL} download>엑셀 대시보드 <span aria-hidden="true">↓</span></a></div></header>
      <nav className="section-nav" aria-label="현황 구역"><a href="#cumulative">종합 현황</a><a href="#analysis">통계·분석</a><a href="#deadlines">업무 알림</a><a href="#work">원장·상세</a><a href="#quality">데이터 확인</a></nav>
      <section className={'data-banner '+(data.metadata.mode==='demo'?'demo':'')} aria-label="자료 상태"><div><span className="data-indicator" aria-hidden="true"/><strong>{data.metadata.mode==='demo'?'합성 예시 · 공식 통계 아님':isMissing?'아직 자료가 연결되지 않았습니다':'불러온 자료 · 현재 탭에서만 사용'}</strong><p>{isMissing?'자료 미확보는 0건으로 표시하지 않습니다. 예시를 먼저 살펴보거나 확정된 JSON 원장을 불러오세요.':coverage.scope_note}</p></div><div className="data-actions"><button onClick={()=>loadData(demo)}>{data.metadata.mode==='demo'?'예시로 복원':'합성 예시 보기'}</button><label className="button upload-button">JSON 불러오기<input className="file-input" aria-label="JSON 불러오기" type="file" accept=".json" onChange={upload}/></label><button className="text-button" onClick={()=>loadData(empty)}>비우기</button></div></section>
      {(error||queryError)&&<p className="error" role="alert">{error||queryError.message}</p>}
      <section className="filter-panel" aria-label="집계 기준"><div className="filter-fields"><label>집계 범위<select value={scope} onChange={e=>{setScope(e.target.value);setSelection(null);}}>{Object.entries(scopes).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>신규·개정 집계연도<select value={year} onChange={e=>setYear(Number(e.target.value))}>{years.map(y=><option key={y} value={y}>{y}년</option>)}</select></label><label>발생 기준일<input type="date" value={asof} onChange={e=>updateAsOf(e.target.value)}/></label><label>지식 기준일<input type="date" value={known} onChange={e=>{if(e.target.value){setKnown(e.target.value);setSelection(null);}}}/></label></div><details className="filter-help"><summary>집계 기준 안내</summary><p>발생 기준일까지 일어난 사건 중 지식 기준일까지 기록된 자료를 조회합니다. 집계연도는 신규·개정 수치에만 적용됩니다. 그래프의 연도를 선택해도 같은 기준으로 반영됩니다.</p></details></section>
      <div className="coverage-line"><span>등록자료 <b>{coverageLabel(coverage.registrations)}</b></span><span>검토자료 <b>{coverageLabel(coverage.reviews)}</b></span><span>{scopes[scope]} · {asof} 기준</span></div>
      {s&&<>
        <section id="cumulative" className="kpi-band" aria-label="주요 현황">{metricDefinitions.map(([key,title,unit,note,tab])=><button key={key} className="metric" disabled={s.kpis[key]===null} onClick={()=>focusRows(tab,key)}><span className="metric-label">{['new_year','revisions_year'].includes(key)?year+'년 ':''}{title}<span className="metric-arrow" aria-hidden="true">↗</span></span><span className={'metric-value '+(s.kpis[key]===null?'missing':'')}>{displayValue(s.kpis[key],'자료 미확보')}<small>{s.kpis[key]!==null?unit:''}</small></span><span className="metric-note">{note}</span></button>)}</section>
        <div id="analysis" className="analysis-grid"><AnnualChart snapshot={s} onYear={setYear}/><StageChart snapshot={s} onStage={stage=>focusRows('app','all',stage)}/></div>
        <div className="insight-grid"><TechnologyChart snapshot={s} onTechnology={technology=>focusRows('method','all','all','',technology)}/><section className="panel attention-panel"><small className="eyebrow">NEXT / 확인할 업무</small><h2>지금 확인할 항목</h2><p className="panel-intro">확인된 원장의 조건별 목록으로 바로 이동합니다.</p><div className="attention-list">{[['waiting','보완자료 회신 확인','보완 대기 중인 검토 신청'],['pending_registration','승인 이후 등록 확인','승인·등록대기 신청'],['overdue','단계 경과 확인',s.metadata.internal_threshold_days+'일 초과 · 내부 관리기준'],['unknown_stage','검토 단계 확인','이력으로 단계를 확인하지 못한 신청']].map(([key,title,note])=><button key={key} disabled={s.kpis[key]===null} onClick={()=>focusRows('app',key)}><div><strong>{title}</strong><small>{note}</small></div><span className="attention-count">{displayValue(s.kpis[key],'미확보')}<small>{s.kpis[key]!==null?'신청':''}</small></span><span aria-hidden="true">↗</span></button>)}</div><p className="chart-caption">단계 경과와 제출기한 초과는 서로 다른 기준입니다.</p></section></div>
        <DeadlinePanel snapshot={s} onOpen={setSelection}/>
        <WorkTable data={data} snapshot={s} filter={filter} setFilter={setFilter} onOpen={setSelection}/>
        <section id="quality" className="quality-layout"><div className="panel"><small className="eyebrow">06 / 자료 신뢰도</small><div className="section-head"><h2>확인해야 할 데이터</h2><span className="quality-count">{s.quality_warnings.length}개 구조 경고</span></div><p className="panel-intro">전체 입력 원장 기준입니다. 경고가 없어도 공식 검증·전수 확보를 의미하지 않습니다.</p><details className="quality-details"><summary>점검 항목 펼치기</summary>{s.quality_warnings.length?<ul>{s.quality_warnings.map(w=><li key={w}>{w}</li>)}</ul>:<p>입력 구조 경고가 없습니다.</p>}</details><div className="quality-note">방법론 · 버전 · 신청을 별도 단위로 집계하며, 미확보 자료와 실제 0을 구분합니다.</div></div><div id="excel" className="panel excel-panel"><small className="eyebrow">EXCEL + WEB</small><h2>같은 원장, 두 가지 확인 방식</h2><p>엑셀에 입력한 표준 원장을 JSON으로 변환해 웹에서 확인합니다. 조회 목록·알림은 CSV로 내려받을 수 있습니다.</p><a className="button primary" href={EXCEL} download>엑셀 파일 다운로드 ↓</a><a className="text-button" href="https://github.com/24josh4281/KOC_Industrial/blob/main/docs/04_EXCEL.md" target="_blank" rel="noreferrer">사용 안내 ↗</a><p className="footnote">다운로드 파일은 기존 수식·차트를 보존한 합성 예시입니다. 실시간 동기화는 제공하지 않습니다.</p></div></section>
        <RecordDialog selection={selection} onClose={()=>setSelection(null)} data={data} snapshot={s}/>
      </>}
      <footer><span>KOC INDUSTRIAL <span className="footer-dot">/</span> INNerCarry 디자인 참조</span><span>조회 전용 · DB 연결·로그인·자동 발송 미제공</span></footer>
    </main>
  </div>;
}
createRoot(document.getElementById('root')).render(<QueryClientProvider client={qc}><App/></QueryClientProvider>);
