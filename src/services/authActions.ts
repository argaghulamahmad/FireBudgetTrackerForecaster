/**
 * src/services/authActions.ts
 * 
 * Firebase Auth Action Methods - Google OAuth Only
 * 
 * Simplified authentication with Google OAuth provider:
 * - Google sign-in (creates account automatically on first login)
 * - Sign-out
 * - Error handling with user-friendly messages
 */

import {
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  FirebaseError,
} from 'firebase/auth';
import { auth } from './auth';

/**
 * ============================================================================
 *                         GOOGLE OAUTH AUTHENTICATION
 * ============================================================================
 */

/** Google OAuth provider instance */
const googleProvider = new GoogleAuthProvider();

/**
 * Configure Google OAuth provider settings
 * 
 * This customizes Google login behavior:
 * - Forces account picker on each login
 * - Can request additional scopes (optional)
 * 
 * Called automatically in signInWithGoogle.
 */
function configureGoogleProvider(): void {
  // Show account picker every time (allows switching Google accounts)
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });

  // Optional: Request additional scopes
  // Example: googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
}

/**
 * Sign in with Google OAuth popup
 * 
 * This method:
 * 1. Opens Google OAuth popup
 * 2. User selects Google account
 * 3. Firebase automatically creates/links user account
 * 4. User is automatically signed in on success
 * 5. Account is created automatically on first login (no sign-up screen needed)
 * 
 * Browser Popup Issues:
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
 *   // App automatically redirects to dashboard
 * } else {
 *   console.error(result.error);
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
    const mappedError = mapAuthError(error);
    console.error('[Auth] Google sign-in failed:', mappedError);
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
 * 5. Cached data (budgets, preferences) remain locally
 * 
 * @returns Object with success flag and error message if failed
 * 
 * @example
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
 * - Popup blocked → "Please allow popups for this site"
 * - Network error → "You're offline. Check your internet."
 * - No Google account → "Please select a Google account"
 * - User cancelled → "Sign-in was cancelled"
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

    // Error code mapping for Google OAuth
    const errorMessages: Record<string, string> = {
      // OAuth popup errors
      'auth/popup-blocked':
        'Sign-in popup was blocked. Please allow popups for this site and try again.',
      'auth/popup-closed-by-user': 'You closed the sign-in popup. Please try again.',
      'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',

      // Network and connection errors
      'auth/network-request-failed':
        'Network error. Please check your internet connection and try again.',
      'auth/timeout': 'Request timed out. Please try again.',

      // Provider configuration errors
      'auth/unauthorized-domain':
        'This domain is not authorized for this app. Contact support.',
      'auth/operation-not-allowed':
        'Google sign-in is temporarily unavailable. Please try again later.',

      // Credential errors
      'auth/invalid-credential': 'Invalid credentials. Please try again.',

      // Generic errors
      'auth/account-exists-with-different-credential':
        'This email is already used with a different sign-in method.',
      'auth/invalid-api-key': 'App configuration error. Contact support.',
    };

    // Return mapped message or generic one with error code
    return (
      errorMessages[code] || `Sign-in error (${code}). Please try again.`
    );
  }

  // Handle custom error messages
  if (error instanceof Error) {
    return error.message;
  }

  // Unknown error
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
 * Use this when calling your backend APIs that validate Firebase tokens.
 * Your backend uses Firebase Admin SDK to verify the token.
 * 
 * Tokens expire in ~1 hour. Firebase automatically refreshes them.
 * Use forceRefresh = true to ensure fresh token for critical APIs.
 * 
 * @param forceRefresh If true, forcibly refresh token before returning.
 * @returns JWT bearer token string, or null if not authenticated
 * 
 * @example
 * const token = await getIdToken(true);
 * if (token) {
 *   const response = await fetch('/api/budgets', {
 *     headers: { 'Authorization': `Bearer ${token}` }
 *   });
 * }
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
