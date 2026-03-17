/**
 * Firebase Initialization with Firestore Offline Persistence
 * 
 * This module initializes Firebase and Firestore with offline-first support.
 * 
 * Key Features:
 * - Persistent IndexedDB cache for offline access
 * - Automatic conflict resolution with server
 * - Real-time listener support with offline queueing
 * - Multi-tab compatible (with fallback to single-tab)
 */

import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  connectFirestoreEmulator,
  PersistenceSettings,
} from 'firebase/firestore';

/**
 * Firebase Configuration
 * TODO: Replace with your Firebase project config
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Initialize Firebase App
 * This creates a singleton Firebase app instance
 */
export const app = initializeApp(firebaseConfig);

/**
 * Initialize Firestore with Custom Settings
 * 
 * Configuration:
 * - experimentalForceLongPolling: Ensures compatibility with restrictive networks
 * - ignoreUndefinedProperties: Prevents errors when undefined data is written
 */
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: false,
  ignoreUndefinedProperties: true,
});

/**
 * Initialize Offline Persistence
 * 
 * Step 1: Attempt multi-tab persistence (works across all tabs)
 * Step 2: Fallback to single-tab persistence
 * Step 3: Fallback to no persistence if both fail
 * 
 * Edge Cases Handled:
 * - 'failed-precondition': Another tab already has persistence enabled
 * - 'unimplemented': Browser doesn't support IndexedDB (old browsers)
 * - 'invalid-argument': Persistence already enabled
 */
export async function initializeOfflinePersistence(): Promise<
  'multi-tab' | 'single-tab' | 'none'
> {
  try {
    // Try: Enable multi-tab IndexedDB persistence
    await enableMultiTabIndexedDbPersistence(db);
    console.log('✅ Multi-tab IndexedDB persistence enabled');
    return 'multi-tab';
  } catch (error: any) {
    if (error.code === 'failed-precondition') {
      // Another tab is already using persistence, fall back to single-tab
      console.warn(
        '⚠️ Multi-tab persistence failed (another tab active), trying single-tab...'
      );
      try {
        await enableIndexedDbPersistence(db);
        console.log('✅ Single-tab IndexedDB persistence enabled');
        return 'single-tab';
      } catch (singleTabError: any) {
        if (singleTabError.code === 'failed-precondition') {
          console.warn(
            '⚠️ Single-tab persistence also failed. Running in online-only mode.'
          );
          return 'none';
        }
        throw singleTabError;
      }
    } else if (error.code === 'unimplemented') {
      // Browser doesn't support IndexedDB (old browsers)
      console.warn(
        '⚠️ IndexedDB not supported in this browser. Running in online-only mode.'
      );
      return 'none';
    } else if (error.code === 'invalid-argument') {
      // Persistence already enabled (shouldn't happen on first init)
      console.log('✅ Persistence already initialized');
      return 'multi-tab';
    }
    throw error;
  }
}

/**
 * Connect to Firestore Emulator
 * Use for local development without internet
 * 
 * Requires: Firebase Emulator Suite running locally
 * Enable with: VITE_USE_FIRESTORE_EMULATOR=true
 */
export function setupFirestoreEmulator(useEmulator = false): void {
  if (
    useEmulator &&
    (import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true')
  ) {
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('🔧 Connected to Firestore Emulator at localhost:8080');
    } catch (error) {
      console.warn('Firestore Emulator already connected or unavailable');
    }
  }
}

/**
 * Export initialized Firestore instance
 * Use this in your application to access Firestore services
 */
export default db;
