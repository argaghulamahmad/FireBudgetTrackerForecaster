export interface Budget {
  id: string; // Firestore document ID (string)
  name: string;
  amount: number;
  frequency: 'Weekly' | 'Monthly' | 'Yearly';
  currency: 'USD' | 'IDR';
  createdAt: number; // Milliseconds since epoch
  excludeWeekends?: boolean;
}
