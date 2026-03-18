import { memo, useMemo } from 'react';
import { Budget } from '../types';
import { Activity, CalendarDays, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '../utils/cn';
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
  // ── Memoized calculations ──────────────────────────────────────
  const { totalAmount, totalIdealSpent, totalDailyAllowance, totalForecasted, percentage } = useMemo(() => {
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

    const totalForecasted = totalAmount - totalIdealSpent;
    const percentage = totalAmount > 0 ? (totalIdealSpent / totalAmount) * 100 : 0;

    return { totalAmount, totalIdealSpent, totalDailyAllowance, totalForecasted, percentage };
  }, [budgets]);

  // ── Reconciliation calculations ────────────────────────────────
  const { reconciledBudgets, hasReconciliation, totalRealBalance, totalVariance, isSurplus } = useMemo(() => {
    const reconciledBudgets = budgets.filter(b => b.lastKnownBalance !== undefined);
    const hasReconciliation = reconciledBudgets.length > 0;
    const totalRealBalance = reconciledBudgets.reduce((sum, b) => sum + (b.lastKnownBalance ?? 0), 0);
    const totalVariance = hasReconciliation ? Math.round(totalRealBalance - totalForecasted) : null;
    const isSurplus = totalVariance !== null && totalVariance >= 0;
    return { reconciledBudgets, hasReconciliation, totalRealBalance, totalVariance, isSurplus };
  }, [budgets, totalForecasted]);

  // ── Shared status colours ──────────────────────────────────────
  const progressColor =
    percentage > 90 ? 'bg-rose-500' :
    percentage > 75 ? 'bg-amber-500' :
    'bg-emerald-500';

  const progressTextColor =
    percentage > 90 ? 'text-rose-500' :
    percentage > 75 ? 'text-amber-500' :
    'text-emerald-600';

  // ── Compact view ───────────────────────────────────────────────
  if (viewMode === 'compact') {
    return (
      <div className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-health-separator mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${progressColor}`} />
            <span className="text-[11px] font-semibold tracking-widest uppercase text-health-secondary">
              {t.totalHealth}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasReconciliation && totalVariance !== null && (
              <span className={cn(
                'inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full',
                isSurplus ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
              )}>
                {isSurplus
                  ? <TrendingUp className="w-2.5 h-2.5" strokeWidth={2} />
                  : <TrendingDown className="w-2.5 h-2.5" strokeWidth={2} />
                }
                {isSurplus ? '+' : ''}{formatCurrency(totalVariance, currency)}
              </span>
            )}
            <p className="font-display text-xl font-bold text-health-text">
              {formatCurrency(totalForecasted, currency)}
            </p>
          </div>
        </div>
        <div className="h-1.5 w-full bg-health-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${progressColor}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  // ── Detailed view ──────────────────────────────────────────────
  return (
    <div className="bg-white rounded-[32px] p-5 shadow-sm border border-health-separator mb-5">

      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] font-semibold tracking-widest uppercase text-health-secondary">
          {t.totalHealth}
        </span>
        {hasReconciliation && totalVariance !== null ? (
          <span className={cn(
            'inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full',
            isSurplus
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-600'
          )}>
            {isSurplus
              ? <TrendingUp className="w-3 h-3" strokeWidth={2} />
              : <TrendingDown className="w-3 h-3" strokeWidth={2} />
            }
            {isSurplus ? 'Surplus' : 'Deficit'}
          </span>
        ) : (
          <div className="bg-zinc-100 p-1.5 rounded-full">
            <Activity className="w-4 h-4 text-zinc-900" />
          </div>
        )}
      </div>

      {/* ── Hero number ── */}
      {hasReconciliation && totalVariance !== null ? (
        <>
          {/* Variance is the hero when reconciliation data exists */}
          <p className={cn(
            'font-display text-[44px] font-bold leading-tight tracking-tight mb-2',
            isSurplus ? 'text-emerald-600' : 'text-rose-500'
          )}>
            {isSurplus ? '+' : ''}{formatCurrency(totalVariance, currency)}
          </p>
          <p className="text-[13px] text-health-secondary mb-5">
            {isSurplus ? 'ahead of' : 'behind'} your{' '}
            <span className="font-medium text-health-text">{formatCurrency(totalForecasted, currency)}</span>{' '}
            forecast
          </p>
        </>
      ) : (
        <>
          {/* Forecasted remaining is the hero when no reconciliation */}
          <p className="font-display text-[44px] font-bold text-health-text leading-none tracking-tight">
            {formatCurrency(totalForecasted, currency)}
          </p>
          <p className="text-[13px] text-health-secondary mt-1.5 mb-5">{t.shouldBeRemaining}</p>
        </>
      )}

      {/* Progress bar — always shown */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] text-health-secondary">{t.forecastedSpent}</span>
          <span className={`text-[12px] font-semibold ${progressTextColor}`}>
            {Math.round(percentage)}%
          </span>
        </div>
        <div className="h-2 w-full bg-health-bg rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${progressColor}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Metric tiles — 3-col when reconciled, 2-col otherwise */}
      <div className={cn('grid gap-2.5', hasReconciliation ? 'grid-cols-3' : 'grid-cols-2')}>

        {/* Tile 1 — Total Forecasted */}
        <div className="bg-health-bg rounded-2xl p-3">
          <div className="flex items-center gap-1 mb-1.5">
            <TrendingDown className="w-3 h-3 text-health-secondary flex-shrink-0" />
            <span className="text-[9px] font-semibold tracking-wider uppercase text-health-secondary truncate">
              Forecast
            </span>
          </div>
          <p className={cn('font-display font-bold text-health-text leading-none', hasReconciliation ? 'text-sm' : 'text-lg')}>
            {formatCurrency(totalForecasted, currency)}
          </p>
        </div>

        {/* Tile 2 — Total Real Balance (only when reconciliation exists) */}
        {hasReconciliation && (
          <div className={cn(
            'rounded-2xl p-3',
            isSurplus ? 'bg-emerald-50' : 'bg-rose-50'
          )}>
            <div className="flex items-center gap-1 mb-1.5">
              <Wallet className={cn('w-3 h-3 flex-shrink-0', isSurplus ? 'text-emerald-600' : 'text-rose-500')} />
              <span className={cn(
                'text-[9px] font-semibold tracking-wider uppercase truncate',
                isSurplus ? 'text-emerald-700' : 'text-rose-600'
              )}>
                Real
              </span>
            </div>
            <p className={cn(
              'font-display text-[14px] font-bold leading-none',
              isSurplus ? 'text-emerald-700' : 'text-rose-600'
            )}>
              {formatCurrency(totalRealBalance, currency)}
            </p>
          </div>
        )}

        {/* Tile 3 — Daily Allowance */}
        <div className="bg-health-bg rounded-2xl p-3">
          <div className="flex items-center gap-1 mb-1.5">
            <CalendarDays className="w-3 h-3 text-indigo-500 flex-shrink-0" />
            <span className="text-[9px] font-semibold tracking-wider uppercase text-health-secondary truncate">
              {t.dailyAllowance}
            </span>
          </div>
          <p className={cn('font-display font-bold text-indigo-600 leading-none', hasReconciliation ? 'text-sm' : 'text-lg')}>
            {formatCurrency(totalDailyAllowance, currency)}
          </p>
        </div>
      </div>

      {/* Reconciliation footer */}
      {hasReconciliation && (
        <p className="text-[11px] text-health-secondary mt-3.5">
          <span className="font-semibold text-health-text">{reconciledBudgets.length}</span>
          {' '}of{' '}
          <span className="font-semibold text-health-text">{budgets.length}</span>
          {' '}budgets reconciled
        </p>
      )}
    </div>
  );
}

export const SummaryCard = memo(SummaryCardComponent);
