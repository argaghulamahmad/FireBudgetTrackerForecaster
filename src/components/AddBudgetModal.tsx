import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Budget } from '../types';
import { Currency, getCurrencySymbol, formatCurrencyInput, parseCurrencyInput } from '../utils/currency';
import { SearchableSelect } from './SearchableSelect';

interface AddBudgetModalProps {
  isOpen: boolean;
  currency: Currency;
  t: any;
  onClose: () => void;
  onAdd: (budget: Omit<Budget, 'id' | 'createdAt'>) => void;
  onEdit?: (id: number, budget: Partial<Omit<Budget, 'id' | 'createdAt'>>) => void;
  initialData?: Budget | null;
}

export function AddBudgetModal({ isOpen, currency, t, onClose, onAdd, onEdit, initialData }: AddBudgetModalProps) {
  const [name, setName] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [frequency, setFrequency] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Monthly');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDisplayAmount(formatCurrencyInput(initialData.amount.toString(), currency));
      setFrequency(initialData.frequency);
    } else {
      setName('');
      setDisplayAmount('');
      setFrequency('Monthly');
    }
  }, [initialData, isOpen, currency]);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value, currency);
    setDisplayAmount(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseCurrencyInput(displayAmount, currency);
    if (!name || !numericAmount) return;
    
    if (initialData && onEdit) {
      onEdit(initialData.id!, {
        name,
        amount: numericAmount,
        frequency,
        currency,
      });
    } else {
      onAdd({
        name,
        amount: numericAmount,
        frequency,
        currency,
      });
    }
    
    setName('');
    setDisplayAmount('');
    setFrequency('Monthly');
    onClose();
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
              onChange={(val) => setFrequency(val as any)}
              placeholder={t.frequency}
              searchPlaceholder={t.search || 'Search...'}
              noOptionsText={t.noOptions || 'No options found'}
            />
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl mt-6 hover:bg-blue-700 transition-colors"
          >
            {initialData ? t.saveChanges || 'Save Changes' : t.createBudget}
          </button>
        </form>
      </div>
    </div>
  );
}
