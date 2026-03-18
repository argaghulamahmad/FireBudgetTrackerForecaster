/**
 * PreferencesContext - Global User Preferences
 *
 * Provides global access to:
 * - Currency (USD, IDR)
 * - Language (en, id)
 * - View mode (compact, detailed)
 *
 * Eliminates prop drilling from App → Home → BudgetCard.
 * Preferences are persisted to localStorage automatically.
 */

import { createContext, useContext, ReactNode } from 'react';
import { Currency } from '../utils/currency';
import { Language } from '../utils/i18n';

export interface PreferencesContextType {
  currency: Currency;
  language: Language;
  viewMode: 'compact' | 'detailed';
  onCurrencyChange: (currency: Currency) => void;
  onLanguageChange: (language: Language) => void;
  onViewModeChange: (mode: 'compact' | 'detailed') => void;
}

/**
 * Create the context with undefined default
 * Ensures components must be wrapped in provider
 */
const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

/**
 * PreferencesProvider Component
 *
 * Wraps app with user preferences and provides context to all descendants.
 */
export interface PreferencesProviderProps {
  children: ReactNode;
  currency: Currency;
  language: Language;
  viewMode: 'compact' | 'detailed';
  onCurrencyChange: (currency: Currency) => void;
  onLanguageChange: (language: Language) => void;
  onViewModeChange: (mode: 'compact' | 'detailed') => void;
}

export function PreferencesProvider({
  children,
  currency,
  language,
  viewMode,
  onCurrencyChange,
  onLanguageChange,
  onViewModeChange,
}: PreferencesProviderProps) {
  return (
    <PreferencesContext.Provider
      value={{
        currency,
        language,
        viewMode,
        onCurrencyChange,
        onLanguageChange,
        onViewModeChange,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

/**
 * usePreferences Hook - Access user preferences
 *
 * MUST be used within <PreferencesProvider>
 *
 * @returns PreferencesContextType with all preferences and setters
 * @throws Error if used outside provider
 *
 * @example
 * const { currency, language, viewMode, onCurrencyChange } = usePreferences();
 */
export function usePreferences(): PreferencesContextType {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }

  return context;
}
