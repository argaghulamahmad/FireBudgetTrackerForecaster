/**
 * Firestore Database Layer
 * 
 * This module provides CRUD operations using Firestore
 * Replaces IndexedDB (Dexie) with cloud-native Firestore
 * 
 * Key Patterns:
 * - Unsubscribe pattern for real-time listeners
 * - Error handling with offline queueing
 * - Metadata.hasPendingWrites for UI feedback
 * - Timestamp-based ordering (serverTimestamp)
 */

import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  Query,
  QueryConstraint,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Budget } from '../types';

/**
 * Firestore Collection Name
 */
const BUDGETS_COLLECTION = 'budgets';

/**
 * TYPE DEFINITIONS FOR FIRESTORE
 */

/**
 * Budget Document in Firestore
 * Note: Firestore auto-generates document IDs
 */
export interface FirestoreBudget {
  name: string;
  amount: number;
  frequency: 'Weekly' | 'Monthly' | 'Yearly';
  currency: 'USD' | 'IDR';
  createdAt: Timestamp | number; // Can be Timestamp or milliseconds
  excludeWeekends?: boolean;
}

/**
 * Listener Callback Type
 */
export type BudgetListener = (budgets: Budget[], error?: Error) => void;

/**
 * READ OPERATIONS
 */

/**
 * Fetch all budgets as a one-time read
 * 
 * Use Case: Initial page load, or when you don't need real-time updates
 * 
 * @returns Array of budgets sorted by creation date (newest first)
 * @throws FirebaseError if query fails
 */
export async function getAllBudgets(): Promise<Budget[]> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
    ];
    const q = query(
      collection(db, BUDGETS_COLLECTION),
      ...constraints
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      ...convertFirestoreToBudget(doc.data() as FirestoreBudget),
      id: doc.id,
    }));
  } catch (error) {
    console.error('Error fetching budgets:', error);
    throw error;
  }
}

/**
 * Subscribe to Real-Time Budget Updates
 * 
 * Use Case: Keep UI synchronized with Firestore (primary use case)
 * 
 * Features:
 * - Offline queueing: Local changes queue until reconnect
 * - hasPendingWrites: Indicates if changes are awaiting server confirmation
 * - Automatic reconnection on network recovery
 * 
 * Edge Case: Permission Denied
 * If Security Rules don't allow reading, the error callback fires
 * Gracefully handle by showing cached data or error message
 * 
 * @param onNext Callback with updated budgets
 * @param onError Callback for errors (Security Rules, network, etc.)
 * @returns Unsubscribe function to stop listening
 */
export function subscribeTobudgets(
  onNext: BudgetListener,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
    ];
    const q = query(
      collection(db, BUDGETS_COLLECTION),
      ...constraints
    );

    // Real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Convert docs to Budget objects
        const budgets = snapshot.docs.map((doc) => ({
          ...convertFirestoreToBudget(doc.data() as FirestoreBudget),
          id: doc.id,
        }));

        // Metadata: Distinguish between local changes and server data
        const hasPendingWrites = snapshot.metadata.hasPendingWrites;
        const isFromCache = snapshot.metadata.fromCache;

        // Log for debugging
        console.log(`📊 Budgets updated (pending: ${hasPendingWrites}, cache: ${isFromCache})`);

        // Invoke callback
        onNext(budgets);
      },
      (error) => {
        console.error('❌ Error listening to budgets:', error);
        
        // Handle specific Firestore errors
        if (error.code === 'permission-denied') {
          console.error('🔒 Security Rules denied access to budgets collection');
        } else if (error.code === 'unavailable') {
          console.warn('⚠️ Firestore temporarily unavailable, using cached data');
        }

        if (onError) {
          onError(new Error(`Firestore listener error: ${error.message}`));
        }
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to budgets:', error);
    if (onError && error instanceof Error) {
      onError(error);
    }
    return () => {}; // Return no-op unsubscribe
  }
}

/**
 * WRITE OPERATIONS
 */

/**
 * Add a New Budget
 * 
 * Firestore Behavior:
 * - Auto-generates document ID
 * - Sets createdAt to server timestamp
 * - Offline: Queues write locally, syncs on reconnect
 * 
 * @param budget Budget data without id and createdAt
 * @returns Promise with new document ID
 * @throws FirebaseError if write fails
 */
export async function addBudget(
  budget: Omit<Budget, 'id' | 'createdAt'>
): Promise<string> {
  try {
    // Add with server timestamp
    const docRef = await addDoc(
      collection(db, BUDGETS_COLLECTION),
      {
        ...budget,
        createdAt: serverTimestamp(),
      }
    );

    console.log('✅ Budget added:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding budget:', error);
    throw error;
  }
}

/**
 * Update Existing Budget
 * 
 * Firestore Behavior:
 * - Merges with existing document (doesn't overwrite)
 * - Preserves createdAt
 * - Offline: Queues update locally
 * 
 * @param id Budget document ID
 * @param updates Partial budget data to update
 * @throws FirebaseError if update fails
 */
export async function updateBudget(
  id: string,
  updates: Partial<Omit<Budget, 'id' | 'createdAt'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, BUDGETS_COLLECTION, id), updates);
    console.log('✅ Budget updated:', id);
  } catch (error) {
    console.error('Error updating budget:', error);
    throw error;
  }
}

/**
 * Delete Budget
 * 
 * Firestore Behavior:
 * - Removes entire document
 * - Offline: Queues deletion locally
 * 
 * @param id Budget document ID
 * @throws FirebaseError if delete fails
 */
export async function deleteBudget(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, BUDGETS_COLLECTION, id));
    console.log('✅ Budget deleted:', id);
  } catch (error) {
    console.error('Error deleting budget:', error);
    throw error;
  }
}

/**
 * Batch Operations
 */

/**
 * Clear All Budgets
 * 
 * Uses WriteBatch for atomic multi-document delete
 * Note: Cannot delete all docs atomically; must fetch first
 * 
 * @throws FirebaseError if batch fails
 */
export async function clearAllBudgets(): Promise<void> {
  try {
    // Fetch all docs first
    const q = query(collection(db, BUDGETS_COLLECTION));
    const snapshot = await getDocs(q);

    // Delete in batch (Firestore limit: 500 per batch)
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log('✅ All budgets cleared');
  } catch (error) {
    console.error('Error clearing budgets:', error);
    throw error;
  }
}

/**
 * Load Sample Data
 * 
 * Uses WriteBatch for atomicity
 * 
 * @param currency 'USD' | 'IDR'
 * @throws FirebaseError if batch fails
 */
export async function loadSampleBudgets(
  currency: 'USD' | 'IDR'
): Promise<void> {
  try {
    const batch = writeBatch(db);

    const sampleData =
      currency === 'USD'
        ? [
            {
              name: 'Coffee',
              amount: 50,
              frequency: 'Weekly' as const,
              currency: 'USD' as const,
              excludeWeekends: false,
              createdAt: serverTimestamp(),
            },
            {
              name: 'Groceries',
              amount: 400,
              frequency: 'Monthly' as const,
              currency: 'USD' as const,
              excludeWeekends: false,
              createdAt: serverTimestamp(),
            },
            {
              name: 'Rent',
              amount: 1200,
              frequency: 'Monthly' as const,
              currency: 'USD' as const,
              excludeWeekends: true,
              createdAt: serverTimestamp(),
            },
          ]
        : [
            {
              name: 'Kopi',
              amount: 150000,
              frequency: 'Weekly' as const,
              currency: 'IDR' as const,
              excludeWeekends: false,
              createdAt: serverTimestamp(),
            },
            {
              name: 'Belanja',
              amount: 2000000,
              frequency: 'Monthly' as const,
              currency: 'IDR' as const,
              excludeWeekends: false,
              createdAt: serverTimestamp(),
            },
            {
              name: 'Sewa Kos',
              amount: 2000000,
              frequency: 'Monthly' as const,
              currency: 'IDR' as const,
              excludeWeekends: true,
              createdAt: serverTimestamp(),
            },
          ];

    sampleData.forEach((budget) => {
      const docRef = doc(collection(db, BUDGETS_COLLECTION));
      batch.set(docRef, budget);
    });

    await batch.commit();
    console.log('✅ Sample budgets loaded');
  } catch (error) {
    console.error('Error loading sample data:', error);
    throw error;
  }
}

/**
 * HELPER FUNCTIONS
 */

/**
 * Convert Firestore Document to Budget Type
 * 
 * Handles timestamp conversion from Firestore Timestamp to milliseconds
 */
function convertFirestoreToBudget(doc: FirestoreBudget): Omit<Budget, 'id'> {
  return {
    name: doc.name,
    amount: doc.amount,
    frequency: doc.frequency,
    currency: doc.currency,
    excludeWeekends: doc.excludeWeekends || false,
    createdAt:
      doc.createdAt instanceof Timestamp
        ? doc.createdAt.toMillis()
        : (doc.createdAt as number),
  };
}

/**
 * EXPORT FOR TESTING
 */
export { db };
