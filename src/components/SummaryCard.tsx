import { memo } from 'react';
import { Budget } from '../types';
import { Activity, CalendarDays, TrendingDown } from 'lucide-react';
import { Currency, formatCurrency } from '../utils/currency';
import { TranslationKeys } from '../utils/i18n';
import { getTimeMetrics } from '../utils/time';

interface SummaryCardProps {
  budgets: Budget[];
  currency: Currency;
  t: Record<TranslationKeys, string>;
  viewMode?: 'compact' | 'detailed';
}

function SummaryCardComponent({ budgets, currency, t, viewMode = 'detailed' }: SummaryCardProps) {
  let totalAmount = 0;
  let totalIdealSpent = 0;
  let totalDailyAllowance = 0;

  budgets.forEach(b => {
    const metrics = getTimeMetrics(b.frequency, b.excludeWeekends);
    totalAmount += b.amount;
    const idealSpent = (b.amount * metrics.percentage) / 100;
    totalIdealSpent += idealSpent;
    const remaining = b.amount - idealSpent;
    totalDailyAllowance += metrics.remainingDays > 0 ? remaining / metrics.remainingDays : remaining;
  });

  const totalRemaining = totalAmount - totalIdealSpent;
  const percentage = totalAmount > 0 ? (totalIdealSpent / totalAmount) * 100 : 0;

  const statusColor =
    percentage > 90 ? 'bg-rose-500' :
    percentage > 75 ? 'bg-amber-500' :
    'bg-emerald-500';

  const statusTextColor =
    percentage > 90 ? 'text-rose-500' :
    percentage > 75 ? 'text-amber-500' :
    'text-emerald-600';

  if (viewMode === 'compact') {
    return (
      <div className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-health-separator mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
            <span className="text-[11px] font-semibold tracking-widest uppercase text-health-secondary">
              {t.totalHealth}
            </span>
          </div>
          <p className="font-display text-xl font-bold text-health-text">
            {formatCurrency(totalRemaining, currency)}
          </p>
        </div>
        <div className="h-1.5 w-full bg-health-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${statusColor}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-health-separator mb-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold tracking-widest uppercase text-health-secondary">
          {t.totalHealth}
        </span>
        <div className="bg-indigo-50 p-1.5 rounded-full">
          <Activity className="w-4 h-4 text-indigo-600" />
        </div>
      </div>

      {/* Hero number */}
      <p className="font-display text-[44px] font-bold text-health-text leading-none tracking-tight">
        {formatCurrency(totalRemaining, currency)}
      </p>
      <p className="text-[13px] text-health-secondary mt-1.5 mb-4">{t.shouldBeRemaining}</p>

      {/* Progress bar */}
      <div className="mb-1">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] text-health-secondary">{t.forecastedSpent}</span>
          <span className={`text-[12px] font-semibold ${statusTextColor}`}>
            {Math.round(percentage)}%
          </span>
        </div>
        <div className="h-2 w-full bg-health-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${statusColor}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Metric pills */}
      <div className="grid grid-cols-2 gap-2.5 mt-4">
        <div className="bg-health-bg rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-semibold tracking-wider uppercase text-health-secondary">
              {t.dailyAllowance}
            </span>
          </div>
          <p className="font-display text-[18px] font-bold text-indigo-600 leading-none">
            {formatCurrency(totalDailyAllowance, currency)}
          </p>
        </div>
        <div className="bg-health-bg rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-health-secondary" />
            <span className="text-[10px] font-semibold tracking-wider uppercase text-health-secondary">
              {t.total}
            </span>
          </div>
          <p className="font-display text-[18px] font-bold text-health-text leading-none">
            {formatCurrency(totalAmount, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}

export const SummaryCard = memo(SummaryCardComponent);
