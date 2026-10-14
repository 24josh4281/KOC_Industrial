import React,{useMemo} from 'react';
import {sourceCoverage} from './materials.mjs';

const total=(items,key)=>items.reduce((sum,item)=>sum+item[key],0);
const number=value=>value.toLocaleString('ko-KR');

export default function CoverageOverview({data,onInventory}){
 const files=useMemo(()=>sourceCoverage(data),[data]);
 const tools=files.filter(file=>file.format==='xlsx'),exports=files.filter(file=>file.format==='xls');
 const pending=total(files,'unavailable');
 return <section className="panel source-coverage" aria-labelledby="source-coverage-title">
  <div className="source-coverage-head"><div><small className="eyebrow">SOURCE COVERAGE / LOCAL REVIEW</small><h2 id="source-coverage-title">자료 반영 범위</h2><p>원본 파일과 셀을 빠짐없이 찾을 수 있도록 자료 단위로 표시합니다. 아래 수치는 원장 크기이며 공식 신청·등록 건수가 아닙니다.</p></div><button onClick={onInventory}>{number(total(files,'sheets'))}개 시트 목록 보기</button></div>
  <div className="coverage-metrics">
   <div><span>관리 Tool</span><strong>{number(tools.length)}개 파일</strong><small>{number(total(tools,'sheets'))}개 원본 시트 · Excel과 웹에서 조회</small></div>
   <div><span>관리 Tool 셀</span><strong>{number(total(tools,'cells'))}셀</strong><small>값·수식·원본 행/열 위치 포함</small></div>
   <div><span>다운로드 ORS 원본</span><strong>{number(exports.length)}개 파일</strong><small>원본 자료 탐색에 별도 보관</small></div>
   <div className={pending?'coverage-pending':''}><span>계산 기준 확인 필요</span><strong>{number(pending)}셀</strong><small>{pending?'근거 확보 전까지 수치로 사용하지 않음':'기준 미확인 표시 없음'}</small></div>
  </div>
  <details className="coverage-detail"><summary>파일별 시트·행·셀 대조 범위 보기</summary><div className="material-table" tabIndex={0}><table><caption>원본 파일별 보존 규모 · 행은 중복 원장과 통계 시트를 포함</caption><thead><tr><th>자료</th><th>파일</th><th>시트</th><th>기록 행</th><th>셀</th><th>수식</th><th>기준 미확인</th></tr></thead><tbody>{files.map(file=><tr key={file.id}><td>{file.format==='xlsx'?'관리 Tool':'ORS 다운로드'}</td><td>{file.filename}</td><td>{number(file.sheets)}</td><td>{number(file.rows)}</td><td>{number(file.cells)}</td><td>{number(file.formulas)}</td><td>{file.unavailable?number(file.unavailable):'없음'}</td></tr>)}</tbody></table></div></details>
  <p className="source-meta">Excel은 관리 Tool의 원본 시트를 보존합니다. ORS 다운로드 파일은 로컬 JSON의 별도 원본 자료로 조회합니다. 원본과 새 파일의 셀 단위 일치 여부는 검증 기록에서 확인합니다.</p>
 </section>;
}
