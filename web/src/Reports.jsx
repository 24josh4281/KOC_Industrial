import React from 'react';
import DesignControls,{useDesign} from './DesignControls.jsx';
import manual from '../../docs/manual.json';
import catalog from '../../data/public/catalog.json';
import {publicInsights} from './insights.mjs';
import './public-insights.css';
import './design-system.css';
export default function Reports({type}){
 const design=useDesign(),s=publicInsights(catalog),isManual=type==='manual';
 const table=(headers,rows)=><div className="table-wrap" tabIndex={0}><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table></div>;
 return <div className="dashboard public-dashboard readable-dashboard" data-design={design.profile} style={design.style}><main className="shell report-content"><header className="page-header"><div><small className="eyebrow">KOC INDUSTRIAL / {catalog.captured_on}</small><h1>{isManual?manual.title:'공개 방법론 인사이트 보고서'}</h1><p>{isManual?'데이터 해석부터 근거 확인·엑셀 활용까지':'선택한 공개 포트폴리오의 구조와 변경 흐름'}</p></div></header><DesignControls settings={design}/><nav className="document-nav"><a className="button" href="?view=public">대시보드</a><a className="button" href="?view=insights">인사이트 보고서</a><a className="button" href="?view=manual">사용 설명서</a><button onClick={()=>window.print()}>인쇄·PDF 저장</button>{isManual&&<a className="button primary" href="./downloads/KETS_Dashboard_Manual_20261014.pdf" download>설명서 PDF ↓</a>}</nav>
 {isManual?manual.sections.map(x=><section className="panel" key={x.title}><h2>{x.title}</h2>{x.paragraphs?.map(p=><p key={p}>{p}</p>)}{x.steps&&<ol>{x.steps.map(p=><li key={p}>{p}</li>)}</ol>}{x.table&&table(x.table.headers,x.table.rows)}</section>):<>
 <section className="panel"><h2>1. 핵심 판단</h2><p>{catalog.scope_note}</p>{table(['확인된 사실','수치','판단에 활용할 점'],[['고유 방법론 / 버전',`${s.metrics.methods} / ${s.metrics.versions}`,'방법론과 버전을 따로 관리'],['개정 경험',`${s.metrics.revised_methods}방법론 · ${s.metrics.revision_share}%`,'개정 이력이 있는 대상의 문서 버전 점검'],['상위 3개 분야 비중',`${s.metrics.top3_share}%`,'수집 포트폴리오의 분야 편중 확인'],['최근 365일 변경',`${s.metrics.recent_versions}버전`,'변경 내용·적용조건 원문 확인'],['최신 버전 경과 3년 초과',`${s.metrics.watch_methods}방법론`,'현행 문서 점검 후보. 효력 판단 아님']])}<p>해석: 선택 포트폴리오의 분야 구성이 집중되어 있고, 개정 대응과 문서 최신성 확인을 우선 작업으로 삼을 수 있습니다. 이 수치만으로 제도 전체의 성장·정체나 방법론의 유효성을 평가하지 않습니다.</p></section>
 <section className="panel"><h2>2. 현재 등록 목록의 구조</h2>{table(['공개 분야','고유 방법론','구성비'],s.sectors.map(r=>[r.name,r.count,`${r.share}%`]))}<p>분야는 수집 시점 공개 분류입니다. 분야 비중은 사업 신청량, 감축량, 시장 수요를 나타내지 않습니다. 적용 검토 시 해당 방법론의 공식 원문과 개정 내용을 별도로 확인합니다.</p>{table(['등록형태','방법론','구성비'],s.registration.map(r=>[r.name,r.count,`${r.share}%`]))}</section>
 <section className="panel"><h2>3. 연도별 변화와 비교</h2>{table(['유효시작 연도','최초 버전','개정 버전','누적 방법론'],s.annual.map(r=>[r.year,r.new,r.revisions,r.cumulative_methods]))}<p>{s.comparison.end}까지 {s.comparison.current}버전, 전년 같은 기간 {s.comparison.previous}버전으로 {s.comparison.delta}버전 차이입니다. 작은 확인 표본의 변화이며 산업부문 전체 추세로 일반화하지 않습니다. 유효시작일을 최초등록일로 대체하지 않았습니다.</p></section>
 <section className="panel"><h2>4. 의사결정과 자료 확보 우선순위</h2><ol><li>최근 변경 목록에서 개정 원문을 확인하고 사내 적용 문서의 버전을 대조합니다.</li><li>개정 경험·분야·등록형태를 교차 조회해 담당자별 검토 목록을 만듭니다.</li><li>최신 버전 경과일은 문서 점검 순서를 정하는 참고값으로 사용합니다. 자동 폐기·만료 판단을 하지 않습니다.</li><li>현재 신청·검토 단계·확정 제출기한을 확보하고 원본 간 불일치를 해소한 뒤 진행 현황과 기한 알림을 연결합니다.</li></ol><p>공개자료 미확보: 진행 중 신청 수, 검토 중 수, 보완 초과, 승인율, 심사 소요기간. 내부 자료의 검토 결과는 별도 로컬 보고서에서 확인합니다.</p></section>
 <section className="panel"><h2>5. 출처·한계·재현</h2><p>확인일 {catalog.captured_on}. 출처는 <a href={catalog.source_url} target="_blank" rel="noreferrer">ORS 공식 공개 목록</a>과 코드별 공개 이력입니다. 대시보드 원장 표에서 각 이력으로 이동할 수 있습니다. 결과는 공개 확인본을 기준으로 재현하며 실시간 데이터가 아닙니다.</p><p>공개 신청·내부 업무 원장은 이 보고서에 포함하지 않았습니다. Python·웹은 같은 지표 정의를 사용하고 엑셀은 같은 조건으로 별도 재계산합니다.</p></section></>}
 <footer>정부·한국에너지공단 공식 서비스가 아닌 독립 검토 도구 · 개인정보·내부 원장 미포함</footer></main></div>;
}

