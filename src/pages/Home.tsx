import { useState, useEffect } from 'react';
import { Plus, LayoutList, LayoutGrid, ChevronDown } from 'lucide-react';
import { SummaryCard } from '../components/SummaryCard';
import { BudgetCard } from '../components/BudgetCard';
import { ConfirmModal } from '../components/ConfirmModal';
import { Budget } from '../types';
import { Currency } from '../utils/currency';
import { getTimeMetrics } from '../utils/time';

interface HomeProps {
  budgets: Budget[] | undefined;
  currency: Currency;
  t: any;
  viewMode: 'compact' | 'detailed';
  onViewModeChange: (mode: 'compact' | 'detailed') => void;
  onAddBudgetClick: () => void;
  onEditBudget: (budget: Budget) => void;
  onDeleteBudget: (id: number) => void;
  onLoadSampleData: () => void;
}

export function Home({ budgets, currency, t, viewMode, onViewModeChange, onAddBudgetClick, onEditBudget, onDeleteBudget, onLoadSampleData }: HomeProps) {
  const [budgetToDelete, setBudgetToDelete] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'urgency'>('name');
  const [showSortMenu, setShowSortMenu] = useState(false);

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

  const sortedBudgets = budgets ? getSortedBudgets(budgets) : undefined;

  return (
    <div className="px-4 pt-8 pb-24 max-w-md mx-auto">
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
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${sortBy === 'name' ? 'text-blue-600 font-semibold' : 'text-gray-900'}`}
                      >
                        {t.sortByName}
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('amount');
                          setShowSortMenu(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${sortBy === 'amount' ? 'text-blue-600 font-semibold' : 'text-gray-900'}`}
                      >
                        {t.sortByAmount}
                      </button>
                      <button
                        onClick={() => {
                          setSortBy('urgency');
                          setShowSortMenu(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${sortBy === 'urgency' ? 'text-blue-600 font-semibold' : 'text-gray-900'}`}
                      >
                        {t.sortByUrgency}
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => onViewModeChange('detailed')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'detailed' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    title={t.detailedView}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onViewModeChange('compact')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'compact' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    title={t.compactView}
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            {sortedBudgets?.map(budget => (
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
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.welcome}</h2>
          <p className="text-gray-500 mb-8">{t.createFirstBudget}</p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button 
              onClick={onAddBudgetClick}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              {t.createBudget}
            </button>
            <button 
              onClick={onLoadSampleData}
              className="w-full px-6 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              {t.loadSampleData}
            </button>
          </div>
        </div>
      )}

      {budgets && budgets.length > 0 && (
        <button
          onClick={onAddBudgetClick}
          className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <ConfirmModal
        isOpen={budgetToDelete !== null}
        title={t.confirmDeleteTitle}
        message={t.confirmDeleteMessage}
        confirmText={t.delete}
        cancelText={t.cancel}
        onConfirm={() => {
          if (budgetToDelete !== null) {
            onDeleteBudget(budgetToDelete);
          }
        }}
        onCancel={() => setBudgetToDelete(null)}
      />
    </div>
  );
}
