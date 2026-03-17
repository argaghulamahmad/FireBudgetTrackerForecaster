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

  const getFrequencyLabel = (freq: string) => {
    if (freq === 'Weekly') return t.weekly;
    if (freq === 'Monthly') return t.monthly;
    if (freq === 'Yearly') return t.yearly;
    return freq;
  };

  if (viewMode === 'compact') {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-3 relative group flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="text-base font-semibold text-gray-900">{budget.name}</h3>
            <span className="text-xs text-gray-500">{getFrequencyLabel(budget.frequency)}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{formatCurrency(remaining, currency)}</p>
              <p className="text-xs text-gray-500">{t.remainingBalance}</p>
            </div>
            <div className="flex gap-1 ml-2">
              <button
                onClick={() => onEdit(budget)}
                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(budget.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              metrics.percentage > 90 ? 'bg-red-500' : metrics.percentage > 75 ? 'bg-orange-500' : 'bg-blue-500'
            )}
            style={{ width: `${Math.min(metrics.percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4 relative group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{budget.name}</h3>
          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md mt-1">
            {getFrequencyLabel(budget.frequency)}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(budget)}
            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(budget.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-blue-600 font-medium mb-4 bg-blue-50 w-fit px-2 py-1 rounded-md">
        <Clock className="w-3 h-3" />
        {metrics.remainingDays} {budget.excludeWeekends ? t.workdaysRemaining : t.daysRemaining} {t[metrics.periodName as TranslationKeys] || metrics.periodName}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            <p className="text-xs font-medium text-gray-500">{t.dailyAllowance}</p>
          </div>
          <p className="text-lg font-bold text-indigo-700">{formatCurrency(dailyAllowance, currency)}</p>
        </div>
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-medium text-amber-700">{t.maxToSpendToday}</p>
          </div>
          <p className="text-lg font-bold text-amber-600">{formatCurrency(maxSpendToday, currency)}</p>
        </div>
      </div>

      <div className="flex justify-between items-end mb-2">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">{t.remainingBalance}</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(remaining, currency)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-gray-500 mb-1">{t.forecastedSpent}</p>
          <p className="text-sm font-semibold text-gray-700">{formatCurrency(idealSpent, currency)} / {formatCurrency(budget.amount, currency)}</p>
        </div>
      </div>

      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            metrics.percentage > 90 ? 'bg-red-500' : metrics.percentage > 75 ? 'bg-orange-500' : 'bg-blue-500'
          )}
          style={{ width: `${Math.min(metrics.percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

export const BudgetCard = memo(BudgetCardComponent);
