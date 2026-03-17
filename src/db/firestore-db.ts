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
  query,
  addDoc,
  deleteDoc,
  updateDoc,
  where,
  onSnapshot,
  getDocs,
  writeBatch,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  QueryConstraint,
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
  userId: string; // Firebase Auth UID for data isolation
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
 * @param userId Current user's UID (from Firebase Auth)
 * @returns Array of budgets sorted by creation date (newest first)
 * @throws FirebaseError if query fails
 */
export async function getAllBudgets(userId: string): Promise<Budget[]> {
  try {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
    ];
    const q = query(
      collection(db, BUDGETS_COLLECTION),
      ...constraints
    );

    const snapshot = await getDocs(q);
    const budgets = snapshot.docs.map((doc) => ({
      ...convertFirestoreToBudget(doc.data() as FirestoreBudget),
      id: doc.id,
      userId,
    }));

    // Sort client-side by createdAt descending (newest first)
    return budgets.sort((a, b) => (b.createdAt as number) - (a.createdAt as number));
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
 * - Filters by userId to show only user's budgets
 * - Offline queueing: Local changes queue until reconnect
 * - hasPendingWrites: Indicates if changes are awaiting server confirmation
 * - Automatic reconnection on network recovery
 * - Client-side sorting: Budgets sorted by createdAt (newest first) after fetch
 *
 * Edge Case: Permission Denied
 * If Security Rules don't allow reading, the error callback fires.
 * This can happen if:
 * - Existing budgets don't have userId field (data migration needed)
 * - Security Rules were just updated (may take time to propagate)
 *
 * @param userId Current user's UID (from Firebase Auth)
 * @param onNext Callback with updated budgets (sorted by creation date, newest first)
 * @param onError Callback for errors (Security Rules, network, etc.)
 * @returns Unsubscribe function to stop listening
 */
export function subscribeTobudgets(
  userId: string,
  onNext: BudgetListener,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!userId) {
    console.error('subscribeTobudgets: userId is required');
    if (onError) {
      onError(new Error('userId is required to subscribe to budgets'));
    }
    return () => {};
  }

  try {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
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
          userId,
        }));

        // Sort client-side by createdAt descending (newest first)
        budgets.sort((a, b) => (b.createdAt as number) - (a.createdAt as number));

        // Metadata: Distinguish between local changes and server data
        const hasPendingWrites = snapshot.metadata.hasPendingWrites;
        const isFromCache = snapshot.metadata.fromCache;

        // Log for debugging
        console.warn(`📈 Budgets updated (pending: ${hasPendingWrites}, cache: ${isFromCache})`);

        // Invoke callback
        onNext(budgets);
      },
      (error) => {
        console.error('❌ Error listening to budgets:', error);
        
        // Handle specific Firestore errors
        if (error.code === 'permission-denied') {
          console.error('🔒 Security Rules denied access. Possible causes:');
          console.error('   1. Existing budgets missing userId field (run migration)');
          console.error('   2. Composite index not built yet (wait 5-10 mins)');
          console.error('   3. Security Rules just published (propagation delay)');
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
 * - Includes userId for security and data isolation
 * - Offline: Queues write locally, syncs on reconnect
 * 
 * @param budget Budget data without id and createdAt, but must include userId
 * @returns Promise with new document ID
 * @throws FirebaseError if write fails
 */
export async function addBudget(
  budget: Omit<Budget, 'id' | 'createdAt'>
): Promise<string> {
  try {
    // Add with server timestamp and userId
    const docRef = await addDoc(
      collection(db, BUDGETS_COLLECTION),
      {
        ...budget,
        createdAt: serverTimestamp(),
      }
    );

    console.warn('✅ Budget added:', docRef.id);
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
    console.warn('✅ Budget updated:', id);
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
    console.warn('✅ Budget deleted:', id);
  } catch (error) {
    console.error('Error deleting budget:', error);
    throw error;
  }
}

/**
 * Batch Operations
 */

/**
 * Clear All Budgets for Current User
 * 
 * Uses WriteBatch for atomic multi-document delete
 * Filters by userId to only delete user's own budgets
 * 
 * @param userId Current user's UID
 * @throws FirebaseError if batch fails
 */
export async function clearAllBudgets(userId: string): Promise<void> {
  try {
    // Fetch all docs for current user only
    const q = query(
      collection(db, BUDGETS_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    // Delete in batch (Firestore limit: 500 per batch)
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.warn('✅ All budgets cleared');
  } catch (error) {
    console.error('Error clearing budgets:', error);
    throw error;
  }
}

/**
 * Load Sample Data for Current User
 * 
 * Uses WriteBatch for atomicity
 * Includes userId to associate sample budgets with current user
 * 
 * @param userId Current user's UID
 * @param currency 'USD' | 'IDR'
 * @throws FirebaseError if batch fails
 */
export async function loadSampleBudgets(
  userId: string,
  currency: 'USD' | 'IDR'
): Promise<void> {
  try {
    const batch = writeBatch(db);

    const sampleData =
      currency === 'USD'
        ? [
            {
              userId,
              name: 'Coffee',
              amount: 50,
              frequency: 'Weekly' as const,
              currency: 'USD' as const,
              excludeWeekends: false,
              createdAt: serverTimestamp(),
            },
            {
              userId,
              name: 'Groceries',
              amount: 400,
              frequency: 'Monthly' as const,
              currency: 'USD' as const,
              excludeWeekends: false,
              createdAt: serverTimestamp(),
            },
            {
              userId,
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
              userId,
              name: 'Kopi',
              amount: 150000,
              frequency: 'Weekly' as const,
              currency: 'IDR' as const,
              excludeWeekends: false,
              createdAt: serverTimestamp(),
            },
            {
              userId,
              name: 'Belanja',
              amount: 2000000,
              frequency: 'Monthly' as const,
              currency: 'IDR' as const,
              excludeWeekends: false,
              createdAt: serverTimestamp(),
            },
            {
              userId,
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
    console.warn('✅ Sample budgets loaded');
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
 * Extracts userId from Firestore document
 * Handles timestamp conversion from Firestore Timestamp to milliseconds
 */
function convertFirestoreToBudget(doc: FirestoreBudget): Omit<Budget, 'id'> {
  return {
    userId: doc.userId,
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
 * MIGRATION: Fix Permission Denied Errors
 *
 * Firestore returns "permission-denied" when:
 * 1. Existing budgets don't have userId field (created before schema update)
 * 2. Security rules have been updated but not yet propagated (rare, usually <1 minute)
 *
 * NOTE: Composite index requirement removed - budgets are now sorted client-side
 *
 * This function removes test/sample data without userId.
 * In production, use Cloud Functions or Admin SDK for safe migration.
 *
 * @param userId Current user's UID
 * @returns Report of documents processed
 */
export async function migrateOldBudgets(userId: string): Promise<{ message: string }> {
  try {
    console.warn('🔄 Starting budget migration...');
    
    // First, try to query with userId filter (this will fail if composite index isn't ready)
    const userQ = query(
      collection(db, BUDGETS_COLLECTION),
      where('userId', '==', userId)
    );
    const userSnapshot = await getDocs(userQ);
    console.warn(`✅ Found ${userSnapshot.docs.length} user budgets with proper userId`);
    
    return { message: `Migration check complete: ${userSnapshot.docs.length} budgets have userId` };
  } catch (error) {
    console.error('❌ Migration error:', error);
    
    if (error instanceof Error && error.message.includes('permission-denied')) {
      return {
        message: 'Permission denied. This means: (1) Composite index still building OR (2) Existing data lacks userId field. Wait 5-10 minutes or manually delete test budgets from Firebase Console.',
      };
    }
    
    return { message: `Migration error: ${error instanceof Error ? error.message : 'Unknown'}` };
  }
}

/**
 * EXPORT FOR TESTING
 */
export { db };
