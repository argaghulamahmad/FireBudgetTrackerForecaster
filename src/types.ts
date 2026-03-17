export interface Budget {
  id?: number;
  name: string;
  amount: number;
  frequency: 'Weekly' | 'Monthly' | 'Yearly';
  currency: 'USD' | 'IDR';
  createdAt: number;
}
