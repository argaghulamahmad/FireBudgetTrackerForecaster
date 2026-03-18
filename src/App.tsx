/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Home as HomeIcon, Settings as SettingsIcon, Wallet } from 'lucide-react';
import { cn } from './utils/cn';
import { initAuthObserver, cleanupAuthObserver } from './services/auth';
import { useBudgets } from './hooks/useBudgets';
import { BudgetProvider } from './context/BudgetContext';
import { ToastProvider } from './context/ToastContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { AddBudgetModal } from './components/AddBudgetModal';
import { ToastContainer } from './components/ToastContainer';
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
  } = useBudgets(user?.uid ?? null);

  // ==================== UI State ====================
  const [activeTab, setActiveTab] = useState<'home' | 'settings'>('home');
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [currency, setCurrency] = useState<Currency>('IDR');
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
  /**
   * Load UI preferences from localStorage with sensible defaults:
   * - Language: 'en' (English)
   * - Currency: 'IDR' (Indonesian Rupiah)
   * - View Mode: 'detailed'
   * - Sort Order & Grouping: managed in Home.tsx
   */
  useEffect(() => {
    const savedCurrency = localStorage.getItem('budget_currency') as Currency;
    if (savedCurrency === 'USD' || savedCurrency === 'IDR') {
      setCurrency(savedCurrency);
    } else {
      setCurrency('IDR');
      localStorage.setItem('budget_currency', 'IDR');
    }

    const savedLanguage = localStorage.getItem('budget_language') as Language;
    if (savedLanguage === 'en' || savedLanguage === 'id') {
      setLanguage(savedLanguage);
    } else {
      setLanguage('en');
      localStorage.setItem('budget_language', 'en');
    }

    const savedViewMode = localStorage.getItem('budget_view_mode') as 'compact' | 'detailed';
    if (savedViewMode === 'compact' || savedViewMode === 'detailed') {
      setViewMode(savedViewMode);
    } else {
      setViewMode('detailed');
      localStorage.setItem('budget_view_mode', 'detailed');
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
  return (
    <ToastProvider>
      {authLoading ? (
        // Loading state
        <div className="min-h-screen bg-health-bg flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-health-separator border-t-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-health-secondary text-[13px]">{t.loading || 'Initializing...'}</p>
          </div>
        </div>
      ) : !user ? (
        // Not authenticated → show login page
        <Login t={t} />
      ) : (
        // Authenticated → show dashboard
        <PreferencesProvider
          currency={currency}
          language={language}
          viewMode={viewMode}
          onCurrencyChange={handleCurrencyChange}
          onLanguageChange={handleLanguageChange}
          onViewModeChange={handleViewModeChange}
        >
          <BudgetProvider
            budgetState={{
              budgets,
              loading: budgetLoading,
              error: budgetError,
              hasPendingWrites,
              isFromCache,
              addBudget,
              updateBudget,
              deleteBudget,
              clearAllData,
              loadSampleData: (curr) => loadSampleData(curr),
              refetch: async () => {
                /* refetch handled by listener */
              },
            }}
          >
            <div className="min-h-screen bg-health-bg font-sans">
              {/* Desktop side nav rail — hidden on mobile */}
              <nav className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-[72px] lg:z-40 bg-white/80 backdrop-blur-xl border-r border-health-separator items-center pt-6 pb-8 gap-1">
                <div className="w-9 h-9 bg-indigo-600 rounded-[14px] flex items-center justify-center mb-5 flex-shrink-0 shadow-sm shadow-indigo-200 select-none">
                  <Wallet className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className={cn(
                    'flex flex-col items-center gap-1 px-1 py-2 rounded-2xl w-[52px] transition-all',
                    activeTab === 'home'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-health-tertiary hover:text-health-secondary hover:bg-health-bg'
                  )}
                >
                  <HomeIcon className="w-5 h-5" />
                  <span className="text-[9px] font-semibold">{t.home}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={cn(
                    'flex flex-col items-center gap-1 px-1 py-2 rounded-2xl w-[52px] transition-all',
                    activeTab === 'settings'
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-health-tertiary hover:text-health-secondary hover:bg-health-bg'
                  )}
                >
                  <SettingsIcon className="w-5 h-5" />
                  <span className="text-[9px] font-semibold">{t.settings}</span>
                </button>
              </nav>

              {/* Content area */}
              <div className="min-h-screen max-w-[640px] mx-auto lg:max-w-none lg:ml-[72px] bg-health-bg relative text-health-text selection:bg-indigo-100 overflow-x-hidden">
                {activeTab === 'home' ? (
                  <Home
                    t={t}
                    onAddBudgetClick={() => {
                      setBudgetToEdit(null);
                      setIsAddBudgetOpen(true);
                    }}
                    onEditBudget={(budget) => {
                      setBudgetToEdit(budget);
                      setIsAddBudgetOpen(true);
                    }}
                  />
                ) : (
                  <Settings
                    t={t}
                    user={user}
                  />
                )}

                {/* Bottom nav — mobile only */}
                <div className="lg:hidden">
                  <BottomNav activeTab={activeTab} onChange={setActiveTab} t={t} />
                </div>

                <AddBudgetModal
                  isOpen={isAddBudgetOpen}
                  t={t}
                  onClose={() => {
                    setIsAddBudgetOpen(false);
                    setBudgetToEdit(null);
                  }}
                  onAdd={(budget) => addBudget({ ...budget, userId: user?.uid ?? '' })}
                  onEdit={updateBudget}
                  initialData={budgetToEdit}
                />
              </div>
            </div>
          </BudgetProvider>
        </PreferencesProvider>
      )}
      <ToastContainer />
    </ToastProvider>
  );
}
