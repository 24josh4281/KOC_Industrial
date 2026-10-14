// These indicators inspect calculation cells; they are not business counts.
export const unavailableResult = '기준 미확인';
export function brokenReference(formula) {
  return String(formula || '').replace(/"(?:[^"]|"")*"/g, '').toUpperCase().includes('#REF!');
}
export function formulaQuality(data) {
  const cells = (data.sheets || []).flatMap(s => (s.rows || []).flatMap(r => r.cells));
  return {
    saved_errors: cells.filter(c => c.error).length,
    broken_references: cells.filter(c => brokenReference(c.formula)).length,
    unavailable_results: cells.filter(c => c.value === unavailableResult).length,
  };
}
