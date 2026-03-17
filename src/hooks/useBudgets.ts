import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Budget } from '../types';

export function useBudgets() {
  const budgets = useLiveQuery(() => db.budgets.orderBy('createdAt').reverse().toArray());

  const addBudget = async (budget: Omit<Budget, 'id' | 'createdAt'>) => {
    await db.budgets.add({
      ...budget,
      createdAt: Date.now(),
    });
  };

  const deleteBudget = async (id: number) => {
    await db.budgets.delete(id);
  };

  const updateBudget = async (id: number, budget: Partial<Omit<Budget, 'id' | 'createdAt'>>) => {
    await db.budgets.update(id, budget);
  };

  const clearAllData = async () => {
    await db.budgets.clear();
  };

  const loadSampleData = async (currency: 'USD' | 'IDR') => {
    const usdData: Omit<Budget, 'id'>[] = [
      { name: 'Coffee', amount: 50, frequency: 'Weekly', currency: 'USD', createdAt: Date.now() - 10000 },
      { name: 'Groceries', amount: 400, frequency: 'Monthly', currency: 'USD', createdAt: Date.now() - 20000 },
      { name: 'Rent', amount: 1200, frequency: 'Monthly', currency: 'USD', createdAt: Date.now() - 30000 },
    ];
    
    const idrData: Omit<Budget, 'id'>[] = [
      { name: 'Kopi', amount: 150000, frequency: 'Weekly', currency: 'IDR', createdAt: Date.now() - 10000 },
      { name: 'Belanja', amount: 2000000, frequency: 'Monthly', currency: 'IDR', createdAt: Date.now() - 20000 },
      { name: 'Sewa Kos', amount: 2000000, frequency: 'Monthly', currency: 'IDR', createdAt: Date.now() - 30000 },
    ];

    await db.budgets.bulkAdd(currency === 'USD' ? usdData : idrData);
  };

  return {
    budgets,
    addBudget,
    updateBudget,
    deleteBudget,
    clearAllData,
    loadSampleData,
  };
}
