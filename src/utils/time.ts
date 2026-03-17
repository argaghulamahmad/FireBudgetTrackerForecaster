function countWorkdays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    // Count Monday (1) to Friday (5)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

export function getTimeMetrics(frequency: 'Weekly' | 'Monthly' | 'Yearly', excludeWeekends?: boolean) {
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
    
    if (excludeWeekends) {
      // Count elapsed workdays this week
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (day - 1));
      weekStart.setHours(0, 0, 0, 0);
      elapsed = countWorkdays(weekStart, now);
      
      // Count total workdays in week
      total = 5;
      remainingDays = total - elapsed;
    }
  } else if (frequency === 'Monthly') {
    elapsed = now.getDate();
    total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    remainingDays = total - elapsed;
    periodName = 'month';
    
    if (excludeWeekends) {
      // Count elapsed workdays this month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      elapsed = countWorkdays(monthStart, now);
      
      // Count total workdays in month
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      total = countWorkdays(monthStart, monthEnd);
      remainingDays = total - elapsed;
    }
  } else if (frequency === 'Yearly') {
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    elapsed = Math.floor(diff / oneDay);
    total = ((now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0) ? 366 : 365;
    remainingDays = total - elapsed;
    periodName = 'year';
    
    if (excludeWeekends) {
      // Count elapsed workdays this year
      const yearStart = new Date(now.getFullYear(), 0, 1);
      elapsed = countWorkdays(yearStart, now);
      
      // Count total workdays in year
      const yearEnd = new Date(now.getFullYear(), 11, 31);
      total = countWorkdays(yearStart, yearEnd);
      remainingDays = total - elapsed;
    }
  }

  const percentage = (elapsed / total) * 100;

  return { elapsed, total, remainingDays, percentage, periodName };
}

export function getDailyAllowance(amount: number, frequency: 'Weekly' | 'Monthly' | 'Yearly', excludeWeekends?: boolean): number {
  const metrics = getTimeMetrics(frequency, excludeWeekends);
  const idealSpent = (amount * metrics.percentage) / 100;
  const remaining = amount - idealSpent;
  return metrics.remainingDays > 0 ? remaining / metrics.remainingDays : remaining;
}

export function getMaxSpendToday(amount: number, frequency: 'Weekly' | 'Monthly' | 'Yearly', excludeWeekends?: boolean): number {
  const dailyAllowance = getDailyAllowance(amount, frequency, excludeWeekends);
  return Math.max(0, dailyAllowance);
}
