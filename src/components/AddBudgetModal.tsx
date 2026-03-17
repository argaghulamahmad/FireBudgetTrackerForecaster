import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Budget } from '../types';
import { Currency, getCurrencySymbol, formatCurrencyInput, parseCurrencyInput } from '../utils/currency';
import { SearchableSelect } from './SearchableSelect';

interface Translations {
  [key: string]: string;
}

interface AddBudgetModalProps {
  isOpen: boolean;
  currency: Currency;
  t: Translations;
  onClose: () => void;
  onAdd: (budget: Omit<Budget, 'id' | 'createdAt'>) => Promise<string>;
  onEdit?: (id: string, budget: Partial<Omit<Budget, 'id' | 'createdAt'>>) => Promise<void>;
  initialData?: Budget | null;
}

export function AddBudgetModal({ isOpen, currency, t, onClose, onAdd, onEdit, initialData }: AddBudgetModalProps) {
  const [name, setName] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [frequency, setFrequency] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  const [excludeWeekends, setExcludeWeekends] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDisplayAmount(formatCurrencyInput(initialData.amount.toString(), currency));
      setFrequency(initialData.frequency);
      setExcludeWeekends(initialData.excludeWeekends || false);
    } else {
      setName('');
      setDisplayAmount('');
      setFrequency('Monthly');
      setExcludeWeekends(false);
    }
  }, [initialData, isOpen, currency]);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value, currency);
    setDisplayAmount(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseCurrencyInput(displayAmount, currency);
    if (!name || !numericAmount) return;
    
    try {
      setIsSubmitting(true);
      if (initialData && onEdit) {
        await onEdit(initialData.id, {
          name,
          amount: numericAmount,
          frequency,
          currency,
          excludeWeekends,
        });
      } else {
        await onAdd({
          name,
          amount: numericAmount,
          frequency,
          currency,
          excludeWeekends,
        });
      }
      
      setName('');
      setDisplayAmount('');
      setFrequency('Monthly');
      setExcludeWeekends(false);
      onClose();
    } catch (error) {
      console.error('Error saving budget:', error);
      // Error handling could be enhanced with a toast notification
    } finally {
      setIsSubmitting(false);
    }
  };

  const frequencyOptions = [
    { label: t.weekly, value: 'Weekly' },
    { label: t.monthly, value: 'Monthly' },
    { label: t.yearly, value: 'Yearly' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">{initialData ? t.editBudget || 'Edit Budget' : t.newBudget}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:text-gray-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.name}</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g. Groceries"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.totalAmount}</label>
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all overflow-hidden">
              <span className="pl-4 pr-1 text-gray-500">{getCurrencySymbol(currency)}</span>
              <input 
                type="text" 
                inputMode="decimal"
                required
                value={displayAmount}
                onChange={handleAmountChange}
                className="w-full py-3 pr-4 bg-transparent outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.frequency}</label>
            <SearchableSelect
              options={frequencyOptions}
              value={frequency}
              onChange={(val) => setFrequency(val as 'Weekly' | 'Monthly' | 'Yearly')}
              placeholder={t.frequency}
              searchPlaceholder={t.search || 'Search...'}
              noOptionsText={t.noOptions || 'No options found'}
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <input 
              type="checkbox"
              id="excludeWeekends"
              checked={excludeWeekends}
              onChange={(e) => setExcludeWeekends(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="excludeWeekends" className="text-sm font-medium text-gray-700 cursor-pointer">{t.excludeWeekends}</label>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl mt-6 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {initialData ? t.saveChanges || 'Save Changes' : t.createBudget}
          </button>
        </form>
      </div>
    </div>
  );
}
