/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuthObserver, cleanupAuthObserver } from './services/auth';
import { useBudgets } from './hooks/useBudgets';
import { AddBudgetModal } from './components/AddBudgetModal';
import { BottomNav } from './components/BottomNav';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Currency } from './utils/currency';
import { Language, translations } from './utils/i18n';
import { Budget } from './types';

export default function App() {
  // ==================== Firebase Auth State ====================
  // user: null = not signed in, User object = signed in
  // authLoading: true = Firebase SDK still initializing, false = ready
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ==================== Budget Management State ====================
  const { 
    budgets, 
    loading: budgetLoading, 
    error: budgetError, 
    hasPendingWrites, 
    isFromCache,
    addBudget, 
    updateBudget, 
    deleteBudget, 
    loadSampleData, 
    clearAllData 
  } = useBudgets(user?.uid || null);

  // ==================== UI State ====================
  const [activeTab, setActiveTab] = useState<'home' | 'settings'>('home');
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [language, setLanguage] = useState<Language>('en');
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');

  // ==================== Firebase Auth Initialization ====================
  /**
   * Initialize Firebase Auth Observer
   * 
   * This runs ONCE at app mount and sets up the listener that will
   * detect whenever the user signs in, signs out, or their session
   * is revoked on another device.
   * 
   * SCENARIO A (Page Refresh - Session Persistence):
   * - User refreshes page
   * - authLoading = true (show loading screen)
   * - Firebase SDK loads cached token from IndexedDB (~100ms)
   * - onAuthStateChanged fires with cached user data
   * - authLoading = false, user is set
   * - App skips login page and shows dashboard
   * 
   * SCENARIO B (Token Expiration / Revocation):
   * - User's token expires or is revoked on another device
   * - Firebase SDK detects invalid token
   * - onAuthStateChanged fires with user = null
   * - App automatically redirects to login
   * 
   * CRITICAL: Start authLoading as true to wait for Firebase initialization
   */
  useEffect(() => {
    // Initialize the global auth observer
    initAuthObserver((authUser, _loading) => {
      setUser(authUser);
      setAuthLoading(false); // Firebase has initialized
    });

    // Cleanup when app unmounts
    return () => {
      cleanupAuthObserver();
    };
  }, []);

  // ==================== Load User Preferences ====================
  useEffect(() => {
    const savedCurrency = localStorage.getItem('budget_currency') as Currency;
    if (savedCurrency === 'USD' || savedCurrency === 'IDR') {
      setCurrency(savedCurrency);
    }
    const savedLanguage = localStorage.getItem('budget_language') as Language;
    if (savedLanguage === 'en' || savedLanguage === 'id') {
      setLanguage(savedLanguage);
    }
    const savedViewMode = localStorage.getItem('budget_view_mode') as 'compact' | 'detailed';
    if (savedViewMode === 'compact' || savedViewMode === 'detailed') {
      setViewMode(savedViewMode);
    }
  }, []);

  // ==================== Event Handlers ====================
  const handleCurrencyChange = (c: Currency) => {
    setCurrency(c);
    localStorage.setItem('budget_currency', c);
  };

  const handleLanguageChange = (l: Language) => {
    setLanguage(l);
    localStorage.setItem('budget_language', l);
  };

  const handleViewModeChange = (mode: 'compact' | 'detailed') => {
    setViewMode(mode);
    localStorage.setItem('budget_view_mode', mode);
  };

  const t = translations[language];

  // ==================== Route Guarding ====================
  // Show loading screen while Firebase initializes
  // This prevents flashing the login page when user refreshes
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t.loading || 'Initializing...'}</p>
        </div>
      </div>
    );
  }

  // Not authenticated → show login page
  if (!user) {
    return <Login t={t} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-blue-100">
      
      {activeTab === 'home' ? (
        <Home 
          budgets={budgets}
          loading={budgetLoading}
          error={budgetError}
          hasPendingWrites={hasPendingWrites}
          isFromCache={isFromCache}
          currency={currency}
          t={t}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onAddBudgetClick={() => {
            setBudgetToEdit(null);
            setIsAddBudgetOpen(true);
          }}
          onEditBudget={(budget) => {
            setBudgetToEdit(budget);
            setIsAddBudgetOpen(true);
          }}
          onDeleteBudget={deleteBudget}
          onLoadSampleData={() => loadSampleData(currency)}
        />
      ) : (
        <Settings 
          currency={currency}
          language={language}
          viewMode={viewMode}
          t={t}
          user={user}
          onCurrencyChange={handleCurrencyChange}
          onLanguageChange={handleLanguageChange}
          onViewModeChange={handleViewModeChange}
          onLoadSampleData={() => loadSampleData(currency)}
          onClearData={clearAllData}
        />
      )}

      <BottomNav activeTab={activeTab} onChange={setActiveTab} t={t} />

      <AddBudgetModal 
        isOpen={isAddBudgetOpen} 
        currency={currency}
        t={t}
        onClose={() => {
          setIsAddBudgetOpen(false);
          setBudgetToEdit(null);
        }} 
        onAdd={(budget) => addBudget({ ...budget, userId: user?.uid || '' })} 
        onEdit={updateBudget}
        initialData={budgetToEdit}
      />
    </div>
  );
}
