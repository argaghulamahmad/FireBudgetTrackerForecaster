import { useState, useEffect } from 'react';
import { Plus, LayoutList, LayoutGrid } from 'lucide-react';
import { SummaryCard } from '../components/SummaryCard';
import { BudgetCard } from '../components/BudgetCard';
import { ConfirmModal } from '../components/ConfirmModal';
import { Budget } from '../types';
import { Currency } from '../utils/currency';

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
            {budgets.map(budget => (
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
