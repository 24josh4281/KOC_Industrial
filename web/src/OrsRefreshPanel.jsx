import React from 'react';
const labels={checked:'대조 완료',stale:'이전 자료 · 유지',date_unknown:'자료 날짜 확인 필요',future_date:'미래 날짜 · 보류',target_missing:'연결 시트 미확보',key_header_missing:'식별 열 확인 필요',unsupported:'미지원 양식',duplicate_file:'중복 파일 · 제외'};
const reason={missing_identity:'식별값 미확보',duplicate_identity:'식별값 중복',new_or_unmatched:'신규·연결 확인 필요',blank_does_not_clear:'공란 · 기존값 유지',formula_like_value:'수식 형태 입력 · 보류',conflicting_exports:'자료 간 불일치',older_record_date:'과거 처리일 · 유지',non_status_change_review:'수량·기본정보 변경 검토'};
export default function OrsRefreshPanel({refresh}){
 if(!refresh)return null;
 const s=refresh.summary;
 return <section className="panel" aria-label="ORS 자동 반영 결과"><div className="page-header"><div><small className="eyebrow">ORS → EXCEL → DASHBOARD</small><h2>ORS 연동 현황</h2><p>검증 완료 시각 {refresh.run_at.replace('T',' ')} · 원본 파일을 넣고 갱신 프로그램을 실행하면 엑셀과 이 화면을 함께 생성합니다.</p></div></div>
 <div className="material-summary">{[['수신 파일',s.source_files,'다운로드 파일 기준'],['적용한 ORS 셀',s.updated_cells,'상태·처리일·이력'],['검토 보류 항목',s.pending_rows,'수량 변경·신규 연결 등'],['이전 자료 연결',s.stale_file_targets,'파일과 대상 시트 조합']].map(([label,value,note])=><div key={label}>{label}<strong>{value.toLocaleString()}</strong><small>{note}</small></div>)}</div>
 <p className="local-notice">담당자·내부 단계·메모·기존 보류는 유지합니다. 새 신청은 연결 확인 전까지 업무 건수에 합산하지 않습니다. 사이트 직접 수집이나 실시간 동기화는 연결하지 않았습니다.</p>
 <details><summary>원본 파일과 연결 결과 보기</summary><div className="material-table" tabIndex={0}><table><thead><tr>{['ORS 파일','자료 날짜','연결 시트','결과','일치 행','적용 셀'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{refresh.files.map((f,i)=><tr key={i}><td>{f.filename}</td><td>{f.source_date||'미확보'}</td><td>{f.book==='management'?'외부사업 관리':f.book==='disclosure'?'정보비공개 관리':''}<br/>{f.target_sheet||'미연결'}</td><td>{labels[f.status]||f.status}</td><td>{f.status==='checked'?f.matched:'미검사'}</td><td>{f.updated_cells}</td></tr>)}</tbody></table></div></details>
 {refresh.pending.length>0&&<details><summary>검토 보류 항목 {refresh.pending.length.toLocaleString()}개</summary><div className="material-table" tabIndex={0}><table><thead><tr><th>원본 파일</th><th>원본 행</th><th>연결 시트</th><th>보류 이유</th></tr></thead><tbody>{refresh.pending.slice(0,100).map((p,i)=><tr key={i}><td>{p.file}</td><td>{p.source_row}</td><td>{p.sheet}</td><td>{reason[p.reason]||p.reason}</td></tr>)}</tbody></table></div><p>처음 100개를 표시합니다. 전체 내용은 같은 결과 폴더의 refresh-plan.json에 있습니다.</p></details>}
 </section>;
}
