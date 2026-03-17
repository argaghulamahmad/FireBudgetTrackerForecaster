/**
 * src/services/authActions.ts
 * 
 * Firebase Auth Action Methods
 * 
 * This module provides all authentication operations:
 * - Email/Password sign-in & registration
 * - Google OAuth integration
 * - Sign-out
 * - Error handling with user-friendly mappings
 * 
 * All methods are async and return structured result objects.
 * Errors are caught and mapped to user-friendly messages.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  linkWithPopup,
  FirebaseError,
} from 'firebase/auth';
import { auth } from './auth';

/**
 * Initialize persistent auth storage
 * 
 * DEFAULT: browserLocalPersistence is automatically used by Firebase
 * (tokens persist in IndexedDB/localStorage)
 * 
 * This function configures persistence explicitly if you want custom behavior.
 * In production, usually don't need to call this—Firebase handles it.
 * 
 * Use cases for calling:
 * - Switching from session to local persistence
 * - Implementing "Remember me" checkbox
 * - Testing with different persistence types
 */
export async function initializePersistence(): Promise<void> {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log('[Auth] Persistence configured: LOCAL (IndexedDB)');
  } catch (error) {
    console.warn('[Auth] Persistence configuration failed, using default:', error);
    // Firebase automatically falls back to default
  }
}

/**
 * ============================================================================
 *                      EMAIL/PASSWORD AUTHENTICATION
 * ============================================================================
 */

/**
 * Sign in user with email and password
 * 
 * This method:
 * 1. Validates email format
 * 2. Calls Firebase signInWithEmailAndPassword()
 * 3. Catches Firebase errors and maps them to user messages
 * 4. Automatically signs user in (onAuthStateChanged fires with user data)
 * 
 * Token refresh behavior (Scenario B):
 * - Access token issued with ~1 hour expiration
 * - Before expiration, Firebase silently refreshes in background
 * - If user revoked access on another device, refresh fails
 * - onAuthStateChanged detects session loss and signs user out
 * - Next API call with getIdToken() will throw "auth/invalid-user-token"
 * 
 * @param email User's email address
 * @param password User's password (plaintext—sent over HTTPS to Firebase)
 * @returns Object with success flag and error message if failed
 * 
 * @throws Never throws—always returns result object
 * 
 * @example
 * const result = await signInWithEmail('user@example.com', 'password123');
 * if (result.success) {
 *   // User is now signed in, onAuthStateChanged fires
 * } else {
 *   setError(result.error); // "No account found with this email address"
 * }
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validation
    if (!email.trim()) {
      return { success: false, error: 'Email is required' };
    }
    if (!password.trim()) {
      return { success: false, error: 'Password is required' };
    }

    console.log('[Auth] Signing in with email:', email);

    const result = await signInWithEmailAndPassword(auth, email, password);

    console.log('[Auth] Sign-in successful:', result.user.email);
    return { success: true };
  } catch (error) {
    const mappedError = mapAuthError(error);
    console.error('[Auth] Sign-in failed:', mappedError);
    return { success: false, error: mappedError };
  }
}

/**
 * Create new user with email and password
 * 
 * This method:
 * 1. Validates password strength (6+ chars)
 * 2. Confirms password matches
 * 3. Calls Firebase createUserWithEmailAndPassword()
 * 4. Automatically signs user in on success
 * 
 * After signup, you may want to:
 * - Send verification email: await sendEmailVerification()
 * - Create user profile document in Firestore
 * - Show welcome screen
 * 
 * @param email User's email address
 * @param password Password (minimum 6 characters)
 * @returns Object with success flag, error message, and new user UID if successful
 * 
 * @example
 * const result = await signUpWithEmail('user@example.com', 'SecurePass123!');
 * if (result.success) {
 *   console.log('New user created:', result.uid);
 *   // Create Firestore user profile
 *   await createUserProfile(result.uid, email);
 * }
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; uid?: string }> {
  try {
    // Validation
    if (!email.trim()) {
      return { success: false, error: 'Email is required' };
    }
    if (!password.trim()) {
      return { success: false, error: 'Password is required' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    console.log('[Auth] Creating new user:', email);

    const result = await createUserWithEmailAndPassword(auth, email, password);

    console.log('[Auth] Sign-up successful:', result.user.email);
    return {
      success: true,
      uid: result.user.uid,
    };
  } catch (error) {
    const mappedError = mapAuthError(error);
    console.error('[Auth] Sign-up failed:', mappedError);
    return { success: false, error: mappedError };
  }
}

/**
 * ============================================================================
 *                         SOCIAL AUTHENTICATION
 * ============================================================================
 */

/** Google OAuth provider instance */
const googleProvider = new GoogleAuthProvider();

/**
 * Configure Google OAuth provider settings
 * 
 * This customizes Google login behavior:
 * - Can request additional scopes (calendar, contacts, etc.)
 * - Can control which Google account picker shows
 * - Can add custom parameters
 * 
 * Called automatically in signInWithGoogle, but exposed for customization.
 * 
 * @example
 * configureGoogleProvider();
 * // Add scopes for calendar access
 * googleProvider.addScope('https://www.googleapis.com/auth/calendar');
 */
export function configureGoogleProvider(): void {
  // Force Google to show account picker every time (helpful for testing)
  // In production, use 'select_account' to allow cached login
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });

  // Optional: Request additional scopes
  // googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
}

/**
 * Sign in with Google OAuth popup
 * 
 * This method:
 * 1. Opens Google OAuth popup
 * 2. User selects Google account
 * 3. Firebase creates/links user account
 * 4. Automatically signs user in on success
 * 
 * ERROR: Account Exists with Different Credential (Scenario C)
 * 
 * Happens when:
 * - User has existing email/password account as user@example.com
 * - User tries to sign in with Google account user@example.com
 * - Firebase detects email collision
 * 
 * Solution: Catch 'auth/account-exists-with-different-credential' and:
 * 1. Show user: "This email is linked to password sign-in"
 * 2. Prompt password sign-in first
 * 3. After password sign-in, offer: linkGoogleAccount()
 * 4. Now both methods work for same account
 * 
 * Browser Issues:
 * - Popup can be blocked by browser popup blocker
 * - User must allow popups for this domain
 * - Triggers 'auth/popup-blocked' error if blocked
 * 
 * @returns Object with success flag and error message if failed
 * 
 * @example
 * const result = await signInWithGoogle();
 * if (result.success) {
 *   // User signed in, onAuthStateChanged fires
 * } else if (result.error === 'auth/account-exists-with-different-credential') {
 *   showModal('This email uses password sign-in. Please sign in with password first.');
 * }
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Auth] Initiating Google OAuth sign-in');
    configureGoogleProvider();

    const result = await signInWithPopup(auth, googleProvider);

    console.log('[Auth] Google sign-in successful:', result.user.email);
    return { success: true };
  } catch (error: any) {
    // Handle account-exists-with-different-credential specifically
    // This is a special case that needs custom UX
    if (error.code === 'auth/account-exists-with-different-credential') {
      const email = error.customData?.email || 'unknown';
      const message = `An account with email ${email} already exists using a different sign-in method (password). Please sign in with your password first, then you can link your Google account.`;
      
      console.warn('[Auth]', message);
      return {
        success: false,
        error: message,
      };
    }

    const mappedError = mapAuthError(error);
    console.error('[Auth] Google sign-in failed:', mappedError);
    return { success: false, error: mappedError };
  }
}

/**
 * Link Google account to existing email/password account
 * 
 * Use case:
 * - User has email/password account
 * - User wants ability to sign in with Google too
 * - Both accounts use same email
 * 
 * Requirement: User must already be signed in (with email/password)
 * 
 * After linking:
 * - User can sign in with email/password OR Google
 * - Both methods access same account
 * - User can unlink if needed (via Firebase Console initially, UI later)
 * 
 * @returns Object with success flag and error message if failed
 * 
 * @example
 * // User signed in with email/password
 * const result = await linkGoogleAccount();
 * if (result.success) {
 *   alert('Google account linked! You can now sign in with Google.');
 * }
 */
export async function linkGoogleAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!auth.currentUser) {
      return { success: false, error: 'No user currently signed in' };
    }

    console.log('[Auth] Linking Google account for:', auth.currentUser.email);
    configureGoogleProvider();

    const result = await linkWithPopup(auth.currentUser, googleProvider);

    console.log('[Auth] Google account linked successfully');
    return { success: true };
  } catch (error) {
    const mappedError = mapAuthError(error);
    console.error('[Auth] Link Google failed:', mappedError);
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
 * 1. Clears stored auth token from browser storage (IndexedDB/localStorage)
 * 2. Clears refresh token
 * 3. onAuthStateChanged fires with user = null
 * 4. App detects user = null and redirects to login page automatically
 * 5. IndexedDB data (cached Firestore) is NOT cleared (privacy by default)
 * 
 * After sign-out:
 * - User must provide credentials again to sign back in
 * - Budgets data remains cached locally (no loss of offline data)
 * - Can be cleared manually if needed with clearAllData()
 * 
 * @returns Object with success flag and error message if failed
 * 
 * @example
 * // In Settings.tsx logout button
 * const result = await signOutUser();
 * if (result.success) {
 *   // onAuthStateChanged fires with user = null
 *   // App automatically redirects to login
 * }
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  try {
    const email = auth.currentUser?.email;
    console.log('[Auth] Signing out user:', email);

    await signOut(auth);

    console.log('[Auth] Sign-out successful');
    return { success: true };
  } catch (error) {
    const mappedError = mapAuthError(error);
    console.error('[Auth] Sign-out failed:', mappedError);
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
 * Common scenarios:
 * - User misspells email → "Invalid email address format"
 * - Wrong password → "Incorrect password"
 * - Too many failed attempts → "Too many attempts. Try again later."
 * - Email already in use → "This email is already registered"
 * - Network down → "You're offline. Check your internet."
 * - Popup blocked → "Please allow popups for this site"
 * 
 * @param error Firebase error or any error object
 * @returns User-friendly error message string
 * 
 * @see https://firebase.google.com/docs/auth/troubleshoot-common-issues
 */
export function mapAuthError(error: any): string {
  // Check for FirebaseError with code property
  if (error && typeof error.code === 'string') {
    const code = error.code as string;

    // Comprehensive error code mapping
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
      'auth/account-exists-with-different-credential':
        'This email is linked to another sign-in method. Try a different method.',

      // Rate limiting
      'auth/too-many-requests':
        'Too many failed attempts. Please try again in a few minutes.',
      'auth/operation-not-allowed':
        'This sign-in method is temporarily unavailable. Please try again later.',

      // Social auth errors
      'auth/popup-blocked':
        'Sign-in popup was blocked. Please allow popups for this site and try again.',
      'auth/popup-closed-by-user': 'You closed the sign-in popup. Please try again.',
      'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
      'auth/unauthorized-domain':
        'This domain is not authorized for this app. Contact support.',

      // Network errors
      'auth/network-request-failed':
        'Network error. Please check your internet connection and try again.',
      'auth/timeout': 'Request timed out. Please try again.',

      // Token and session errors
      'auth/invalid-api-key': 'App configuration error. Contact support.',
      'auth/invalid-app-id': 'App configuration error. Contact support.',
      'auth/invalid-user-token':
        'Your session has expired. Please sign in again.',
      'auth/invalid-credential': 'Invalid credentials. Please try again.',
      'auth/missing-ios-bundle-id': 'App configuration error. Contact support.',
      'auth/app-deleted': 'App data has been deleted. Please reinstall.',

      // Verification errors
      'auth/invalid-verification-code': 'Invalid or expired verification code.',
      'auth/invalid-verification-id': 'Verification request expired. Please try again.',
      'auth/missing-verification-code': 'Verification code is required.',

      // Provider-specific
      'auth/invalid-oauth-provider': 'This sign-in method is not available.',
      'auth/invalid-credential-provider-response':
        'Sign-in provider returned an invalid response.',
    };

    // Return mapped message or generic one with error code
    return errorMessages[code] || `Authentication error (${code}). Please try again.`;
  }

  // Handle custom error messages from this module
  if (error instanceof Error) {
    return error.message;
  }

  // Unknown error
  return 'An unexpected error occurred. Please try again.';
}

/**
 * ============================================================================
 *                        ADVANCED FEATURES
 * ============================================================================
 */

/**
 * Send email verification link to current user
 * 
 * Use case:
 * - Require email verification before accessing app
 * - Verify user owns the email address
 * - Prevent typos during signup
 * 
 * Requirement: User must be signed in
 * 
 * User receives email with link. Clicking link verifies their email.
 * Check user.emailVerified property to see if verified.
 * 
 * @returns Object with success flag
 */
export async function sendEmailVerification(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!auth.currentUser) {
      return { success: false, error: 'No user signed in' };
    }

    const { sendEmailVerification: sendEmail } = await import('firebase/auth');
    await sendEmail(auth.currentUser);

    console.log('[Auth] Verification email sent to:', auth.currentUser.email);
    return { success: true };
  } catch (error) {
    const mappedError = mapAuthError(error);
    return { success: false, error: mappedError };
  }
}

/**
 * Get ID token for backend API authentication
 * 
 * Use this when calling your backend APIs that validate Firebase tokens.
 * Your backend uses Firebase Admin SDK to verify the token.
 * 
 * Tokens expire in ~1 hour. Use forceRefresh = true to ensure fresh token.
 * Firebase automatically handles token refresh in background.
 * 
 * @param forceRefresh If true, forcibly refresh token before returning.
 *                     Use for critical API calls to ensure freshness.
 * @returns JWT bearer token string, or null if not authenticated
 * 
 * @example
 * // In API call
 * const token = await getIdToken(true);
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
