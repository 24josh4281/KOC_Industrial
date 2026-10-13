// Calendar-day reminders for currently waiting review applications.
export function deadlineAlerts(snapshot, withinDays=7) {
  if (!Number.isInteger(withinDays) || withinDays < 0) throw Error('알림 일수는 0 이상의 정수여야 합니다.');
  if (snapshot.metadata.coverage.reviews === 'missing') return {rows:[], overdue:null, today:null, upcoming:null, unknown:null};
  const day = value => Date.parse(value + 'T00:00:00Z') / 86400000;
  const asOf = day(snapshot.metadata.as_of);
  const rows = snapshot.application_rows.filter(a => a.is_reviewing && a.waiting).map(a => {
    const days = a.due_on ? day(a.due_on) - asOf : null;
    return {id:a.id,title:a.title,owner:a.owner || '',due_on:a.due_on,days_remaining:days,
      status:days === null ? 'unknown' : days < 0 ? 'overdue' : days === 0 ? 'today' : 'upcoming',
      next_action:a.next_action || ''};
  }).filter(a => a.days_remaining === null || a.days_remaining <= withinDays)
    .sort((a,b)=>(a.days_remaining ?? Infinity)-(b.days_remaining ?? Infinity));
  const count = status => rows.filter(a => a.status === status).length;
  return {rows,overdue:count('overdue'),today:count('today'),upcoming:count('upcoming'),unknown:count('unknown')};
}
export const deadlineLabel = row => row.days_remaining === null ? '기한 미확인' : row.days_remaining < 0 ? Math.abs(row.days_remaining)+'일 초과' : row.days_remaining === 0 ? '오늘 마감' : 'D-'+row.days_remaining;
