import React,{useEffect,useMemo,useRef,useState} from 'react';
import {init,use} from 'echarts/core';
import {BarChart,LineChart} from 'echarts/charts';
import {GridComponent,TooltipComponent,LegendComponent,AriaComponent} from 'echarts/components';
import {SVGRenderer} from 'echarts/renderers';
import {labels} from './core.mjs';
use([BarChart,LineChart,GridComponent,TooltipComponent,LegendComponent,AriaComponent,SVGRenderer]);

export function EmptyState({children}) {
  return <div className="view-empty"><span className="empty-mark" aria-hidden="true">—</span><strong>{children}</strong><p>확인된 자료를 불러오면 이 영역에 표시됩니다.</p></div>;
}

export function AnnualChart({snapshot:s,onYear}) {
  const [mode,setMode]=useState('registration'),[period,setPeriod]=useState('5');
  const ref=useRef(null),selectRef=useRef(onYear);selectRef.current=onYear;
  const annual=useMemo(()=>period==='all'?s.annual:s.annual.slice(-5),[s.annual,period]);
  const missing=s.metadata.coverage.registrations==='missing';
  const option=useMemo(()=>({
    animationDuration:300,aria:{enabled:true,description:(mode==='registration'?'연도별 신규 방법론과 등록연도 확인분 누적. ':'연도별 개정 버전. ')+annual.map(r=>mode==='registration'?`${r.year}년 신규 ${r.new}개, 누적 ${r.cumulative_known_year}개`:`${r.year}년 개정 ${r.revisions}버전`).join('. ')},textStyle:{fontFamily:'IBM Plex Sans KR, Malgun Gothic, sans-serif',color:'#475569'},
    tooltip:{trigger:'axis',renderMode:'richText',backgroundColor:'#0B1739',borderWidth:0,textStyle:{color:'#fff'},axisPointer:{type:'shadow'}},
    legend:{bottom:0,left:8,itemWidth:12,itemHeight:8,textStyle:{fontSize:12,color:'#475569'}},
    grid:{left:42,right:20,top:28,bottom:64},
    xAxis:{type:'category',data:annual.map(x=>String(x.year)),axisLine:{show:false},axisTick:{show:false},axisLabel:{color:'#64748B',fontSize:12,margin:16}},
    yAxis:{type:'value',name:mode==='registration'?'방법론':'버전',nameTextStyle:{color:'#64748B',fontSize:11},minInterval:1,splitLine:{lineStyle:{color:'#E8EDF4',type:'dashed'}},axisLabel:{fontSize:12,color:'#64748B'}},
    series:mode==='registration'?[
      {name:'연도별 신규',type:'bar',barMaxWidth:30,itemStyle:{color:'#2F62F0',borderRadius:[3,3,0,0]},data:annual.map(x=>x.new)},
      {name:'등록연도 확인분 누적',type:'line',symbol:'circle',symbolSize:7,lineStyle:{width:3,color:'#0B1739'},itemStyle:{color:'#0B1739',borderColor:'#fff',borderWidth:2},data:annual.map(x=>x.cumulative_known_year)}
    ]:[{name:'연도별 개정',type:'bar',barMaxWidth:34,label:{show:true,position:'top',color:'#0B1739'},itemStyle:{color:'#2F62F0',borderRadius:[3,3,0,0]},data:annual.map(x=>x.revisions)}]
  }),[annual,mode]);
  useEffect(()=>{
    if(missing||!ref.current)return;
    const chart=init(ref.current,null,{renderer:'svg'});chart.setOption(option);
    chart.on('click',event=>{if(event.componentType==='series')selectRef.current(Number(event.name));});
    const resize=new ResizeObserver(()=>chart.resize());resize.observe(ref.current);
    return()=>{resize.disconnect();chart.dispose();};
  },[option,missing]);
  return <section className="panel trend-panel" aria-labelledby="trend-title">
    <div className="section-head"><div><small className="eyebrow">01 / 등록 추이</small><h2 id="trend-title">등록의 흐름을 확인하세요</h2></div><select aria-label="그래프 표시 기간" value={period} onChange={e=>setPeriod(e.target.value)}><option value="5">최근 5개년</option><option value="all">전체 기간</option></select></div>
    <div className="segmented chart-mode" aria-label="그래프 지표"><button aria-pressed={mode==='registration'} onClick={()=>setMode('registration')}>신규·누적 <small>방법론</small></button><button aria-pressed={mode==='revision'} onClick={()=>setMode('revision')}>개정 <small>버전</small></button></div>
    {missing?<EmptyState>등록자료 미확보</EmptyState>:<><div className="annual-chart" ref={ref} role="img" aria-label={mode==='registration'?'연도별 신규 방법론 및 등록연도 확인분 누적 그래프':'연도별 개정 버전 그래프'}/><p className="chart-caption">최초등록연도 미확인 <b>{s.kpis.unknown_year}개 방법론</b>은 신규·누적 그래프에서 제외됩니다. 개정은 버전 단위입니다.</p>
      <details className="chart-data"><summary>그래프 수치 표로 확인 · 연도 선택</summary><div className="table-wrap"><table><caption className="sr-only">등록 추이의 실제 집계값</caption><thead><tr><th>연도</th><th>신규 방법론</th><th>확인분 누적 방법론</th><th>개정 버전</th></tr></thead><tbody>{annual.map(r=><tr key={r.year}><td><button className="text-button" onClick={()=>onYear(r.year)}>{r.year}년 선택</button></td><td>{r.new}</td><td>{r.cumulative_known_year}</td><td>{r.revisions}</td></tr>)}</tbody></table></div><p>연도 선택은 상단 신규·개정 수치에 적용됩니다.</p></details>
    </>}
  </section>;
}

export function StageChart({snapshot:s,onStage}) {
  const keys=['submitted','review','consultation','committee','approved'];
  const max=Math.max(1,...keys.map(k=>s.stage_counts[k]||0));
  return <section className="panel stage-panel" aria-labelledby="stage-title"><small className="eyebrow">02 / 진행 단계</small><h2 id="stage-title">어느 단계에 머물러 있나요?</h2><p className="panel-intro">단계를 선택하면 해당 신청 목록으로 이동합니다.</p>
    {s.metadata.coverage.reviews==='missing'?<EmptyState>검토자료 미확보</EmptyState>:<div className="stage-bars">{keys.map((k,i)=><button className="stage-item" key={k} onClick={()=>onStage(k)}><span className="stage-index">{String(i+1).padStart(2,'0')}</span><span className="stage-content"><span>{labels[k]}</span><span className="stage-track"><span style={{width:`${(s.stage_counts[k]||0)/max*100}%`}}/></span></span><strong>{s.stage_counts[k]||0}<small>신청</small></strong><span aria-hidden="true">↗</span></button>)}</div>}
    <p className="chart-caption">기준일 현재 단계별 건수입니다. 승인·등록대기는 검토 중 신청 수와 별도로 집계합니다.</p>
  </section>;
}

export function TechnologyChart({snapshot:s,onTechnology}) {
  const entries=Object.entries(s.technology_counts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ko'));
  const max=Math.max(1,...entries.map(([,n])=>n));
  return <section className="panel technology-panel"><small className="eyebrow">03 / 기술 분포</small><h2>어떤 기술이 등록되어 있나요?</h2><p className="panel-intro">등록이 확인된 고유 방법론 · 기술명을 눌러 목록 확인</p>
    {s.metadata.coverage.registrations==='missing'?<EmptyState>등록자료 미확보</EmptyState>:entries.length?<div className="technology-bars">{entries.map(([name,count])=><button key={name} className="technology-item" onClick={()=>onTechnology(name)}><span>{name||'기술 미확인'}</span><span className="technology-track"><i style={{width:`${count/max*100}%`}}/></span><strong>{count}<small>방법론</small></strong></button>)}</div>:<p className="view-empty">현재 확인된 등록 방법론이 없습니다.</p>}
  </section>;
}
