/**
 * useBudgets Hook - Firestore Implementation
 * 
 * Provides CRUD operations and reactive budget data via Firestore
 * Replaces IndexedDB (Dexie) implementation
 * 
 * Key Improvements:
 * - Real-time sync across tabs via Firestore replication
 * - Automatic offline queueing with server sync
 * - Pending write indicators for UI feedback
 * - Improved error handling
 * - Type-safe Firestore operations
 */

import { Budget } from '../types';
import {
  addBudget as firestoreAdd,
  updateBudget as firestoreUpdate,
  deleteBudget as firestoreDelete,
  clearAllBudgets,
  loadSampleBudgets,
} from '../db/firestore-db';
import { useFirestoreLiveData } from './useFirestoreLiveData';

/**
 * useBudgets Hook Return Type
 */
export interface UseBudgetsReturn {
  budgets: Budget[];
  loading: boolean;
  error: Error | null;
  hasPendingWrites: boolean;
  isFromCache: boolean;
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => Promise<string>;
  updateBudget: (
    id: string,
    updates: Partial<Omit<Budget, 'id' | 'createdAt'>>
  ) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  loadSampleData: (currency: 'USD' | 'IDR') => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * useBudgets Hook
 *
 * @param userId Current user's Firebase UID (required for data isolation)
 * @returns Object with budgets data, loading state, and CRUD operations
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
    budgets,
    loading,
    error,
    hasPendingWrites,
    isFromCache,

    addBudget: async (budget) => {
      try {
        const id = await firestoreAdd(budget);
        return id;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Failed to add budget:', error);
        throw error;
      }
    },

    updateBudget: async (id, updates) => {
      try {
        await firestoreUpdate(id, updates);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Failed to update budget:', error);
        throw error;
      }
    },

    deleteBudget: async (id) => {
      try {
        await firestoreDelete(id);
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
        await clearAllBudgets(userId);
        await loadSampleBudgets(userId, currency);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Failed to load sample data:', error);
        throw error;
      }
    },

    refetch,
  };
}
