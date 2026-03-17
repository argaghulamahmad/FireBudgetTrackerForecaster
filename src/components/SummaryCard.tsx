import { Budget } from '../types';
import { Activity, CalendarDays } from 'lucide-react';
import { Currency, formatCurrency } from '../utils/currency';
import { getTimeMetrics } from '../utils/time';

interface SummaryCardProps {
  budgets: Budget[];
  currency: Currency;
  t: any;
  viewMode?: 'compact' | 'detailed';
}

export function SummaryCard({ budgets, currency, t, viewMode = 'detailed' }: SummaryCardProps) {
  let totalAmount = 0;
  let totalIdealSpent = 0;
  let totalDailyAllowance = 0;

  budgets.forEach(b => {
    const metrics = getTimeMetrics(b.frequency, b.excludeWeekends);
    totalAmount += b.amount;
    const idealSpent = (b.amount * metrics.percentage) / 100;
    totalIdealSpent += idealSpent;
    
    const remaining = b.amount - idealSpent;
    totalDailyAllowance += metrics.remainingDays > 0 ? remaining / metrics.remainingDays : remaining;
  });

  const totalRemaining = totalAmount - totalIdealSpent;
  const percentage = totalAmount > 0 ? (totalIdealSpent / totalAmount) * 100 : 0;

  if (viewMode === 'compact') {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 p-1.5 rounded-lg">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">{t.totalHealth}</h2>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalRemaining, currency)}</p>
            <p className="text-xs text-gray-500">{t.shouldBeRemaining}</p>
          </div>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              percentage > 90 ? 'bg-red-500' : percentage > 75 ? 'bg-orange-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-blue-50 p-2 rounded-full">
          <Activity className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{t.totalHealth}</h2>
      </div>
      
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500 mb-1">{t.shouldBeRemaining}</p>
        <p className="text-4xl font-bold text-gray-900">{formatCurrency(totalRemaining, currency)}</p>
      </div>

      <div className="mb-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          <p className="text-sm font-medium text-blue-800">{t.dailyAllowance}</p>
        </div>
        <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalDailyAllowance, currency)}</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-gray-500">{t.forecastedSpent}: {formatCurrency(totalIdealSpent, currency)}</span>
          <span className="text-gray-500">{t.total}: {formatCurrency(totalAmount, currency)}</span>
        </div>
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              percentage > 90 ? 'bg-red-500' : percentage > 75 ? 'bg-orange-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
