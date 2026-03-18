import { useState, useEffect, useRef } from 'react';
import { Plus, LayoutList, LayoutGrid, ChevronDown, AlertCircle, RefreshCw, Search, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { SummaryCard } from '../components/SummaryCard';
import { BudgetCard } from '../components/BudgetCard';
import { ConfirmModal } from '../components/ConfirmModal';
import { useBudget } from '../context/BudgetContext';
import { Budget } from '../types';
import { Currency } from '../utils/currency';
import { TranslationKeys } from '../utils/i18n';
import { getTimeMetrics } from '../utils/time';

interface HomeProps {
  currency: Currency;
  t: Record<TranslationKeys, string>;
  viewMode: 'compact' | 'detailed';
  onViewModeChange: (mode: 'compact' | 'detailed') => void;
  onAddBudgetClick: () => void;
  onEditBudget: (budget: Budget) => void;
}

export function Home({ currency, t, viewMode, onViewModeChange, onAddBudgetClick, onEditBudget }: HomeProps) {
  const { budgets, loading, error, hasPendingWrites, isFromCache, deleteBudget, loadSampleData, updateBudget } = useBudget();
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'urgency'>('name');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [dismissedError, setDismissedError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDismissedError(false);
  }, [error]);

  const handleRetry = () => {
    window.location.reload();
  };

  const isPermissionError = error?.message?.includes('Permission');
  const hasNoCachedData = budgets.length === 0 && !loading;
  const shouldShowErrorRecovery = error && !dismissedError && (isPermissionError || hasNoCachedData);

  const getSortedBudgets = (budgetsToSort: Budget[]) => {
    const sorted = [...budgetsToSort];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'amount':
        sorted.sort((a, b) => b.amount - a.amount);
        break;
      case 'urgency':
        sorted.sort((a, b) => {
          const metricsA = getTimeMetrics(a.frequency, a.excludeWeekends);
          const metricsB = getTimeMetrics(b.frequency, b.excludeWeekends);
          const remainingA = a.amount - (a.amount * metricsA.percentage) / 100;
          const remainingB = b.amount - (b.amount * metricsB.percentage) / 100;
          return remainingA - remainingB;
        });
        break;
    }
    return sorted;
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'name': return t.sortByName;
      case 'amount': return t.sortByAmount;
      case 'urgency': return t.sortByUrgency;
      default: return t.sortBy;
    }
  };

  const sortedBudgets = getSortedBudgets(budgets);

  const filteredBudgets = searchQuery.trim()
    ? sortedBudgets.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.frequency.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sortedBudgets;

  return (
    <div className="px-4 pt-10 pb-28 min-h-screen bg-health-bg">
      {/* Sync / offline banners */}
      {hasPendingWrites && (
        <div className="mb-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-[13px] text-amber-800">{t.syncing || 'Syncing...'}</span>
        </div>
      )}

      {isFromCache && (
        <div className="mb-3 px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-2">
          <span className="text-[13px] text-indigo-800">📶 {t.offline || 'Using offline data'}</span>
        </div>
      )}

      {/* Error recovery */}
      {shouldShowErrorRecovery && (
        <div className="mb-4 bg-white rounded-3xl border border-rose-100 shadow-sm p-5">
          <div className="flex items-start gap-3">
            <div className="bg-rose-50 p-2 rounded-full flex-shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex-1">
              {isPermissionError ? (
                <>
                  <p className="text-[13px] font-semibold text-health-text mb-1">🔒 Permission Denied</p>
                  <p className="text-[12px] text-health-secondary mb-3">
                    Firestore is checking access permissions. This usually resolves in 5–10 minutes after publishing Security Rules.
                  </p>
                  <ul className="space-y-1 text-[12px] text-health-secondary list-disc list-inside mb-3">
                    <li>Wait a few minutes and try again</li>
                    <li>Hard refresh: ⌘⇧R (Mac) or Ctrl⇧R (Windows)</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-semibold text-health-text mb-1">⚠️ Cannot Load Budgets</p>
                  <p className="text-[12px] text-health-secondary mb-3">{error.message}</p>
                </>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 text-[12px] font-semibold rounded-xl transition-colors hover:bg-rose-100"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedError(true)}
                  className="px-3 py-1.5 bg-health-bg text-health-secondary text-[12px] font-semibold rounded-xl transition-colors hover:bg-health-separator"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && !shouldShowErrorRecovery && (
        <div className="mb-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[13px] text-amber-800">{error.message}</span>
        </div>
      )}

      {loading && budgets.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full border-2 border-health-separator border-t-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-[13px] text-health-secondary">{t.loadingBudgets || 'Loading budgets...'}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Page header */}
          <header className="mb-6">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-health-secondary mb-1">
              {t.manageSpending}
            </p>
            <h1 className="font-display text-[34px] font-bold text-health-text leading-tight">{t.budgets}</h1>
          </header>

          {budgets.length > 0 ? (
            <>
              <SummaryCard budgets={budgets} currency={currency} t={t} viewMode={viewMode} />

              {/* Search bar */}
              <div className="relative flex items-center gap-2 mt-4 mb-2">
                <div className={cn(
                  'flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-full transition-all',
                  'bg-slate-200/50 border border-transparent',
                  searchQuery && 'bg-white border-health-separator shadow-sm'
                )}>
                  <Search className="w-4 h-4 text-health-tertiary flex-shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search budgets…"
                    className="flex-1 bg-transparent text-[14px] text-health-text placeholder:text-health-tertiary outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="w-4 h-4 flex items-center justify-center rounded-full bg-health-tertiary/30 flex-shrink-0"
                    >
                      <X className="w-2.5 h-2.5 text-health-secondary" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[13px] font-medium text-indigo-600 flex-shrink-0"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Section header with controls */}
              <div className="flex justify-between items-center mb-3 mt-2">
                <span className="text-[11px] font-semibold tracking-widest uppercase text-health-secondary">
                  {t.yourCategories}
                </span>
                <div className="flex items-center gap-2">
                  {/* Sort dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSortMenu(!showSortMenu)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white rounded-xl text-[11px] font-semibold text-health-secondary border border-health-separator hover:border-indigo-200 transition-colors"
                    >
                      {getSortLabel()}
                      <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                    </button>
                    {showSortMenu && (
                      <div className="absolute top-full right-0 mt-1.5 bg-white rounded-2xl border border-health-separator shadow-lg z-20 overflow-hidden min-w-[140px]">
                        {(['name', 'amount', 'urgency'] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => { setSortBy(opt); setShowSortMenu(false); }}
                            className={`block w-full text-left px-4 py-2.5 text-[13px] transition-colors ${
                              sortBy === opt
                                ? 'text-indigo-600 font-semibold bg-indigo-50'
                                : 'text-health-text hover:bg-health-bg'
                            }`}
                          >
                            {opt === 'name' ? t.sortByName : opt === 'amount' ? t.sortByAmount : t.sortByUrgency}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* View toggle */}
                  <div className="flex bg-white border border-health-separator rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => onViewModeChange('detailed')}
                      aria-label={t.detailedView}
                      className={`p-1.5 rounded-lg transition-all ${
                        viewMode === 'detailed'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-health-tertiary hover:text-health-secondary'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewModeChange('compact')}
                      aria-label={t.compactView}
                      className={`p-1.5 rounded-lg transition-all ${
                        viewMode === 'compact'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-health-tertiary hover:text-health-secondary'
                      }`}
                    >
                      <LayoutList className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {filteredBudgets.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="text-[16px] font-semibold text-health-text mb-1">No Budgets Found</p>
                  <p className="text-[13px] text-health-secondary">
                    Try a different name or frequency.
                  </p>
                </div>
              ) : (
                filteredBudgets.map(budget => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    currency={currency}
                    t={t}
                    onDelete={(id) => setBudgetToDelete(id)}
                    onEdit={onEditBudget}
                    onUpdateBalance={async (id, balance) =>
                      updateBudget(id, { lastKnownBalance: balance, lastKnownBalanceAt: Date.now() })
                    }
                    viewMode={viewMode}
                  />
                ))
              )}
            </>
          ) : (
            /* Empty state */
            <div className="text-center py-16 px-4">
              {error && isPermissionError && hasNoCachedData ? (
                <>
                  <div className="bg-rose-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-rose-400" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-health-text mb-2">⏳ Waiting for Firestore</h2>
                  <p className="text-[14px] text-health-secondary mb-8">
                    Access permissions are being set up. This usually takes 5–10 minutes.
                  </p>
                  <div className="flex flex-col gap-3 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="w-full px-6 py-3.5 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSampleData('USD')}
                      className="w-full px-6 py-3.5 bg-white border border-health-separator text-health-text font-semibold rounded-2xl hover:bg-health-bg transition-colors"
                    >
                      Load Sample Budgets
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-indigo-500" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-health-text mb-2">{t.welcome}</h2>
                  <p className="text-[14px] text-health-secondary mb-8">{t.createFirstBudget}</p>
                  <div className="flex flex-col gap-3 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={onAddBudgetClick}
                      className="w-full px-6 py-3.5 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 transition-colors"
                    >
                      {t.createBudget}
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSampleData('USD')}
                      className="w-full px-6 py-3.5 bg-white border border-health-separator text-health-text font-semibold rounded-2xl hover:bg-health-bg transition-colors"
                    >
                      {t.loadSampleData}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* FAB */}
          {budgets.length > 0 && (
            <button
              type="button"
              onClick={onAddBudgetClick}
              aria-label={t.newBudget}
              className="fixed bottom-24 right-5 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all z-40"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={budgetToDelete !== null}
        title={t.confirmDeleteTitle}
        message={t.confirmDeleteMessage}
        confirmText={t.delete}
        cancelText={t.cancel}
        onConfirm={async () => {
          if (budgetToDelete !== null) {
            try {
              await deleteBudget(budgetToDelete);
              setBudgetToDelete(null);
            } catch (err) {
              console.error('Failed to delete budget:', err);
            }
          }
        }}
        onCancel={() => setBudgetToDelete(null)}
      />
    </div>
  );
}
