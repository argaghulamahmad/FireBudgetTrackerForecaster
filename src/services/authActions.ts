/**
 * src/services/authActions.ts
 * 
 * Firebase Auth Action Methods - Google OAuth & Email/Password
 * 
 * This module provides:
 * - Email/Password authentication (sign-in & registration)
 * - Google OAuth integration
 * - Sign-out
 * - Error handling with user-friendly messages
 * 
 * All methods are async and return structured result objects.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from './auth';
import { getLogger } from '../utils/logger';

const logger = getLogger('authActions');

/**
 * ============================================================================
 *                      EMAIL/PASSWORD AUTHENTICATION
 * ============================================================================
 */

/**
 * Sign in user with email and password
 * 
 * This method:
 * 1. Validates email and password
 * 2. Calls Firebase signInWithEmailAndPassword()
 * 3. Automatically signs user in on success
 * 4. Catches Firebase errors and maps them to user-friendly messages
 * 
 * @param email User's email address
 * @param password User's password
 * @returns Object with success flag and error message if failed
 * 
 * @example
 * const result = await signInWithEmail('user@example.com', 'password123');
 * if (result.success) {
 *   // User is now signed in
 * } else {
 *   console.error(result.error);
 * }
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!email.trim()) {
      return { success: false, error: 'Email is required' };
    }
    if (!password.trim()) {
      return { success: false, error: 'Password is required' };
    }

    logger.warn(`Signing in with email: ${email}`);

    const result = await signInWithEmailAndPassword(auth, email, password);

    logger.warn(`Sign-in successful: ${result.user.email}`);
    return { success: true };
  } catch (error) {
    const mappedError = mapAuthError(error);
    logger.error(`Sign-in failed: ${mappedError}`);
    return { success: false, error: mappedError };
  }
}

/**
 * Create new user with email and password
 * 
 * This method:
 * 1. Validates password strength (6+ characters)
 * 2. Calls Firebase createUserWithEmailAndPassword()
 * 3. Automatically signs user in on success
 * 
 * @param email User's email address
 * @param password Password (minimum 6 characters)
 * @returns Object with success flag and new user UID on success
 * 
 * @example
 * const result = await signUpWithEmail('user@example.com', 'SecurePass123!');
 * if (result.success) {
 *   console.log('Account created:', result.uid);
 * }
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; uid?: string }> {
  try {
    if (!email.trim()) {
      return { success: false, error: 'Email is required' };
    }
    if (!password.trim()) {
      return { success: false, error: 'Password is required' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    logger.warn(`Creating new user: ${email}`);

    const result = await createUserWithEmailAndPassword(auth, email, password);

    logger.warn(`Sign-up successful: ${result.user.email}`);
    return {
      success: true,
      uid: result.user.uid,
    };
  } catch (error) {
    const mappedError = mapAuthError(error);
    logger.error(`Sign-up failed: ${mappedError}`);
    return { success: false, error: mappedError };
  }
}

/**
 * ============================================================================
 *                      SOCIAL AUTHENTICATION
 * ============================================================================
 */

/** Google OAuth provider instance */
const googleProvider = new GoogleAuthProvider();

/**
 * Configure Google OAuth provider settings
 */
function configureGoogleProvider(): void {
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });
}

/**
 * Sign in with Google OAuth popup
 * 
 * This method:
 * 1. Opens Google OAuth popup
 * 2. User selects Google account
 * 3. Firebase automatically creates/links user account
 * 4. Automatically signs user in on success
 * 
 * Browser Popup Issues:
 * - Popup can be blocked by browser popup blocker
 * - User must allow popups for this domain
 * 
 * @returns Object with success flag and error message if failed
 * 
 * @example
 * const result = await signInWithGoogle();
 * if (result.success) {
 *   // User is now signed in
 * } else {
 *   console.error(result.error);
 * }
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    logger.warn('Initiating Google OAuth sign-in');
    configureGoogleProvider();

    const result = await signInWithPopup(auth, googleProvider);

    logger.warn(`Google sign-in successful: ${result.user.email}`);
    return { success: true };
  } catch (error: unknown) {
    const mappedError = mapAuthError(error);
    logger.error(`Google sign-in failed: ${mappedError}`);
    return { success: false, error: mappedError };
  }
}

/**
 * ============================================================================
 *                               SIGN-OUT
 * ============================================================================
 */

/**
 * Sign out current user
 * 
 * Effects:
 * 1. Clears stored auth token from browser storage (IndexedDB)
 * 2. Clears refresh token
 * 3. onAuthStateChanged fires with user = null
 * 4. App detects and automatically redirects to login page
 * 
 * @returns Object with success flag and error message if failed
 * 
 * @example
 * const result = await signOutUser();
 * if (result.success) {
 *   // User automatically redirected to login
 * }
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  try {
    const email = auth.currentUser?.email;
    logger.warn(`Signing out user: ${email}`);

    await signOut(auth);

    logger.warn('Sign-out successful');
    return { success: true };
  } catch (error) {
    const mappedError = mapAuthError(error);
    logger.error(`Sign-out failed: ${mappedError}`);
    return { success: false, error: mappedError };
  }
}

/**
 * ============================================================================
 *                            ERROR MAPPING
 * ============================================================================
 */

/**
 * Map Firebase error codes to user-friendly messages
 * 
 * Firebase throws specific error codes that should be translated
 * to messages users can understand and act on.
 * 
 * @param error Firebase error or any error object
 * @returns User-friendly error message string
 */
export function mapAuthError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof (error as { code: unknown }).code === 'string') {
    const code = (error as { code: string }).code;

    const errorMessages: Record<string, string> = {
      // Email validation errors
      'auth/invalid-email': 'Please enter a valid email address',
      'auth/missing-email': 'Email address is required',
      'auth/user-mismatch': 'Email does not match the account',

      // Password errors
      'auth/invalid-password': 'Password must be at least 6 characters',
      'auth/weak-password': 'Password is too weak. Use uppercase, lowercase, numbers, and symbols',
      'auth/missing-password': 'Password is required',
      'auth/wrong-password': 'Incorrect password. Please try again.',

      // Account existence errors
      'auth/user-not-found': 'No account found with this email address. Please sign up.',
      'auth/email-already-in-use':
        'An account with this email already exists. Please sign in instead.',

      // Rate limiting
      'auth/too-many-requests':
        'Too many failed attempts. Please try again in a few minutes.',
      'auth/operation-not-allowed':
        'This sign-in method is temporarily unavailable. Please try again later.',

      // OAuth popup errors
      'auth/popup-blocked':
        'Sign-in popup was blocked. Please allow popups for this site and try again.',
      'auth/popup-closed-by-user': 'You closed the sign-in popup. Please try again.',
      'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',

      // Network errors
      'auth/network-request-failed':
        'Network error. Please check your internet connection and try again.',
      'auth/timeout': 'Request timed out. Please try again.',

      // Configuration errors
      'auth/invalid-api-key': 'App configuration error. Contact support.',
      'auth/unauthorized-domain':
        'This domain is not authorized for this app. Contact support.',
      'auth/invalid-credential': 'Invalid credentials. Please try again.',
    };

    return errorMessages[code] || `Authentication error (${code}). Please try again.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * ============================================================================
 *                        UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * Get user ID token for backend API calls
 * 
 * Use this when calling backend APIs that validate Firebase tokens.
 * Tokens expire in ~1 hour. Firebase automatically refreshes them.
 * 
 * @param forceRefresh If true, forcibly refresh token before returning.
 * @returns JWT bearer token string, or null if not authenticated
 */
export async function getIdToken(forceRefresh: boolean = false): Promise<string | null> {
  try {
    if (!auth.currentUser) {
      return null;
    }

    const token = await auth.currentUser.getIdToken(forceRefresh);
    return token;
  } catch (error) {
    logger.error('Failed to get ID token', error);
    return null;
  }
}
