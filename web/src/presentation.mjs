export function displayValue(value, fallback = '—') {
  return value === null || value === undefined || value === '' ? fallback : value;
}

export function coverageLabel(value) {
  return ({missing: '자료 미확보', partial: '확인된 일부 자료', complete: '대상 범위 확보', demo: '합성 예시'})[value] ?? '범위 미확인';
}

export function applicabilityLabel(value) {
  return ({active:'적용 가능 확인',inactive:'적용 불가',unknown:'적용 상태 미확인'})[value] ?? displayValue(value);
}
