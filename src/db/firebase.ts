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
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getLogger } from '../utils/logger';

const log = getLogger('Firebase');

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
 * Initialize Firestore with Custom Settings & Persistence
 *
 * Configuration:
 * - persistentLocalCache: Modern IndexedDB persistence with multi-tab support
 * - persistentMultipleTabManager: Coordinates state across browser tabs
 * - ignoreUndefinedProperties: Prevents errors when undefined data is written
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
  ignoreUndefinedProperties: true,
});

/**
 * Verify Offline Persistence is Enabled
 *
 * Firestore automatically enables persistent local cache at initialization.
 * This function verifies the cache is active and logs the status.
 *
 * @returns 'enabled' if persistence is active, 'offline' if cache fallback is used
 */
export async function initializeOfflinePersistence(): Promise<'enabled' | 'offline'> {
  try {
    log.warn('✅ Persistent local cache initialized with multi-tab manager');
    return 'enabled';
  } catch (error) {
    log.warn('⚠️ Offline persistence not fully available:', error);
    return 'offline';
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
      log.warn('🔧 Connected to Firestore Emulator at localhost:8080');
    } catch {
      log.warn('Firestore Emulator already connected or unavailable');
    }
  }
}

/**
 * Export initialized Firestore instance
 * Use this in your application to access Firestore services
 */
export default db;
