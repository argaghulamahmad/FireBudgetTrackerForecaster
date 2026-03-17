/**
 * useBudgets Hook - Firestore Edition
 * 
 * Provides CRUD operations and reactive budget data via Firestore
 * Replaces IndexedDB (Dexie) implementation
 * 
 * CHANGED BEHAVIOR:
 * - Real-time sync across tabs (Firestore multi-tab replication)
 * - Mutations return promises (async operations)
 * - No more local ID generation (Firestore auto-generates)
 * - Automatic offline queueing (changes sync on reconnect)
 * 
 * MIGRATION FROM DEXIE:
 * Old: `const budgets = useLiveQuery(() => db.budgets.toArray());`
 * New: `const { data: budgets, loading } = useFirestoreLiveData();`
 */

import { Budget } from '../types';
import {
  addBudget,
  updateBudget,
  deleteBudget,
  clearAllBudgets,
  loadSampleBudgets,
} from '../db/firestore-db';
import { useFirestoreLiveData } from './useFirestoreLiveData';

/**
 * useBudgets Hook Return Type
 */
export interface UseBudgetsReturn {
  // Data
  budgets: Budget[];
  loading: boolean;
  error: Error | null;
  hasPendingWrites: boolean;
  isFromCache: boolean;

  // Mutations (all async)
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => Promise<string>;
  updateBudget: (
    id: string,
    updates: Partial<Omit<Budget, 'id' | 'createdAt'>>
  ) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  loadSampleData: (currency: 'USD' | 'IDR') => Promise<void>;

  // Utilities
  refetch: () => Promise<void>;
}

/**
 * useBudgets Hook
 * 
 * @param userId Current user's Firebase UID (required for data isolation)
 * 
 * USAGE:
 * ```
 * const {
 *   budgets,
 *   loading,
 *   error,
 *   addBudget,
 *   updateBudget,
 *   deleteBudget,
 * } = useBudgets(user.uid);
 * 
 * // Handle loading state
 * if (loading) return <LoadingSpinner />;
 * 
 * // Add a budget (returns new ID)
 * const newId = await addBudget({
 *   userId: user.uid,
 *   name: 'Coffee',
 *   amount: 50,
 *   frequency: 'Weekly',
 *   currency: 'USD',
 * });
 * 
 * // Update a budget
 * await updateBudget(newId, { amount: 60 });
 * 
 * // Delete a budget
 * await deleteBudget(newId);
 * ```
 * 
 * ERROR HANDLING:
 * ```
 * if (error) {
 *   if (error.message.includes('Permission denied')) {
 *     // Security Rules rejected
 *   } else if (error.message.includes('firestore-error')) {
 *     // Network or Firestore error
 *   }
 * }
 * ```
 * 
 * OFFLINE BEHAVIOR:
 * - Changes are queued locally via IndexedDB
 * - hasPendingWrites=true while changes are being synced
 * - UI shows "Syncing..." badge if hasPendingWrites=true
 * - Changes auto-sync when network reconnects
 */
export function useBudgets(userId: string | null): UseBudgetsReturn {
  const {
    data: budgets,
    loading,
    error,
    hasPendingWrites,
    isFromCache,
    refetch,
  } = useFirestoreLiveData(userId, true);

  return {
    // Data
    budgets,
    loading,
    error,
    hasPendingWrites,
    isFromCache,

    // Mutations
    addBudget: async (budget) => {
      try {
        const id = await addBudget(budget);
        return id;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Failed to add budget:', error);
        throw error;
      }
    },

    updateBudget: async (id, updates) => {
      try {
        await updateBudget(id, updates);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Failed to update budget:', error);
        throw error;
      }
    },

    deleteBudget: async (id) => {
      try {
        await deleteBudget(id);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Failed to delete budget:', error);
        throw error;
      }
    },

    clearAllData: async () => {
      try {
        if (!userId) throw new Error('User ID is required');
        await clearAllBudgets(userId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Failed to clear all data:', error);
        throw error;
      }
    },

    loadSampleData: async (currency) => {
      try {
        if (!userId) throw new Error('User ID is required');
        // First clear existing data
        await clearAllBudgets(userId);
        // Then load sample data
        await loadSampleBudgets(userId, currency);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Failed to load sample data:', error);
        throw error;
      }
    },

    // Utilities
    refetch,
  };
}
