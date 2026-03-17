export function getTimeMetrics(frequency: 'Weekly' | 'Monthly' | 'Yearly') {
  const now = new Date();
  let elapsed = 0;
  let total = 1;
  let remainingDays = 0;
  let periodName = '';

  if (frequency === 'Weekly') {
    let day = now.getDay();
    if (day === 0) day = 7; // Sunday is 7
    elapsed = day;
    total = 7;
    remainingDays = total - elapsed;
    periodName = 'week';
  } else if (frequency === 'Monthly') {
    elapsed = now.getDate();
    total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    remainingDays = total - elapsed;
    periodName = 'month';
  } else if (frequency === 'Yearly') {
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    elapsed = Math.floor(diff / oneDay);
    total = ((now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0) ? 366 : 365;
    remainingDays = total - elapsed;
    periodName = 'year';
  }

  const percentage = (elapsed / total) * 100;

  return { elapsed, total, remainingDays, percentage, periodName };
}
