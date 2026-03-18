import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, LayoutList, LayoutGrid, AlertCircle, RefreshCw, Search, X, ArrowUpDown, ArrowUp, ArrowDown, Wallet, Wifi, Clock, Layers, CheckCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { getLogger } from '../utils/logger';

const logger = getLogger('Home');
import { SummaryCard } from '../components/SummaryCard';
import { BudgetCard } from '../components/BudgetCard';
import { ConfirmModal } from '../components/ConfirmModal';
import { useBudget } from '../context/BudgetContext';
import { usePreferences } from '../context/PreferencesContext';
import { Budget } from '../types';
import { TranslationKeys } from '../utils/i18n';
import { getTimeMetrics } from '../utils/time';

interface HomeProps {
  t: Record<TranslationKeys, string>;
  onAddBudgetClick: () => void;
  onEditBudget: (budget: Budget) => void;
}

export function Home({ t, onAddBudgetClick, onEditBudget }: HomeProps) {
  const { currency, viewMode, onViewModeChange } = usePreferences();
  const { budgets, loading, error, hasPendingWrites, isFromCache, deleteBudget, loadSampleData, updateBudget } = useBudget();
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);

  // ==================== Initialize Sort Order from localStorage ====================
  const [sortField, setSortField] = useState<'name' | 'amount' | 'urgency'>(() => {
    const saved = localStorage.getItem('budget_sort_field') as 'name' | 'amount' | 'urgency' | null;
    return saved ?? 'name';
  });

  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem('budget_sort_dir') as 'asc' | 'desc' | null;
    return saved ?? 'asc';
  });

  // ==================== Initialize Grouping from localStorage ====================
  const [groupByStatus, setGroupByStatus] = useState<boolean>(() => {
    const saved = localStorage.getItem('budget_group_by_status');
    return saved ? saved === 'true' : false;
  });

  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);
  const [dismissedError, setDismissedError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [healthFilter, setHealthFilter] = useState<'all' | 'surplus' | 'deficit'>('all');

  useEffect(() => {
    setDismissedError(false);
  }, [error]);

  // ==================== Persist Sort Order to localStorage ====================
  useEffect(() => {
    localStorage.setItem('budget_sort_field', sortField);
  }, [sortField]);

  useEffect(() => {
    localStorage.setItem('budget_sort_dir', sortDir);
  }, [sortDir]);

  // ==================== Persist Grouping to localStorage ====================
  useEffect(() => {
    localStorage.setItem('budget_group_by_status', String(groupByStatus));
  }, [groupByStatus]);

  const handleRetry = () => {
    window.location.reload();
  };

  const isPermissionError = error?.message?.includes('Permission');
  const hasNoCachedData = budgets.length === 0 && !loading;
  const shouldShowErrorRecovery = error && !dismissedError && (isPermissionError || hasNoCachedData);

  const getSortedBudgets = useCallback((budgetsToSort: Budget[]) => {
    const sorted = [...budgetsToSort];
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'name':
        sorted.sort((a, b) => dir * a.name.localeCompare(b.name));
        break;
      case 'amount':
        sorted.sort((a, b) => dir * (a.amount - b.amount));
        break;
      case 'urgency':
        sorted.sort((a, b) => {
          const metricsA = getTimeMetrics(a.frequency, a.excludeWeekends);
          const metricsB = getTimeMetrics(b.frequency, b.excludeWeekends);
          const remainingA = a.amount - (a.amount * metricsA.percentage) / 100;
          const remainingB = b.amount - (b.amount * metricsB.percentage) / 100;
          return dir * (remainingA - remainingB);
        });
        break;
    }
    return sorted;
  }, [sortDir, sortField]);

  const SORT_OPTIONS = useMemo(() => [
    { key: 'name' as const,    label: t.sortByName,    asc: 'A → Z', desc: 'Z → A' },
    { key: 'amount' as const,  label: t.sortByAmount,  asc: '↑ Low',  desc: '↓ High' },
    { key: 'urgency' as const, label: t.sortByUrgency, asc: '↑ Low',  desc: '↓ High' },
  ], [t.sortByName, t.sortByAmount, t.sortByUrgency]);

  const sortedBudgets = useMemo(() => getSortedBudgets(budgets), [budgets, getSortedBudgets]);

  const filteredBudgets = useMemo(() =>
    searchQuery.trim()
      ? sortedBudgets.filter(b =>
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.frequency.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : sortedBudgets,
    [searchQuery, sortedBudgets]
  );

  const getBudgetVariance = useCallback((b: Budget): number | null => {
    const m = getTimeMetrics(b.frequency, b.excludeWeekends);
    const remaining = b.amount - (b.amount * m.percentage) / 100;
    return b.lastKnownBalance !== undefined ? b.lastKnownBalance - remaining : null;
  }, []);

  const healthFilteredBudgets = useMemo(() =>
    healthFilter === 'all'
      ? filteredBudgets
      : filteredBudgets.filter(b => {
          const v = getBudgetVariance(b);
          if (v === null) return false;
          return healthFilter === 'surplus' ? v >= 0 : v < 0;
        }),
    [healthFilter, filteredBudgets, getBudgetVariance]
  );

  const groupedSections = useMemo(() =>
    groupByStatus ? {
      deficit: healthFilteredBudgets.filter(b => { const v = getBudgetVariance(b); return v !== null && v < 0; }),
      onTrack: healthFilteredBudgets.filter(b => { const v = getBudgetVariance(b); return v === null || v >= 0; }),
    } : null,
    [groupByStatus, healthFilteredBudgets, getBudgetVariance]
  );

  const handleUpdateBalance = useCallback(
    async (id: string, balance: number) => {
      await updateBudget(id, { lastKnownBalance: balance, lastKnownBalanceAt: Date.now() });
    },
    [updateBudget]
  );

  const handleDeleteClick = useCallback((id: string) => {
    setBudgetToDelete(id);
  }, []);

  const renderCard = useCallback(
    (budget: Budget) => (
      <BudgetCard
        key={budget.id}
        budget={budget}
        t={t}
        onDelete={handleDeleteClick}
        onEdit={onEditBudget}
        onUpdateBalance={handleUpdateBalance}
      />
    ),
    [t, onEditBudget, handleDeleteClick, handleUpdateBalance]
  );

  return (
    <div className="px-4 pt-10 pb-28 min-h-screen bg-[#F2F2F7] lg:px-0 lg:pt-0 lg:pb-0">
      {/* Sync / offline banners */}
      {hasPendingWrites && (
        <div className="mb-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl lg:rounded-none flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-[13px] text-amber-800">{t.syncing || 'Syncing...'}</span>
        </div>
      )}

      {isFromCache && (
        <div className="mb-3 px-3 py-2.5 bg-indigo-50 border border-indigo-200 rounded-2xl lg:rounded-none flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" strokeWidth={2} />
          <span className="text-[13px] text-indigo-800">{t.offline || 'Using offline data'}</span>
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
                  <p className="text-[13px] font-semibold text-health-text mb-1">{t.errorPermissionDenied}</p>
                  <p className="text-[12px] text-health-secondary mb-3">
                    {t.errorPermissionDeniedMessage}
                  </p>
                  <ul className="space-y-1 text-[12px] text-health-secondary list-disc list-inside mb-3">
                    <li>{t.errorPermissionAction1}</li>
                    <li>{t.errorPermissionAction2}</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-semibold text-health-text mb-1">{t.errorCannotLoadBudgets}</p>
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
                  {t.retry}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissedError(true)}
                  className="px-3 py-1.5 bg-health-bg text-health-secondary text-[12px] font-semibold rounded-xl transition-colors hover:bg-health-separator"
                >
                  {t.dismiss}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && !shouldShowErrorRecovery && (
        <div className="mb-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl lg:rounded-none flex items-center gap-2">
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
          {/* Page header — mobile only; desktop version lives inside the sidebar */}
          <header className="mb-6 lg:hidden">
            <p className="text-[11px] font-semibold tracking-widest uppercase text-health-secondary mb-1">
              {t.manageSpending}
            </p>
            <div className="flex items-center gap-2.5">
              <Wallet className="w-8 h-8 text-indigo-600 flex-shrink-0" strokeWidth={2} />
              <h1 className="font-display text-[34px] font-bold text-health-text leading-tight">Budget Tracker Forecaster</h1>
            </div>
          </header>

          {budgets.length > 0 ? (
            <div>

              {/* ─── Top Panel ─── */}
              <div className="lg:sticky lg:top-0 lg:z-20 lg:bg-white/90 lg:backdrop-blur-xl lg:border-b lg:border-health-separator/50 lg:px-8 lg:pt-6 lg:pb-4">

                {/* Desktop heading */}
                <header className="hidden lg:block mb-5">
                  <p className="text-[11px] font-semibold tracking-widest uppercase text-health-secondary mb-1">
                    {t.manageSpending}
                  </p>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-7 h-7 text-indigo-600 flex-shrink-0" strokeWidth={2} />
                    <h1 className="font-display text-[28px] font-bold text-health-text leading-tight">Budget Tracker Forecaster</h1>
                  </div>
                </header>

                <SummaryCard budgets={budgets} currency={currency} t={t} viewMode={viewMode} />

                {/* Search + Controls — stacked on mobile, single row on desktop */}
                <div className="lg:flex lg:items-center lg:gap-3 lg:mt-4">

                  {/* Search bar */}
                  <div className="relative flex items-center gap-2 mt-4 mb-2 lg:mt-0 lg:mb-0 lg:flex-1">
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

                  {/* Controls */}
                  <div className="flex items-center gap-2 mb-3 mt-4 lg:mt-0 lg:mb-0">
                    {/* Health filter pills */}
                    <div className="flex items-center gap-1 mr-auto">
                      {(['all', 'surplus', 'deficit'] as const).map(f => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setHealthFilter(f)}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                            healthFilter === f
                              ? f === 'surplus'
                                ? 'bg-emerald-600 text-white border-transparent'
                                : f === 'deficit'
                                ? 'bg-rose-500 text-white border-transparent'
                                : 'bg-indigo-600 text-white border-transparent'
                              : 'bg-white text-health-secondary border-health-separator hover:border-indigo-200 hover:text-health-text'
                          )}
                        >
                          {f === 'all' ? 'All' : f === 'surplus' ? 'Surplus' : 'Deficit'}
                        </button>
                      ))}
                    </div>
                    {/* Group toggle */}
                    <button
                      type="button"
                      onClick={() => setGroupByStatus(v => !v)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors',
                        groupByStatus
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                          : 'bg-white text-health-secondary border-health-separator hover:border-indigo-200'
                      )}
                    >
                      <Layers className="w-3 h-3" strokeWidth={2} />
                      Group
                    </button>
                    {/* Sort dropdown */}
                    <div className="relative" ref={sortMenuRef}>
                      <button
                        type="button"
                        onClick={() => setShowSortMenu(v => !v)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors',
                          showSortMenu
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                            : 'bg-white text-health-secondary border-health-separator hover:border-indigo-200'
                        )}
                      >
                        <ArrowUpDown className="w-3 h-3" />
                        {SORT_OPTIONS.find(o => o.key === sortField)?.label}
                        {sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      </button>
                      {showSortMenu && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                          <div className="absolute top-full right-0 mt-1.5 bg-white rounded-2xl border border-health-separator shadow-xl z-20 overflow-hidden w-56">
                            {SORT_OPTIONS.map((opt, i) => (
                              <div
                                key={opt.key}
                                className={cn(
                                  'flex items-center justify-between px-4 py-2.5',
                                  i < SORT_OPTIONS.length - 1 && 'border-b border-health-separator/60'
                                )}
                              >
                                <span className={cn(
                                  'text-[13px] font-medium',
                                  sortField === opt.key ? 'text-indigo-600 font-semibold' : 'text-health-text'
                                )}>
                                  {opt.label}
                                </span>
                                <div className="flex items-center gap-1">
                                  {(['asc', 'desc'] as const).map(dir => (
                                    <button
                                      key={dir}
                                      type="button"
                                      onClick={() => { setSortField(opt.key); setSortDir(dir); setShowSortMenu(false); }}
                                      className={cn(
                                        'px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors',
                                        sortField === opt.key && sortDir === dir
                                          ? 'bg-indigo-600 text-white'
                                          : 'bg-health-bg text-health-secondary hover:bg-indigo-50 hover:text-indigo-600'
                                      )}
                                    >
                                      {dir === 'asc' ? opt.asc : opt.desc}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
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
              </div>

              {/* ─── Budget Cards ─── */}
              <main className="lg:px-8 lg:py-6">
                {healthFilteredBudgets.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Search className="w-7 h-7 text-slate-300" />
                    </div>
                    <p className="text-[16px] font-semibold text-health-text mb-1">No Budgets Found</p>
                    <p className="text-[13px] text-health-secondary">Try a different name or frequency.</p>
                  </div>
                ) : groupedSections ? (
                  <div className="space-y-6">
                    {/* Attention Required — Deficit */}
                    <section>
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                        <h3 className="text-[11px] font-semibold tracking-widest uppercase text-health-secondary">Attention Required</h3>
                        <span className="text-[10px] font-semibold text-health-tertiary ml-auto">{groupedSections.deficit.length}</span>
                      </div>
                      {groupedSections.deficit.length > 0 ? (
                        <div className="lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4">
                          {groupedSections.deficit.map(budget => renderCard(budget))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 py-4 px-5 bg-white rounded-[32px] border border-health-separator shadow-sm">
                          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" strokeWidth={2} />
                          <p className="text-[13px] text-health-secondary font-medium">All budgets are healthy!</p>
                        </div>
                      )}
                    </section>

                    {/* On Track — Surplus */}
                    <section>
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        <h3 className="text-[11px] font-semibold tracking-widest uppercase text-health-secondary">On Track</h3>
                        <span className="text-[10px] font-semibold text-health-tertiary ml-auto">{groupedSections.onTrack.length}</span>
                      </div>
                      {groupedSections.onTrack.length > 0 ? (
                        <div className="lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4">
                          {groupedSections.onTrack.map(budget => renderCard(budget))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 py-4 px-5 bg-white rounded-[32px] border border-health-separator shadow-sm">
                          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" strokeWidth={2} />
                          <p className="text-[13px] text-health-secondary font-medium">All budgets are healthy!</p>
                        </div>
                      )}
                    </section>
                  </div>
                ) : (
                  <div className="lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4">
                    {healthFilteredBudgets.map(budget => renderCard(budget))}
                  </div>
                )}
              </main>
            </div>
          ) : (
            /* Empty state */
            <div className="text-center py-16 px-4">
              {error && isPermissionError && hasNoCachedData ? (
                <>
                  <div className="bg-rose-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-rose-400" />
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-rose-400 flex-shrink-0" strokeWidth={2} />
                    <h2 className="font-display text-xl font-bold text-health-text">{t.waitingForFirestore}</h2>
                  </div>
                  <p className="text-[14px] text-health-secondary mb-8">
                    {t.waitingForFirestoreMessage}
                  </p>
                  <div className="flex flex-col gap-3 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="w-full px-6 py-3.5 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t.tryAgain}
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
              className="fixed bottom-24 lg:bottom-8 right-5 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all z-40"
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
              logger.error('Failed to delete budget', err);
            }
          }
        }}
        onCancel={() => setBudgetToDelete(null)}
      />
    </div>
  );
}
