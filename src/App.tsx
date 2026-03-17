/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useBudgets } from './hooks/useBudgets';
import { AddBudgetModal } from './components/AddBudgetModal';
import { BottomNav } from './components/BottomNav';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Currency } from './utils/currency';
import { Language, translations } from './utils/i18n';

export default function App() {
  const { budgets, addBudget, updateBudget, deleteBudget, loadSampleData, clearAllData } = useBudgets();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'settings'>('home');
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [language, setLanguage] = useState<Language>('en');
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');

  useEffect(() => {
    const auth = localStorage.getItem('budget_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
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

  const handleLogin = () => {
    localStorage.setItem('budget_auth', 'true');
    setIsAuthenticated(true);
  };

  const t = translations[language];

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} t={t} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-blue-100">
      
      {activeTab === 'home' ? (
        <Home 
          budgets={budgets}
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
        onAdd={addBudget} 
        onEdit={updateBudget}
        initialData={budgetToEdit}
      />
    </div>
  );
}
