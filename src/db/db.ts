import Dexie, { type EntityTable } from 'dexie';
import { Budget } from '../types';

export const db = new Dexie('BudgetDB') as Dexie & {
  budgets: EntityTable<Budget, 'id'>;
};

db.version(2).stores({
  budgets: '++id, name, frequency, currency, createdAt'
});
