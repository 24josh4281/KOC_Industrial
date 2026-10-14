import React,{useMemo} from 'react';
import {formulaQuality} from './formulaHealth.mjs';

export default function FormulaQualityPanel({data}) {
  const q = useMemo(() => formulaQuality(data), [data]);
  if (!q.broken_references && !q.unavailable_results) return null;
  return <section className="panel" aria-label="계산 확인 필요">
    <h2>계산 확인 필요</h2>
    <p>끊어진 참조 <strong>{q.broken_references.toLocaleString()}셀</strong> · 기준 미확인 <strong>{q.unavailable_results.toLocaleString()}셀</strong></p>
    <p>기준 미확인은 삭제된 참조나 확인되지 않은 집계 기준 때문에 계산을 보류한 값입니다. 0건이나 복구 완료를 뜻하지 않습니다. 연결 합계도 함께 보류합니다.</p>
    <p className="source-meta">원본 행 탐색에서 ‘기준 미확인’을 검색하면 해당 위치를 확인할 수 있습니다. 수식 오류가 0이어도 계산 기준 확인은 남을 수 있습니다.</p>
  </section>;
}
