export interface Budget {
  id: string; // Firestore document ID (string)
  userId: string; // Firebase Auth UID (required for data isolation)
  name: string;
  amount: number;
  frequency: 'Weekly' | 'Monthly' | 'Yearly';
  currency: 'USD' | 'IDR';
  createdAt: number; // Milliseconds since epoch
  excludeWeekends?: boolean;
}
