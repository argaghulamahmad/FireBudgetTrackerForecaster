/**
 * BudgetContext - Global Budget State Management
 *
 * Provides centralized access to:
 * - Budget data (array of budgets)
 * - Loading states and error handling
 * - Pending write indicators
 * - Metadata (offline mode, cache status)
 *
 * Eliminates prop drilling for deep component trees.
 * All budget mutations (add, update, delete) remain as callbacks
 * to maintain component responsibility and testability.
 */

import { createContext, useContext, ReactNode } from 'react';
import { Budget } from '../types';

/**
 * BudgetContext Type Definition
 * All properties are read-only (immutable from consumer perspective)
 */
export interface BudgetContextType {
  // Data
  budgets: Budget[];
  loading: boolean;
  error: Error | null;
  hasPendingWrites: boolean;
  isFromCache: boolean;

  // Mutations (callbacks from parent, not context-managed)
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt'>) => Promise<string>;
  updateBudget: (id: string, updates: Partial<Omit<Budget, 'id' | 'createdAt'>>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  loadSampleData: (currency: 'USD' | 'IDR') => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Create the context with undefined default
 * Ensures components must be wrapped in provider
 */
const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

/**
 * BudgetProvider Component
 *
 * Wraps app with budget state and provides context to all descendants.
 *
 * @example
 * <BudgetProvider budgetState={useBudgets(user?.uid)}>
 *   <App />
 * </BudgetProvider>
 */
export interface BudgetProviderProps {
  children: ReactNode;
  budgetState: BudgetContextType;
}

export function BudgetProvider({ children, budgetState }: BudgetProviderProps) {
  return (
    <BudgetContext.Provider value={budgetState}>
      {children}
    </BudgetContext.Provider>
  );
}

/**
 * useBudget Hook - Access budget context
 *
 * MUST be used within <BudgetProvider>
 *
 * @returns BudgetContextType with all budget data and mutations
 * @throws Error if used outside provider
 *
 * @example
 * const { budgets, loading, addBudget } = useBudget();
 */
export function useBudget(): BudgetContextType {
  const context = useContext(BudgetContext);

  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }

  return context;
}
