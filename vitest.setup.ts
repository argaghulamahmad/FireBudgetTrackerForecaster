/**
 * Vitest Setup File
 *
 * Configures the testing environment before running tests.
 * - Imports testing-library matchers (toBeInTheDocument, etc.)
 * - Sets up DOM environment
 * - Mocks Firebase (optional - can be customized per test)
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  initializeAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  getAuth: vi.fn(() => ({})),
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(),
  })),
  serverTimestamp: vi.fn(() => new Date()),
  doc: vi.fn(),
}));

// Mock Firebase App
vi.mock('./db/firebase', () => ({
  app: {},
  db: {},
  initializeOfflinePersistence: vi.fn(),
  setupFirestoreEmulator: vi.fn(),
}));
