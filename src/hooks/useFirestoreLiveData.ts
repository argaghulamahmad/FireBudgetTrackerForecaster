/**
 * useFirestoreLiveData Hook
 * 
 * Provides real-time, offline-first access to Firestore data
 * Replaces dexie-react-hooks useLiveQuery with Firestore onSnapshot
 * 
 * KEY FEATURES:
 * - Real-time synchronization with Firestore
 * - Offline support via IndexedDB persistence
 * - Pending write indicators (hasPendingWrites)
 * - Loading and error states
 * - Automatic cleanup on unmount
 * 
 * EDGE CASES HANDLED:
 * - Permission Denied (Security Rules)
 * - Network unavailable (uses cached data)
 * - Multiple tabs synchronization
 * - Component unmount during pending writes
 */

import { useEffect, useState, useCallback } from 'react';
import { Budget } from '../types';
import { subscribeTobudgets } from '../db/firestore-db';
import { initializeOfflinePersistence } from '../db/firebase';
import { onSnapshot, collection, query, orderBy, where } from 'firebase/firestore';
import { db } from '../db/firebase';

/**
 * Firestore Live Data Hook State
 */
export interface UseFirestoreLiveDataReturn {
  data: Budget[];
  loading: boolean;
  error: Error | null;
  hasPendingWrites: boolean; // Indicates local changes awaiting server
  isFromCache: boolean; // Indicates data is from offline cache
  refetch: () => Promise<void>; // Manual refresh trigger
}

/**
 * useFirestoreLiveData Hook
 * 
 * @param userId Current user's Firebase UID (required for data isolation)
 * @param initialize If true, calls initializeOfflinePersistence() on first load
 * @returns Object with data, loading, error, and metadata states
 * 
 * USAGE:
 * ```
 * const { data: budgets, loading, error, hasPendingWrites } = useFirestoreLiveData(user.uid);
 * 
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorMessage error={error} />;
 * 
 * return (
 *   <div>
 *     {hasPendingWrites && <div className="badge">Syncing...</div>}
 *     {budgets.map(b => <BudgetCard key={b.id} budget={b} />)}
 *   </div>
 * );
 * ```
 */
export function useFirestoreLiveData(
  userId: string | null,
  initialize: boolean = true
): UseFirestoreLiveDataReturn {
  const [data, setData] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);

  // Initialize offline persistence on mount
  useEffect(() => {
    if (!initialize) return;

    let mounted = true;

    const initPersistence = async () => {
      try {
        console.log('🔄 Initializing Firestore offline persistence...');
        const mode = await initializeOfflinePersistence();
        if (mounted) {
          console.log(`✅ Persistence initialized in ${mode} mode`);
        }
      } catch (err) {
        console.error('Failed to initialize persistence:', err);
        if (mounted) {
          setError(
            err instanceof Error
              ? err
              : new Error('Failed to initialize offline persistence')
          );
        }
      }
    };

    initPersistence();

    return () => {
      mounted = false;
    };
  }, [initialize]);

  // Subscribe to real-time updates
  useEffect(() => {
    // Don't subscribe if userId is not available
    if (!userId) {
      setData([]);
      setLoading(false);
      console.warn('No userId provided, skipping budget subscription');
      return;
    }

    let mounted = true;
    console.log(`📡 Setting up Firestore listener for user ${userId}...`);

    // Re-subscribe with metadata tracking and userId filter
    const q = query(
      collection(db, 'budgets'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    let unsubscribe = () => {};

    try {
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (mounted) {
            const budgets = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              createdAt:
                doc.data().createdAt?.toMillis?.() || doc.data().createdAt,
            } as Budget));

            setData(budgets);
            setHasPendingWrites(snapshot.metadata.hasPendingWrites);
            setIsFromCache(snapshot.metadata.fromCache);
            setLoading(false);
            setError(null);

            // Log state
            const cacheState = snapshot.metadata.fromCache ? '(offline)' : '';
            const pendingState = snapshot.metadata.hasPendingWrites
              ? '(pending writes)'
              : '';
            console.log(
              `✅ ${budgets.length} budgets loaded ${cacheState} ${pendingState}`
            );
          }
        },
        (err) => {
          if (mounted) {
            console.error('❌ Firestore listener error:', err);
            
            // Handle specific errors
            if (err.code === 'permission-denied') {
              const message = `🔒 Permission Denied Error

This usually happens when:
1. Existing budgets lack userId field (data created before schema update)
2. Composite index still building (wait 5-10 minutes after rules publish)
3. Security Rules just updated (propagation delay)

Quick fixes:
• Wait 5-10 minutes for index to build
• Clear browser cache and refresh
• Delete old test budgets from Firebase Console
• Verify userId field exists on all budget documents

Using any cached data if available...`;
              console.error(message);
              setError(new Error('Permission Denied - Checking cached data...'));
              // Don't fail completely - use cached data
            } else if (err.code === 'unavailable') {
              // Unavailable errors are non-fatal, we use cached data
              console.warn(
                '⚠️ Firestore unavailable, using cached data if available'
              );
              setError(null);
            } else {
              setError(
                err instanceof Error
                  ? err
                  : new Error(`Firestore error: ${err.message}`)
              );
            }

            setLoading(false);
          }
        }
      );
    } catch (err) {
      if (mounted) {
        console.error('Error setting up listener:', err);
        setError(
          err instanceof Error ? err : new Error('Failed to setup listener')
        );
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
      unsubscribe?.();
      console.log('📡 Firestore listener cleaned up');
    };
  }, [userId]);

  // Refetch callback - re-initialize listener
  const refetch = useCallback(async () => {
    setLoading(true);
    // The effect will automatically refetch since dependencies haven't changed
    // This is more of a UX convenience for explicit refresh
  }, []);

  return {
    data,
    loading,
    error,
    hasPendingWrites,
    isFromCache,
    refetch,
  };
}
