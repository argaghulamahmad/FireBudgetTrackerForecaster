import { useState, useEffect } from 'react';
import { Plus, LayoutList, LayoutGrid, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';
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

export function Home({
  currency,
  t,
  viewMode,
  onViewModeChange,
  onAddBudgetClick,
  onEditBudget,
}: HomeProps) {
  const { budgets, loading, error, hasPendingWrites, isFromCache, deleteBudget, loadSampleData } = useBudget();
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'urgency'>('name');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [dismissedError, setDismissedError] = useState(false);

  // Auto-clear dismiss flag when error changes
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
      default:
        break;
    }
    
    return sorted;
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'name':
        return t.sortByName;
      case 'amount':
        return t.sortByAmount;
      case 'urgency':
        return t.sortByUrgency;
      default:
        return t.sortBy;
    }
  };

  const sortedBudgets = getSortedBudgets(budgets);

  return (
    <div className="px-4 pt-8 pb-24 max-w-md mx-auto">
      {/* Status Indicators */}
      {hasPendingWrites && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-amber-800">{t.syncing || 'Syncing...'}</span>
        </div>
      )}

      {isFromCache && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-2">
          <span className="text-sm text-indigo-800">📶 {t.offline || 'Using offline data'}</span>
        </div>
      )}

      {shouldShowErrorRecovery && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {isPermissionError ? (
                <>
                  <h3 className="font-semibold text-rose-900 mb-1">🔒 Permission Denied</h3>
                  <p className="text-sm text-rose-800 mb-3">
                    Firestore is checking access permissions. This usually resolves in 5-10 minutes after you published the Security Rules.
                  </p>
                  <div className="space-y-2 text-sm text-rose-700">
                    <p>What to try:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Wait a few minutes and try again</li>
                      <li>Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)</li>
                      <li>Check console (F12) for more details</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-rose-900 mb-1">⚠️ Cannot Load Budgets</h3>
                  <p className="text-sm text-rose-800 mb-3">{error.message}</p>
                </>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 text-sm font-medium rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Now
                </button>
                <button
                  onClick={() => setDismissedError(true)}
                  className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && !shouldShowErrorRecovery && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-800">{error.message}</span>
        </div>
      )}

      {loading && budgets.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-gray-200 border-t-indigo-600 animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">{t.loadingBudgets || 'Loading budgets...'}</p>
          </div>
        </div>
      ) : (
        <>
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t.budgets}</h1>
            <p className="text-gray-500 mt-1">{t.manageSpending}</p>
          </header>

          {budgets && budgets.length > 0 ? (
            <>
              <SummaryCard budgets={budgets} currency={currency} t={t} viewMode={viewMode} />
              
              <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-gray-900">{t.yourCategories}</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-gray-200 transition-colors"
                  >
                    {getSortLabel()}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showSortMenu && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                      <button
                        onClick={() => {
                          setSortBy('name');
                          setShowSortMenu(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${sortBy === 'name' ? 'text-indigo-600 font-semibold' : 'text-gray-900'}`}
                      >
                        {t.sortByName}
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('amount');
                          setShowSortMenu(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${sortBy === 'amount' ? 'text-indigo-600 font-semibold' : 'text-gray-900'}`}
                      >
                        {t.sortByAmount}
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('urgency');
                          setShowSortMenu(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${sortBy === 'urgency' ? 'text-indigo-600 font-semibold' : 'text-gray-900'}`}
                      >
                        {t.sortByUrgency}
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => onViewModeChange('detailed')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'detailed' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    title={t.detailedView}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onViewModeChange('compact')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'compact' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                    title={t.compactView}
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            {sortedBudgets.map(budget => (
              <BudgetCard 
                key={budget.id} 
                budget={budget} 
                currency={currency}
                t={t}
                onDelete={(id) => setBudgetToDelete(id)}
                onEdit={onEditBudget}
                viewMode={viewMode}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16 px-4">
          {error && isPermissionError && hasNoCachedData ? (
            <>
              <div className="bg-rose-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">⏳ Waiting for Firestore</h2>
              <p className="text-gray-500 mb-4">
                The database is setting up access permissions. This usually takes 5-10 minutes.
              </p>
              <p className="text-sm text-gray-500 mb-8">
                In the meantime, you can:
              </p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button 
                  onClick={handleRetry}
                  className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={() => loadSampleData('USD')}
                  className="w-full px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Load Sample Budgets
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Once permissions are granted, your data will automatically sync.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-indigo-500" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.welcome}</h2>
              <p className="text-gray-500 mb-8">{t.createFirstBudget}</p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  onClick={onAddBudgetClick}
                  className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  {t.createBudget}
                </button>
                <button
                  onClick={() => loadSampleData('USD')}
                  className="w-full px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                >
                  {t.loadSampleData}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {budgets.length > 0 && (
        <button
          onClick={onAddBudgetClick}
          className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all z-40"
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
