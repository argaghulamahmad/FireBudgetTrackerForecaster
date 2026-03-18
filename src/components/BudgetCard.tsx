import { memo, useState, useRef, useEffect } from 'react';
import { Budget } from '../types';
import { Trash2, Pencil, CalendarDays, Plus, Check, X, Wallet, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { cn } from '../utils/cn';
import { Currency, formatCurrency, getCurrencySymbol, formatCurrencyInput, parseCurrencyInput } from '../utils/currency';
import { TranslationKeys } from '../utils/i18n';
import { getTimeMetrics } from '../utils/time';

interface BudgetCardProps {
  budget: Budget;
  currency: Currency;
  t: Record<TranslationKeys, string>;
  onDelete: (id: string) => void;
  onEdit: (budget: Budget) => void;
  onUpdateBalance: (id: string, balance: number) => Promise<void>;
  viewMode?: 'compact' | 'detailed';
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function BudgetCardComponent({ budget, currency, t, onDelete, onEdit, onUpdateBalance, viewMode = 'detailed' }: BudgetCardProps) {
  const metrics = getTimeMetrics(budget.frequency, budget.excludeWeekends);
  const idealSpent = (budget.amount * metrics.percentage) / 100;
  const remaining = budget.amount - idealSpent;
  const dailyAllowance = metrics.remainingDays > 0 ? remaining / metrics.remainingDays : remaining;
  const actualSpent = budget.lastKnownBalance !== undefined ? budget.amount - budget.lastKnownBalance : null;
  const isOverspending = actualSpent !== null && actualSpent > idealSpent;

  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false);
  const [quickInput, setQuickInput] = useState('');
  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isQuickEditOpen) {
      setQuickInput(
        budget.lastKnownBalance !== undefined
          ? formatCurrencyInput(budget.lastKnownBalance.toString(), currency)
          : ''
      );
      setTimeout(() => quickInputRef.current?.focus(), 50);
    }
  }, [isQuickEditOpen, budget.lastKnownBalance, currency]);

  const handleQuickSave = async () => {
    const parsed = parseCurrencyInput(quickInput, currency);
    if (parsed === null || isNaN(parsed)) return;
    setIsQuickSaving(true);
    try {
      await onUpdateBalance(budget.id, parsed);
      setIsQuickEditOpen(false);
      setQuickInput('');
    } finally {
      setIsQuickSaving(false);
    }
  };

  const variance =
    budget.lastKnownBalance !== undefined
      ? budget.lastKnownBalance - remaining
      : null;

  const isSurplus = variance !== null && variance >= 0;

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

  const handleSaveBalance = async () => {
    const numericBalance = parseCurrencyInput(balanceInput, currency);
    if (numericBalance === null || isNaN(numericBalance)) return;
    setIsSaving(true);
    try {
      await onUpdateBalance(budget.id, numericBalance);
      setIsEditingBalance(false);
      setBalanceInput('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditBalance = () => {
    setBalanceInput(
      budget.lastKnownBalance !== undefined
        ? formatCurrencyInput(budget.lastKnownBalance.toString(), currency)
        : ''
    );
    setIsEditingBalance(true);
  };

  if (viewMode === 'compact') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-health-separator mb-2.5 overflow-hidden">
        {/* Main row */}
        <div className="px-4 py-3 flex items-center gap-3 group">
          {/* Budget cycle status dot */}
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />

          {/* Name + surplus/deficit indicator */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[13px] font-semibold text-health-text truncate">{budget.name}</span>
              {variance !== null && (
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  isSurplus ? 'bg-emerald-500' : 'bg-rose-500'
                )} />
              )}
            </div>
            <div className="h-1.5 w-full bg-health-bg rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700', statusColor)}
                style={{ width: `${Math.min(metrics.percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Remaining + variance badge */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {variance !== null && (
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                isSurplus ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
              )}>
                {isSurplus ? '+' : ''}{formatCurrency(variance, currency)}
              </span>
            )}
            <span className="font-display text-[13px] font-bold text-health-text">
              {formatCurrency(remaining, currency)}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Wallet — always visible */}
            <button
              type="button"
              aria-label="Quick update balance"
              onClick={() => setIsQuickEditOpen(v => !v)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                isQuickEditOpen
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-health-tertiary hover:text-indigo-500 hover:bg-indigo-50'
              )}
            >
              <Wallet className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Inline quick-balance editor */}
        {isQuickEditOpen && (
          <div className="px-4 pb-3 pt-0 border-t border-health-separator/60 bg-slate-50/60">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-health-secondary mt-2.5 mb-2">
              Real Balance
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-white border border-health-separator rounded-xl overflow-hidden focus-within:border-indigo-300 focus-within:ring-1 focus-within:ring-indigo-100 transition-all">
                <span className="pl-3 text-[13px] text-health-secondary flex-shrink-0">
                  {getCurrencySymbol(currency)}
                </span>
                <input
                  ref={quickInputRef}
                  type="text"
                  inputMode="decimal"
                  value={quickInput}
                  onChange={e => setQuickInput(formatCurrencyInput(e.target.value, currency))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleQuickSave();
                    if (e.key === 'Escape') { setIsQuickEditOpen(false); setQuickInput(''); }
                  }}
                  placeholder="0.00"
                  className="w-full py-2 px-2 bg-transparent outline-none text-[14px] font-medium text-health-text"
                />
              </div>
              <button
                type="button"
                onClick={handleQuickSave}
                disabled={isQuickSaving || !quickInput}
                aria-label="Save balance"
                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isQuickSaving
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Check className="w-4 h-4" />
                }
              </button>
              <button
                type="button"
                onClick={() => { setIsQuickEditOpen(false); setQuickInput(''); }}
                aria-label="Cancel"
                className="p-2 bg-health-bg text-health-secondary rounded-xl hover:bg-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {variance !== null && (
              <p className={cn(
                'text-[11px] font-medium mt-2',
                isSurplus ? 'text-emerald-600' : 'text-rose-500'
              )}>
                <span className="inline-flex items-center gap-0.5">
                  {isSurplus
                    ? <TrendingUp className="w-3 h-3" strokeWidth={2} />
                    : <TrendingDown className="w-3 h-3" strokeWidth={2} />
                  }
                  {isSurplus ? 'Surplus' : 'Deficit'}
                </span>
                {' · '}{formatCurrency(Math.abs(variance), currency)} vs. forecast
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] p-5 shadow-sm border border-health-separator mb-4 group">
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
        Of <span className="text-health-text font-medium">{formatCurrency(budget.amount, currency)}</span> total
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
        <div className={cn(
          'rounded-2xl p-3.5',
          actualSpent !== null
            ? isOverspending ? 'bg-rose-50' : 'bg-emerald-50'
            : 'bg-health-bg'
        )}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className={cn('w-3.5 h-3.5',
              actualSpent !== null
                ? isOverspending ? 'text-rose-500' : 'text-emerald-500'
                : 'text-health-secondary'
            )} strokeWidth={2} />
            <span className={cn('text-[10px] font-semibold tracking-wider uppercase',
              actualSpent !== null
                ? isOverspending ? 'text-rose-600' : 'text-emerald-600'
                : 'text-health-secondary'
            )}>
              Should Have Spent
            </span>
          </div>
          <p className="font-display text-[18px] font-bold text-health-text leading-none">
            {formatCurrency(idealSpent, currency)}
          </p>
          {actualSpent !== null && (
            <p className={cn('text-[11px] font-semibold mt-1.5',
              isOverspending ? 'text-rose-500' : 'text-emerald-600'
            )}>
              Actual: {formatCurrency(actualSpent, currency)}
            </p>
          )}
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

      {/* ── Real Balance Reconciliation ── */}
      <div className="mt-4 pt-4 border-t border-health-separator">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-health-secondary mb-2.5">
          Real Balance
        </p>

        {isEditingBalance ? (
          /* Input row */
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-health-bg border border-health-separator rounded-xl overflow-hidden focus-within:border-indigo-300 focus-within:ring-1 focus-within:ring-indigo-100 transition-all">
              <span className="pl-3 text-[13px] text-health-secondary flex-shrink-0">
                {getCurrencySymbol(currency)}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={balanceInput}
                onChange={(e) => setBalanceInput(formatCurrencyInput(e.target.value, currency))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBalance(); if (e.key === 'Escape') { setIsEditingBalance(false); setBalanceInput(''); } }}
                className="w-full py-2.5 px-2 bg-transparent outline-none text-[14px] font-medium text-health-text"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={handleSaveBalance}
              disabled={isSaving || !balanceInput}
              aria-label="Save balance"
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Check className="w-4 h-4" />
              }
            </button>
            <button
              type="button"
              onClick={() => { setIsEditingBalance(false); setBalanceInput(''); }}
              aria-label="Cancel"
              className="p-2.5 bg-health-bg text-health-secondary rounded-xl hover:bg-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : budget.lastKnownBalance !== undefined ? (
          /* Stored balance + variance */
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-[17px] font-bold text-health-text">
                  {formatCurrency(budget.lastKnownBalance, currency)}
                </span>
                {variance !== null && (
                  <span className={cn(
                    'text-[11px] font-bold px-2 py-0.5 rounded-full',
                    isSurplus
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-600'
                  )}>
                    <span className="inline-flex items-center gap-0.5">
                      {isSurplus
                        ? <TrendingUp className="w-2.5 h-2.5" strokeWidth={2} />
                        : <TrendingDown className="w-2.5 h-2.5" strokeWidth={2} />
                      }
                      {isSurplus ? '+' : ''}{formatCurrency(Math.abs(variance), currency)}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-health-secondary mt-0.5">
                {isSurplus ? 'Surplus vs. forecast' : 'Deficit vs. forecast'}
                {budget.lastKnownBalanceAt && (
                  <> · {formatTimeAgo(budget.lastKnownBalanceAt)}</>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleEditBalance}
              aria-label="Update real balance"
              className="p-2 rounded-xl text-health-tertiary hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Empty state — prompt to add */
          <button
            type="button"
            onClick={() => setIsEditingBalance(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-health-separator text-[13px] text-health-secondary hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add real balance
          </button>
        )}
      </div>
    </div>
  );
}

export const BudgetCard = memo(BudgetCardComponent);
