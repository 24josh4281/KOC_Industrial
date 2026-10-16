import React,{useMemo,useState} from 'react';
import config from '../../config/management_views.json';
import {progressRows,progressSummary,bookLabels} from './progress.mjs';
import {validateMaterials} from './materials.mjs';
import './private-progress.css';
const defaults={year:'2026'};
const label=v=>v===null||v===undefined||v===''||v==='미확보'?'확인 필요':v;
function initial(){try{const raw=globalThis.document?.getElementById('local-materials-data');return raw?validateMaterials(JSON.parse(raw.textContent)):null;}catch{return null;}}
export default function PrivateProgress({data:provided,onSource}){
 const [loaded,setLoaded]=useState(initial),[error,setError]=useState(''),[filters,setFilters]=useState(defaults),[page,setPage]=useState(0),[detail,setDetail]=useState(null);
 const data=provided||loaded,rows=useMemo(()=>data?progressRows(data,config):[],[data]);
 const result=useMemo(()=>progressSummary(rows,filters),[rows,filters]);
 const change=(k,v)=>{setFilters(f=>k==='book'?{year:f.year,book:v}:{...f,[k]:v});setPage(0);setDetail(null);};
 const expected=config.sheets.filter(s=>filters.book==='all'||!filters.book||s.book===filters.book);
 const missing=expected.filter(s=>!data?.sheets.some(v=>v.name===s.name&&v.header_row!==null));
 const unknownDates=rows.filter(r=>!r.year&&(!filters.book||filters.book==='all'||r.book===filters.book)).length;
 const title=filters.year==='all'?'전체 기간 신청 현황':filters.year==='미확보'?'신청일 확인이 필요한 내역':`${filters.year}년 신청 현황`;
 const stages=useMemo(()=>{const counts=new Map();for(const r of result.rows){const name=label(r.stage);counts.set(name,(counts.get(name)||0)+1);}return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ko'));},[result]);
 const listed=result.rows.slice().sort((a,b)=>(b.apply_date||'').localeCompare(a.apply_date||'')||a.id.localeCompare(b.id));
 return <div className="private-progress">
 {!provided&&!data&&<label className="progress-loader">신청 자료 불러오기 <input aria-label="신청 자료 불러오기" type="file" accept=".json" onChange={async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>100000000)throw Error('100 MB 이하 파일을 선택하세요.');setLoaded(validateMaterials(JSON.parse(await f.text())));setFilters(defaults);setPage(0);setDetail(null);setError('');}catch(e){setError(e.message);}}}/></label>}
 {error&&<p role="alert">{error}</p>}
 {!data?<p>신청 자료를 불러오면 연도별 신청 내역과 처리 상태를 확인할 수 있습니다. 자료는 이 화면 안에서 처리됩니다.</p>:<>
 <h3 className="progress-title">{title}</h3>
 <p className="progress-scope">{filters.year==='all'?'모든 연도의 신청 내역입니다.':filters.year==='미확보'?'신청일이 없어 신청연도를 확인할 수 없는 내역입니다.':`${filters.year}년에 신청한 내역의 처리 상태입니다. 이전에 신청한 업무도 보려면 ‘전체 기간’을 선택하세요.`} 같은 사업의 평가·인증·비공개 신청은 각각 표시합니다.</p>
 {data.refresh?.run_at&&<p>자료 반영일: {data.refresh.run_at.slice(0,10)} · 원본에 적힌 처리 상태를 표시합니다.</p>}
 {missing.length>0&&<p role="alert">아직 연결되지 않은 자료: {missing.map(s=>s.name).join(', ')}. 연결된 자료만 표시합니다.</p>}
 {globalThis.document?.getElementById('local-materials-data')&&<a className="button" href="./신청현황_2026_v8.xlsx" download>신청 현황 엑셀 내려받기</a>}
 <div className="material-filter"><label>신청연도<select aria-label="신청연도" value={filters.year||'all'} onChange={e=>change('year',e.target.value)}><option value="all">전체 기간</option>{[...new Set(['2026',...rows.map(r=>r.year).filter(Boolean)])].sort().reverse().map(y=><option key={y} value={y}>{y}년 신청</option>)}<option value="미확보">신청일 확인 필요</option></select></label>{[['book','자료 구분'],['unit','업무'],['region','국내외'],['raw_status','처리 현황'],['stage','진행상태'],['owner','담당자']].map(([k,title])=><label key={k}>{title}<select aria-label={title} value={filters[k]||'all'} onChange={e=>change(k,e.target.value)}><option value="all">전체</option>{[...new Set(rows.filter(r=>k==='book'||!filters.book||filters.book==='all'||r.book===filters.book).map(r=>r[k]||'미확보'))].sort().map(v=><option key={v} value={v}>{k==='book'?bookLabels[v]:label(v)}</option>)}</select></label>)}<label>이름·담당자 검색<input value={filters.query||''} onChange={e=>change('query',e.target.value)}/></label><button onClick={()=>{setFilters(defaults);setPage(0);setDetail(null);}}>2026년 전체 보기</button></div>
 <p className="progress-year-note">신청일이 없어 연도별 현황에서 빠진 내역 {unknownDates.toLocaleString()}건 <button className="text-button" onClick={()=>{setFilters({year:'미확보',book:filters.book});setPage(0);setDetail(null);}}>확인하기</button></p>
 <div className="progress-cards">{result.groups.map(g=><div key={g.book+g.unit}><small>{bookLabels[g.book]}</small><b>{g.unit}</b><strong>{g.count.toLocaleString()}<small>건</small></strong></div>)}</div>
 <p><strong>조회된 신청 내역 {result.rows.length.toLocaleString()}건</strong> · 진행상태 확인 필요 {result.missing_stage}건 · 담당자 확인 필요 {result.missing_owner}건</p>
 <h4>처리 단계별 현황</h4><div className="progress-stages">{stages.length?stages.map(([name,count])=><button key={name} onClick={()=>change('stage',name==='확인 필요'?'미확보':name)}>{name} <strong>{count}건</strong></button>):<p>{missing.length===expected.length?'신청 자료를 연결해야 현황을 확인할 수 있습니다.':'선택한 조건에 해당하는 신청 내역이 없습니다.'}</p>}</div>
 <details><summary>처리 현황 자세히 보기</summary><div className="material-table"><table><thead><tr>{['자료 구분','업무','처리 현황','진행상태','신청 내역'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{result.states.map((s,i)=><tr key={i}><td>{bookLabels[s.book]}</td><td>{s.unit}</td><td>{label(s.status)}</td><td>{label(s.stage)}</td><td>{s.count}건</td></tr>)}</tbody></table></div></details>
 <div className="material-table" tabIndex={0} aria-label="연도별 신청 목록"><table><thead><tr>{['업무','신청 이름','신청일','처리 현황','진행상태','담당자','원본 보기'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{listed.slice(page*50,(page+1)*50).map(r=><tr key={r.id}><td>{bookLabels[r.book]}<br/>{r.unit} · {r.region}</td><td>{r.title}</td><td>{label(r.apply_date)}</td><td>{label(r.raw_status)}</td><td>{label(r.stage)}</td><td>{label(r.owner)}</td><td><button onClick={()=>onSource?onSource(r.source_sheet,r.source_row):setDetail(r)}>원본 보기</button></td></tr>)}</tbody></table></div>
 <div className="document-nav"><button disabled={!page} onClick={()=>setPage(page-1)}>이전 목록</button><span>{result.rows.length?`${page*50+1}–${Math.min((page+1)*50,result.rows.length)}`:'0'} / {result.rows.length}건</span><button disabled={(page+1)*50>=result.rows.length} onClick={()=>setPage(page+1)}>다음 목록</button></div>
 {detail&&<aside className="progress-detail"><strong>{detail.title}</strong><p>{data.files.find(f=>f.id===data.sheets.find(s=>s.name===detail.source_sheet)?.source_id)?.filename}<br/>시트 ‘{detail.source_sheet}’의 {detail.source_row}번째 줄 · 신청번호: {label(detail.source_key)}</p><a href="?view=materials">원본 자료 자세히 보기</a><button onClick={()=>setDetail(null)}>닫기</button></aside>}
 </>}
 </div>;
}
