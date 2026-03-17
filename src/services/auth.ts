/**
 * src/services/auth.ts
 * 
 * Firebase Auth Initialization & Global Observer Pattern
 * 
 * This module sets up Firebase Auth and exposes the authenticated state
 * through a reactive observer pattern (onAuthStateChanged).
 * 
 * Key responsibilities:
 * - Initialize Firebase Auth singleton with getAuth()
 * - Set up global auth state observer at app start
 * - Handle loading states during SDK initialization
 * - Provide cleanup function for app unmount
 */

import { getAuth, onAuthStateChanged, Auth, User } from 'firebase/auth';
import { app } from '../db/firebase';

/**
 * Firebase Auth singleton instance
 * Returns the same instance every time it's called
 */
export const auth = getAuth(app);

/**
 * Subscription handle to onAuthStateChanged listener
 * Stored for cleanup on app unmount
 */
let authStateUnsubscribe: ReturnType<typeof onAuthStateChanged> | null = null;

/**
 * Initialize the Firebase Auth State Observer
 * 
 * MUST be called exactly ONCE during app startup (in useEffect of App component root).
 * This sets up the global listener that detects auth state changes.
 * 
 * Why onAuthStateChanged is superior to storing in localStorage:
 * 
 * 1. **Automatic Session Persistence**
 *    - Firebase SDK automatically restores user from browser storage
 *    - No manual token management needed
 *    - Works across page refreshes seamlessly
 * 
 * 2. **Token Refresh**
 *    - Firebase silently refreshes expired access tokens
 *    - User stays signed in even after token expiration (~1 hour)
 *    - If refresh fails, user is automatically signed out
 * 
 * 3. **Revocation Detection**
 *    - Detects if user was deleted on another device
 *    - Detects if all sessions were revoked
 *    - Automatically signs user out if detected
 * 
 * 4. **Multi-Tab Synchronization**
 *    - Multiple tabs automatically stay in sync
 *    - If user logs out on Tab A, Tab B detects it
 *    - No polling or manual sync needed
 * 
 * 5. **Loading State Handling**
 *    - Provides explicit "loading" state while Firebase initializes
 *    - Prevents UI flashing during initialization
 *    - Gives apps time to restore session from IndexedDB
 * 
 * @param onAuthChange Callback function called whenever auth state changes
 *                     Parameters: (user: User | null, loading: boolean)
 *                     - user: The authenticated user object or null if signed out
 *                     - loading: false when Firebase initialization is complete
 * 
 * @example
 * useEffect(() => {
 *   initAuthObserver((user, loading) => {
 *     setUser(user);
 *     setAuthLoading(loading);
 *   });
 *   return () => cleanupAuthObserver();
 * }, []);
 * 
 * Persistence Behavior:
 * - Default: browserLocalPersistence (IndexedDB)
 *   - Survives browser restart
 *   - Survives app close/reopen
 * - Private/Incognito: Automatically falls back to browserSessionPersistence
 *   - Cleared when browser closed
 * - Can be customized with setPersistence(auth, customPersistence)
 */
export function initAuthObserver(
  onAuthChange: (user: User | null, loading: boolean) => void
): void {
  if (authStateUnsubscribe) {
    console.warn('[Auth] Observer already initialized, skipping duplicate initialization');
    return;
  }

  authStateUnsubscribe = onAuthStateChanged(
    auth,
    (user: User | null) => {
      // Called immediately with current auth state (may be null)
      // Then called every time auth state changes
      console.log(
        '[Auth] Auth state changed:',
        user ? `${user.email} (${user.uid})` : 'signed out'
      );
      onAuthChange(user, false); // false = Firebase is ready
    },
    (error) => {
      // Called if onAuthStateChanged encounters an error
      // This is rare but can happen if auth service is disabled
      console.error('[Auth] Auth observer encountered error:', error);
    }
  );

  console.log('[Auth] Observer initialized');
}

/**
 * Cleanup function to unsubscribe from auth observer
 * 
 * MUST be called during app unmount to prevent memory leaks.
 * Remove the listener so auth state changes no longer trigger callbacks.
 * 
 * @example
 * useEffect(() => {
 *   initAuthObserver(...);
 *   return () => cleanupAuthObserver();
 * }, []);
 */
export function cleanupAuthObserver(): void {
  if (authStateUnsubscribe) {
    authStateUnsubscribe();
    authStateUnsubscribe = null;
    console.log('[Auth] Observer cleaned up');
  }
}

/**
 * Get the currently authenticated user synchronously
 * 
 * WARNING: Use sparingly and only after Firebase initialization is complete.
 * Prefer onAuthStateChanged (via initAuthObserver) for reactive updates.
 * 
 * This is useful for:
 * - Getting user UID for Firestore queries
 * - Checking if user is logged in synchronously
 * - One-time checks during component lifecycle
 * 
 * NOT suitable for:
 * - Rendering UI based on user state (use useState from observer)
 * - Route protection (use loading + user state from observer)
 * 
 * @returns The currently authenticated Firebase User object, or null if signed out
 * 
 * @example
 * const user = getCurrentUser();
 * if (user) {
 *   console.log('User UID:', user.uid);
 * }
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Get the user ID token for backend API calls
 * 
 * Use this when calling your backend APIs that verify Firebase tokens.
 * The backend uses Firebase Admin SDK to verify the token.
 * 
 * Tokens expire after ~1 hour. The forceRefresh parameter ensures
 * you get a fresh token if the current one is near expiration.
 * 
 * @param forceRefresh If true, forces Firebase to refresh the token.
 *                     Use true when calling critical APIs.
 * @returns JWT token string, or null if user is not authenticated
 * 
 * @example
 * const token = await auth.getIdToken(true);
 * const response = await fetch('/api/budgets', {
 *   headers: { 'Authorization': `Bearer ${token}` }
 * });
 */
export async function getIdToken(forceRefresh: boolean = false): Promise<string | null> {
  try {
    if (!auth.currentUser) {
      return null;
    }

    const token = await auth.currentUser.getIdToken(forceRefresh);
    return token;
  } catch (error) {
    console.error('[Auth] Failed to get ID token:', error);
    return null;
  }
}
