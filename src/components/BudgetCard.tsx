import { memo } from 'react';
import { Budget } from '../types';
import { Trash2, Clock, Pencil, CalendarDays } from 'lucide-react';
import { cn } from '../utils/cn';
import { Currency, formatCurrency } from '../utils/currency';
import { TranslationKeys } from '../utils/i18n';
import { getTimeMetrics, getMaxSpendToday } from '../utils/time';

interface BudgetCardProps {
  budget: Budget;
  currency: Currency;
  t: Record<TranslationKeys, string>;
  onDelete: (id: string) => void;
  onEdit: (budget: Budget) => void;
  viewMode?: 'compact' | 'detailed';
}

function BudgetCardComponent({ budget, currency, t, onDelete, onEdit, viewMode = 'detailed' }: BudgetCardProps) {
  const metrics = getTimeMetrics(budget.frequency, budget.excludeWeekends);
  const idealSpent = (budget.amount * metrics.percentage) / 100;
  const remaining = budget.amount - idealSpent;
  const dailyAllowance = metrics.remainingDays > 0 ? remaining / metrics.remainingDays : remaining;
  const maxSpendToday = getMaxSpendToday(budget.amount, budget.frequency, budget.excludeWeekends);

  const statusColor =
    metrics.percentage > 90 ? 'bg-rose-500' :
    metrics.percentage > 75 ? 'bg-amber-500' :
    'bg-emerald-500';

  const statusTextColor =
    metrics.percentage > 90 ? 'text-rose-500' :
    metrics.percentage > 75 ? 'text-amber-500' :
    'text-emerald-600';

  const getFrequencyLabel = (freq: string) => {
    if (freq === 'Weekly') return t.weekly;
    if (freq === 'Monthly') return t.monthly;
    if (freq === 'Yearly') return t.yearly;
    return freq;
  };

  if (viewMode === 'compact') {
    return (
      <div className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-health-separator mb-2.5 group flex items-center gap-3">
        {/* Status dot */}
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColor}`} />

        {/* Name + progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[13px] font-semibold text-health-text truncate pr-2">{budget.name}</span>
            <span className="font-display text-[13px] font-bold text-health-text flex-shrink-0">
              {formatCurrency(remaining, currency)}
            </span>
          </div>
          <div className="h-1.5 w-full bg-health-bg rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', statusColor)}
              style={{ width: `${Math.min(metrics.percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1">
          <button
            type="button"
            aria-label={t.editBudget}
            onClick={() => onEdit(budget)}
            className="p-1.5 rounded-lg text-health-tertiary hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label={t.delete}
            onClick={() => onDelete(budget.id)}
            className="p-1.5 rounded-lg text-health-tertiary hover:text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-health-separator mb-4 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-[11px] font-semibold tracking-widest uppercase text-health-secondary">
            {budget.name}
          </span>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[11px] font-medium text-health-secondary bg-health-bg px-2 py-0.5 rounded-full">
              {getFrequencyLabel(budget.frequency)}
            </span>
            {budget.excludeWeekends && (
              <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                Workdays
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            aria-label={t.editBudget}
            onClick={() => onEdit(budget)}
            className="p-2 rounded-xl text-health-tertiary hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label={t.delete}
            onClick={() => onDelete(budget.id)}
            className="p-2 rounded-xl text-health-tertiary hover:text-rose-500 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero remaining number */}
      <p className="font-display text-[40px] font-bold text-health-text leading-none tracking-tight">
        {formatCurrency(remaining, currency)}
      </p>
      <p className="text-[13px] text-health-secondary mt-1.5">
        {t.remainingBalance} · <span className="text-health-text font-medium">{formatCurrency(budget.amount, currency)}</span>
      </p>

      {/* Progress bar */}
      <div className="mt-4 mb-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] text-health-secondary">{t.forecastedSpent}</span>
          <span className={`text-[12px] font-semibold ${statusTextColor}`}>
            {Math.round(metrics.percentage)}%
          </span>
        </div>
        <div className="h-2 w-full bg-health-bg rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', statusColor)}
            style={{ width: `${Math.min(metrics.percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-health-bg rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-semibold tracking-wider uppercase text-health-secondary">
              {t.dailyAllowance}
            </span>
          </div>
          <p className="font-display text-[18px] font-bold text-indigo-600 leading-none">
            {formatCurrency(dailyAllowance, currency)}
          </p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-600">
              {t.maxToSpendToday}
            </span>
          </div>
          <p className="font-display text-[18px] font-bold text-amber-600 leading-none">
            {formatCurrency(maxSpendToday, currency)}
          </p>
        </div>
      </div>

      {/* Days remaining badge */}
      <div className="mt-3 flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
        <span className="text-[12px] text-health-secondary">
          <span className="font-semibold text-health-text">{metrics.remainingDays}</span>{' '}
          {budget.excludeWeekends ? t.workdaysRemaining : t.daysRemaining}{' '}
          {t[metrics.periodName as TranslationKeys] || metrics.periodName}
        </span>
      </div>
    </div>
  );
}

export const BudgetCard = memo(BudgetCardComponent);
