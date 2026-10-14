import React,{useEffect,useMemo,useRef} from 'react';
import {init,use} from 'echarts/core';
import {BarChart} from 'echarts/charts';
import {GridComponent,TooltipComponent,AriaComponent} from 'echarts/components';
import {SVGRenderer} from 'echarts/renderers';

use([BarChart,GridComponent,TooltipComponent,AriaComponent,SVGRenderer]);

export default function ManagementYearChart({distribution,onSelect,palette}){
 const ref=useRef(null),callback=useRef(onSelect);callback.current=onSelect;
 const annual=useMemo(()=>[...distribution].sort((a,b)=>a.name==='미확보'?1:b.name==='미확보'?-1:a.name.localeCompare(b.name,'ko')),[distribution]);
 const option=useMemo(()=>({
  animation:false,aria:{enabled:true,description:'신청연도별 관리 Tool 원장행. '+annual.map(r=>`${r.name} ${r.count}행`).join(', ')},
  textStyle:{fontFamily:'Malgun Gothic, sans-serif',color:palette['--navy']},
  tooltip:{trigger:'axis',renderMode:'richText',formatter:params=>`${params[0]?.axisValue||''}<br/>원장행 ${params[0]?.value??0}`},
  grid:{left:52,right:24,top:24,bottom:54},
  xAxis:{type:'category',data:annual.map(r=>r.name),axisLabel:{interval:0,rotate:annual.length>16?45:0,color:'#526174'},axisTick:{show:false}},
  yAxis:{type:'value',min:0,minInterval:1,name:'원장행',nameTextStyle:{color:'#526174'},splitLine:{lineStyle:{color:palette['--line'],type:'dashed'}}},
  series:[{type:'bar',name:'원장행',barMaxWidth:30,data:annual.map(r=>({value:r.count,itemStyle:{color:r.name==='미확보'?palette['--secondary']:palette['--blue']}}))}]
 }),[annual,palette]);
 useEffect(()=>{
  if(!ref.current||!annual.length)return;
  const chart=init(ref.current,null,{renderer:'svg'});chart.setOption(option);
  chart.on('click',e=>{if(e.componentType==='series')callback.current(e.name);});
  const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>chart.resize());resize?.observe(ref.current);
  return()=>{resize?.disconnect();chart.dispose();};
 },[option,annual]);
 return annual.length?<div className="management-chart-scroll"><div className="management-year-chart" style={{width:`${Math.max(640,annual.length*48)}px`}} ref={ref} role="img" aria-label="신청연도별 원장행 그래프. 아래의 수치 목록에서 키보드로 분류를 선택할 수 있습니다."/></div>:<p>선택한 조건에 해당하는 원장행이 없습니다.</p>;
}
