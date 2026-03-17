# Firebase Auth v9+ Modular Migration Guide
## Budget Forecaster Application

**Status:** Migration from hardcoded login (`admin/password123`) to production Firebase Auth  
**Scope:** Email/Password + Google OAuth  
**Target:** Async, event-driven, production-ready authentication  

---

## Table of Contents
1. [Phase 1: Provider Configuration](#phase-1-provider-configuration)
2. [Phase 2: Global Observer Pattern (onAuthStateChanged)](#phase-2-global-observer-pattern)
3. [Phase 3: Action Methods (Sign-in/up/out)](#phase-3-action-methods)
4. [Phase 4: Route Guarding Logic](#phase-4-route-guarding-logic)
5. [Phase 5: Error Mapping & User Feedback](#phase-5-error-mapping--user-feedback)
6. [Phase 6: Security Rules Integration](#phase-6-security-rules-integration)
7. [Testing Scenarios](#testing-scenarios)
8. [Migration Checklist](#migration-checklist)

---

## Phase 1: Provider Configuration

### 1.1 Understanding getAuth()

Firebase Auth uses a **provider pattern** in v9+ modular SDK. The `getAuth()` function returns a singleton `Auth` object that manages authentication state for your app.

**Key Concepts:**
- **Modular SDK:** Tree-shakeable imports (only bring in what you use)
- **Single Instance:** `getAuth()` returns the same Auth instance throughout your app
- **Automatic Persistence:** Firebase automatically persists auth tokens in browser storage
- **Provider Enablement:** Each authentication method must be explicitly enabled in Firebase Console

### 1.2 Create `src/services/auth.ts`

This file initializes Auth and exposes the authenticated state to your app.

```typescript
/**
 * src/services/auth.ts
 * 
 * Firebase Auth Initialization & Observer Pattern
 * 
 * Responsibilities:
 * - Initialize Firebase Auth with getAuth()
 * - Set up onAuthStateChanged listener at app start
 * - Export user state for consumption by hooks/components
 * - Handle loading states during SDK initialization
 */

import { getAuth, onAuthStateChanged, Auth, User } from 'firebase/auth';
import { app } from '../db/firebase'; // Your existing Firebase app instance

/**
 * Get the Firebase Auth instance
 * This is a singleton—returns the same instance every time
 */
export const auth = getAuth(app);

/**
 * Observable subscription to auth state changes
 * Type: Unsubscribe function returned by onAuthStateChanged
 */
let authStateUnsubscribe: ReturnType<typeof onAuthStateChanged> | null = null;

/**
 * Initialize Auth State Observer
 * 
 * CRITICAL: Call this ONCE at app start (in main.tsx or App component root)
 * 
 * Why onAuthStateChanged is superior to localStorage checks:
 * 1. **Automatic Session Persistence:** Firebase SDK automatically restores user from browser storage
 * 2. **Token Refresh:** Handles expired tokens silently in background
 * 3. **Revocation Detection:** Detects when user is signed out on another tab
 * 4. **Real-time Sync:** Multiple tabs stay in sync automatically
 * 5. **Loading State:** Provides explicit "loading" state during initialization
 * 
 * Persistence Behavior:
 * - Default: 'LOCAL' persistence (survives browser restart)
 * - Can be configured with setPersistence() if needed
 * - Private/Incognito: Falls back to 'SESSION' persistence
 */
export function initAuthObserver(onAuthChange: (user: User | null, loading: boolean) => void): void {
  authStateUnsubscribe = onAuthStateChanged(
    auth,
    (user: User | null) => {
      // Called immediately with current user (may be null)
      // Then called whenever auth state changes
      console.log('[Auth] User state changed:', user?.email || 'logged out');
      onAuthChange(user, false); // loading = false means Firebase is ready
    },
    (error) => {
      // Called if onAuthStateChanged encounters an error
      console.error('[Auth] Observer error:', error);
    }
  );
}

/**
 * Cleanup function to unsubscribe from auth observer
 * Called during app unmount to prevent memory leaks
 */
export function cleanupAuthObserver(): void {
  if (authStateUnsubscribe) {
    authStateUnsubscribe();
    authStateUnsubscribe = null;
  }
}

/**
 * Manual check for current user (synchronous)
 * 
 * WARNING: Use sparingly. Prefer onAuthStateChanged for reactive updates.
 * Safe to use after Firebase initialization is complete.
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}
```

### 1.3 Enable Providers in Firebase Console

**Email/Password Provider:**
1. Go to Firebase Console → Authentication → Sign-in method
2. Click "Email/Password"
3. Enable both "Email/Password" and "Email link (passwordless sign-in)"
4. Save

**Google OAuth Provider:**
1. Click "Google"
2. Enable provider
3. Set up OAuth Consent Screen (required by Google)
   - User type: External
   - Add your app domain to authorized origins
   - Add redirect URI: `https://yourapp.firebaseapp.com/__/auth/handler`
4. Save

---

## Phase 2: Global Observer Pattern (onAuthStateChanged)

### 2.1 Why onAuthStateChanged is Superior to Hardcoded State

| Aspect | Hardcoded (`const user = {}`) | localStorage Checks | onAuthStateChanged |
|--------|------|------|------|
| **Server-Aware** | ❌ No | ❌ Stale data risk | ✅ Always synced |
| **Token Refresh** | ❌ No | ❌ Manual | ✅ Automatic |
| **Multi-Tab Sync** | ❌ No | ⚠️ Polling required | ✅ Native support |
| **Loading State** | ❌ No | ❌ No | ✅ Yes |
| **Revocation Detection** | ❌ No | ❌ No | ✅ Yes |
| **Security** | ❌ No | ⚠️ Tokens readable | ✅ Secure |

### 2.2 Update `src/App.tsx` to Use Auth Observer

Replace the current `useState + useEffect` pattern with reactive auth state:

```typescript
/**
 * src/App.tsx
 * Updated to use Firebase Auth with proper loading states
 */

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuthObserver, cleanupAuthObserver } from './services/auth';
import { useBudgets } from './hooks/useBudgets';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Currency } from './utils/currency';
import { Language, translations } from './utils/i18n';
import { Budget } from './types';

export default function App() {
  // ==================== Auth State ====================
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // Critical: Start as true

  // ==================== App State ====================
  const { 
    budgets, 
    loading: budgetLoading, 
    error, 
    hasPendingWrites, 
    isFromCache,
    addBudget, 
    updateBudget, 
    deleteBudget, 
    loadSampleData, 
    clearAllData 
  } = useBudgets();
  
  const [activeTab, setActiveTab] = useState<'home' | 'settings'>('home');
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [language, setLanguage] = useState<Language>('en');
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');

  // ==================== Auth Initialization ====================
  /**
   * FirebaseAuth Initialization Effect
   * 
   * Runs ONCE at app mount:
   * 1. Sets up onAuthStateChanged listener
   * 2. Handles auth state changes reactively
   * 3. Cleanup on unmount
   * 
   * Scenario A (Page Refresh):
   * - authLoading = true (user can't access app)
   * - Firebase SDK loads locally cached session
   * - onAuthStateChanged fires with user data
   * - authLoading = false (app unlocked)
   * 
   * Loading UI prevents flashing login screen during this ~100ms window
   */
  useEffect(() => {
    // Initialize auth observer
    initAuthObserver((authUser, loading) => {
      setUser(authUser);
      setAuthLoading(loading);
    });

    // Set authLoading to false when Firebase finishes initializing
    // (onAuthStateChanged fires immediately with current state)
    const unsubscribe = setTimeout(() => {
      setAuthLoading(false);
    }, 0); // Ensures Firebase gets one tick to initialize

    return () => {
      clearTimeout(unsubscribe);
      cleanupAuthObserver();
    };
  }, []);

  // ==================== User Preferences Initialization ====================
  useEffect(() => {
    const savedCurrency = localStorage.getItem('budget_currency') as Currency;
    if (savedCurrency === 'USD' || savedCurrency === 'IDR') {
      setCurrency(savedCurrency);
    }
    const savedLanguage = localStorage.getItem('budget_language') as Language;
    if (savedLanguage === 'en' || savedLanguage === 'id') {
      setLanguage(savedLanguage);
    }
    const savedViewMode = localStorage.getItem('budget_view_mode') as 'compact' | 'detailed';
    if (savedViewMode === 'compact' || savedViewMode === 'detailed') {
      setViewMode(savedViewMode);
    }
  }, []);

  // ==================== Event Handlers ====================
  const handleCurrencyChange = (c: Currency) => {
    setCurrency(c);
    localStorage.setItem('budget_currency', c);
  };

  const handleLanguageChange = (l: Language) => {
    setLanguage(l);
    localStorage.setItem('budget_language', l);
  };

  const handleViewModeChange = (mode: 'compact' | 'detailed') => {
    setViewMode(mode);
    localStorage.setItem('budget_view_mode', mode);
  };

  const t = translations[language];

  // ==================== Route Guarding ====================
  // Show loading screen while Firebase initializes
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t.loading || 'Initializing...'}</p>
        </div>
      </div>
    );
  }

  // Not authenticated → show login page
  if (!user) {
    return <Login t={t} />;
  }

  // Authenticated → show app
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-blue-100">
      {activeTab === 'home' ? (
        <Home 
          budgets={budgets}
          loading={budgetLoading}
          error={error}
          hasPendingWrites={hasPendingWrites}
          isFromCache={isFromCache}
          currency={currency}
          t={t}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onAddBudgetClick={() => {
            setBudgetToEdit(null);
            setIsAddBudgetOpen(true);
          }}
          onEditBudget={(budget) => {
            setBudgetToEdit(budget);
            setIsAddBudgetOpen(true);
          }}
          onDeleteBudget={deleteBudget}
        />
      ) : (
        <Settings 
          currency={currency}
          onCurrencyChange={handleCurrencyChange}
          language={language}
          onLanguageChange={handleLanguageChange}
          user={user}
          t={t}
        />
      )}

      <AddBudgetModal
        isOpen={isAddBudgetOpen}
        onClose={() => {
          setIsAddBudgetOpen(false);
          setBudgetToEdit(null);
        }}
        onSave={(budgetData) => {
          if (budgetToEdit) {
            updateBudget(budgetToEdit.id, budgetData);
          } else {
            addBudget(budgetData);
          }
          setIsAddBudgetOpen(false);
          setBudgetToEdit(null);
        }}
        editingBudget={budgetToEdit}
        t={t}
      />

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        t={t}
      />
    </div>
  );
}
```

### 2.3 Update Settings Page to Display User Info

```typescript
/**
 * src/pages/Settings.tsx (excerpt)
 * Shows authenticated user information
 */

import { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth } from '../services/auth';

interface SettingsProps {
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  language: Language;
  onLanguageChange: (l: Language) => void;
  user: User;
  t: any;
}

export function Settings({
  currency,
  onCurrencyChange,
  language,
  onLanguageChange,
  user,
  t
}: SettingsProps) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Redirect happens automatically via onAuthStateChanged
    } catch (error) {
      console.error('[Settings] Logout failed:', error);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      {/* User Card */}
      <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200">
        <h2 className="text-lg font-bold mb-4">{t.account || 'Account'}</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">{t.email || 'Email'}</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t.userId || 'User ID'}</p>
            <p className="font-mono text-xs text-gray-500">{user.uid}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{t.memberSince || 'Member Since'}</p>
            <p className="font-medium">
              {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full mt-6 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
        >
          {t.logout || 'Logout'}
        </button>
      </div>

      {/* Settings continue... */}
    </div>
  );
}
```

---

## Phase 3: Action Methods (Sign-in/up/out)

### 3.1 Create `src/services/authActions.ts`

This file contains all auth operations (sign-in, sign-up, sign-out, social login).

```typescript
/**
 * src/services/authActions.ts
 * 
 * Firebase Auth Action Methods
 * 
 * Handles:
 * - Email/Password sign-in & registration
 * - Google OAuth sign-in
 * - Sign-out
 * - Error handling & mapping to user-friendly messages
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  setPersistence as setPersistenceMethod,
  linkWithPopup
} from 'firebase/auth';
import { auth } from './auth';
import { logAuthAction } from '../utils/logging';

/**
 * Configure persistence behavior
 * DEFAULT: 'LOCAL' (survives browser restart)
 * 
 * Options:
 * - browserLocalPersistence: Survives browser restart (IndexedDB)
 * - browserSessionPersistence: Cleared on browser close
 * - inMemoryPersistence: Lost on page refresh (testing only)
 * 
 * Call this ONCE during app initialization if you want custom persistence
 */
export async function initializePersistence(): Promise<void> {
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log('[Auth] Persistence initialized: LOCAL');
  } catch (error) {
    console.warn('[Auth] Custom persistence failed, using default:', error);
    // Firebase falls back to default automatically
  }
}

/**
 * ==================== EMAIL/PASSWORD AUTHENTICATION ====================
 */

/**
 * Sign in with email and password
 * 
 * @throws Returns mapped error via result.error
 * @returns { success: boolean, error?: string }
 * 
 * Scenario B (Token Expiration):
 * - User's token expires after ~1 hour
 * - Firebase silently refreshes it in background
 * - If refresh fails, this method will error on next call
 * - onAuthStateChanged detects session loss & clears user state
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logAuthAction('signInWithEmail', { email });
    
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
 * This also signs them in automatically on success
 * 
 * @throws Returns mapped error via result.error
 * @returns { success: boolean, error?: string, uid?: string }
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; uid?: string }> {
  try {
    logAuthAction('signUpWithEmail', { email });

    if (password.length < 6) {
      return { 
        success: false, 
        error: 'Password must be at least 6 characters' 
      };
    }

    const result = await createUserWithEmailAndPassword(auth, email, password);

    console.log('[Auth] Sign-up successful:', result.user.email);
    return { 
      success: true, 
      uid: result.user.uid 
    };
  } catch (error) {
    const mappedError = mapAuthError(error);
    console.error('[Auth] Sign-up failed:', mappedError);
    return { success: false, error: mappedError };
  }
}

/**
 * ==================== SOCIAL AUTHENTICATION ====================
 */

const googleProvider = new GoogleAuthProvider();

/**
 * Configure Google OAuth scopes and settings
 * 
 * This is called automatically but can be customized
 */
export function configureGoogleProvider(): void {
  // Optional: Request additional scopes beyond email/profile
  // googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
  
  // Force user to select account on each sign-in (helpful for testing)
  googleProvider.setCustomParameters({
    prompt: 'select_account',
  });
}

/**
 * Sign in with Google OAuth popup
 * 
 * Scenario C (Account Exists with Different Credential):
 * - User previously signed up with email/password as user@example.com
 * - Now tries to sign in with Google as user@example.com
 * - Firebase detects email already exists with different auth method
 * - Throws 'auth/account-exists-with-different-credential' error
 * 
 * Handling:
 * 1. Catch this specific error
 * 2. Prompt user: "This email is linked to password auth. Sign in with password first."
 * 3. After password sign-in, can optionally link Google account using linkWithPopup()
 * 
 * @returns { success: boolean, error?: string }
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    logAuthAction('signInWithGoogle');
    configureGoogleProvider();

    const result = await signInWithPopup(auth, googleProvider);

    console.log('[Auth] Google sign-in successful:', result.user.email);
    return { success: true };
  } catch (error: any) {
    // Handle account-exists-with-different-credential specially
    if (error.code === 'auth/account-exists-with-different-credential') {
      const email = error.customData?.email || 'unknown';
      console.warn(`[Auth] Email ${email} already exists with different credential method`);
      return {
        success: false,
        error: `An account with this email exists using a different sign-in method. Please sign in with your password.`,
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
 * - User has an email/password account
 * - User wants to also sign in with Google
 * - Both accounts have same email
 * 
 * Requirement: User must be already signed in
 */
export async function linkGoogleAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!auth.currentUser) {
      return { success: false, error: 'No user currently signed in' };
    }

    logAuthAction('linkGoogleAccount', { uid: auth.currentUser.uid });
    configureGoogleProvider();

    const result = await linkWithPopup(auth.currentUser, googleProvider);

    console.log('[Auth] Google account linked:', result.user.email);
    return { success: true };
  } catch (error) {
    const mappedError = mapAuthError(error);
    console.error('[Auth] Link Google failed:', mappedError);
    return { success: false, error: mappedError };
  }
}

/**
 * ==================== SIGN-OUT ====================
 */

/**
 * Sign out current user
 * 
 * Effects:
 * 1. Clears stored auth token from browser
 * 2. onAuthStateChanged fires with user = null
 * 3. App automatically redirects to login page
 * 4. IndexedDB is NOT cleared (privacy by default)
 * 
 * @returns { success: boolean, error?: string }
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  try {
    logAuthAction('signOut', { uid: auth.currentUser?.uid });

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
 * ==================== ERROR MAPPING ====================
 */

/**
 * Map Firebase Auth error codes to user-friendly messages
 * 
 * @param error - FirebaseError or any error object
 * @returns User-friendly error message string
 * 
 * Common Error Codes:
 * - auth/invalid-email: Email format invalid
 * - auth/user-not-found: No account with this email
 * - auth/wrong-password: Incorrect password
 * - auth/weak-password: Password < 6 chars (during signup)
 * - auth/email-already-in-use: Email exists (during signup)
 * - auth/too-many-requests: Too many failed attempts (15 min timeout)
 * - auth/operation-not-allowed: Auth method disabled in Console
 * - auth/account-exists-with-different-credential: Social auth conflict
 * - auth/popup-blocked: Browser blocked OAuth popup
 * - auth/network-request-failed: No internet connection
 */
export function mapAuthError(error: any): string {
  // Handle FirebaseError specifically
  if (error.code) {
    const code = error.code;
    const errorMap: Record<string, string> = {
      'auth/invalid-email': 'Invalid email address format',
      'auth/invalid-password': 'Invalid password. Must be at least 6 characters',
      'auth/user-not-found': 'No account found with this email address',
      'auth/wrong-password': 'Incorrect password',
      'auth/weak-password': 'Password must be at least 6 characters',
      'auth/email-already-in-use': 'An account with this email already exists',
      'auth/account-exists-with-different-credential': 
        'This email is linked to another sign-in method. Please try a different method.',
      'auth/too-many-requests': 
        'Too many failed sign-in attempts. Please try again in a few minutes.',
      'auth/operation-not-allowed': 
        'This sign-in method is not available. Contact support.',
      'auth/popup-blocked': 
        'Sign-in popup was blocked. Please allow popups and try again.',
      'auth/popup-closed-by-user': 'You closed the sign-in popup. Please try again.',
      'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
      'auth/network-request-failed': 
        'Network connection error. Check your internet and try again.',
      'auth/invalid-credential': 'Invalid credentials. Please try again.',
      'auth/invalid-verification-code': 'Invalid verification code',
      'auth/missing-email': 'Email is required',
      'auth/missing-password': 'Password is required',
    };

    return errorMap[code] || `Authentication error: ${code}`;
  }

  // Fallback for unknown errors
  return error instanceof Error 
    ? error.message 
    : 'An unexpected authentication error occurred';
}

/**
 * ==================== ASYNC PROMISE PATTERNS ====================
 */

/**
 * Example: Sign-in with full error handling and promises
 * 
 * Usage in component:
 * ```tsx
 * const handleLogin = async () => {
 *   const result = await signInWithEmail(email, password);
 *   if (result.success) {
 *     // onAuthStateChanged fires automatically, app redirects
 *   } else {
 *     setErrorMessage(result.error);
 *   }
 * };
 * ```
 * 
 * Why try/catch everywhere:
 * - Firebase operations are async Promises
 * - Network errors can occur anytime
 * - Token refresh can fail
 * - Must always handle error case
 */

/**
 * Verify user email is verified (optional feature)
 * 
 * Use case: Require email verification before accessing app
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
 * Get current user's ID token (for API calls)
 * 
 * Use case: Call your backend API with Firebase auth
 * The backend verifies the token using Firebase Admin SDK
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
```

---

## Phase 4: Route Guarding Logic

### 4.1 Protected Route Component Pattern

```typescript
/**
 * src/components/ProtectedRoute.tsx
 * 
 * Route guard for authenticated-only pages
 * 
 * Use when you have feature-gated pages that require additional checks
 * (e.g., admin pages, premium features)
 */

import { ReactNode } from 'react';
import { User } from 'firebase/auth';

interface ProtectedRouteProps {
  user: User | null;
  authLoading: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  requiredCustomClaim?: string; // Example: 'admin', 'premium'
}

export function ProtectedRoute({
  user,
  authLoading,
  children,
  fallback,
  requiredCustomClaim
}: ProtectedRouteProps) {
  // Still loading Firebase
  if (authLoading) {
    return fallback || <LoadingScreen />;
  }

  // Not logged in
  if (!user) {
    return fallback || <AccessDenied />;
  }

  // Check custom claims if required
  if (requiredCustomClaim) {
    const customClaims = user.customClaims as Record<string, any> || {};
    if (!customClaims[requiredCustomClaim]) {
      return fallback || <AccessDenied />;
    }
  }

  // All checks passed
  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 font-semibold mb-2">Access Denied</p>
        <p className="text-gray-600">You don't have permission to access this page.</p>
      </div>
    </div>
  );
}
```

### 4.2 Main App Route Guarding (Updated)

Already shown in Phase 2.2 - the key is:

```typescript
// Show loading screen while Firebase initializes
if (authLoading) {
  return <LoadingScreen />;
}

// Not authenticated → show login page
if (!user) {
  return <Login t={t} />;
}

// Authenticated → show app
return <App />;
```

---

## Phase 5: Updating Login.tsx (Email/Password & Google OAuth)

### 5.1 New Login Component

```typescript
/**
 * src/pages/Login.tsx
 * 
 * Updated to use Firebase Auth with Email/Password and Google OAuth
 */

import { useState } from 'react';
import { Lock, User, Mail } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';
import { 
  signInWithEmail, 
  signUpWithEmail, 
  signInWithGoogle,
  mapAuthError 
} from '../services/authActions';

interface LoginProps {
  t: any;
}

export function Login({ t }: LoginProps) {
  // ==================== State ====================
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ==================== Event Handlers ====================

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = mode === 'signin'
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password);

      if (!result.success) {
        setError(result.error || 'Authentication failed');
      }
      // On success, onAuthStateChanged fires automatically
      // and app redirects (no explicit redirect needed)
    } catch (error) {
      setError(mapAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        setError(result.error || 'Google sign-in failed');
      }
      // On success, onAuthStateChanged fires automatically
    } catch (error) {
      setError(mapAuthError(error));
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== Render ====================

  const isFormValid = email.trim() && password.trim() && 
    (mode === 'signin' || (confirmPassword.trim() && password === confirmPassword));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-lg border border-gray-100">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'signin' ? (t.login || 'Sign In') : (t.signup || 'Sign Up')}
          </h1>
          <p className="text-gray-500 mt-2">{t.budgetForecaster || 'Budget Forecaster'}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl text-center mb-6">
            {error}
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.email || 'Email'}
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.password || 'Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.confirmPassword || 'Confirm Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isLoading ? 'Loading...' : (mode === 'signin' ? t.signIn : t.signUp) || 'Continue'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">{t.or || 'or'}</span>
          </div>
        </div>

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 bg-gray-50 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FaGoogle className="w-5 h-5" />
          {isLoading ? 'Loading...' : t.signInWithGoogle || 'Sign in with Google'}
        </button>

        {/* Toggle Button */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            {mode === 'signin'
              ? t.dontHaveAccount || "Don't have an account? "
              : t.haveAccount || 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError('');
                setPassword('');
                setConfirmPassword('');
              }}
              disabled={isLoading}
              className="text-blue-600 font-semibold hover:underline disabled:opacity-50"
            >
              {mode === 'signin' ? t.signUp : t.signIn}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 6: Error Mapping & User Feedback

### 6.1 Detailed Error Code Reference

| Error Code | Cause | User-Friendly Message |
|---|---|---|
| `auth/invalid-email` | Email format invalid | Invalid email address format |
| `auth/user-not-found` | No account with this email | No account found with this email address |
| `auth/wrong-password` | Password incorrect | Incorrect password |
| `auth/weak-password` | Password < 6 chars in signup | Password must be at least 6 characters |
| `auth/email-already-in-use` | Email exists during signup | An account with this email already exists |
| `auth/account-exists-with-different-credential` | Email linked to different auth method | This email is linked to another sign-in method |
| `auth/too-many-requests` | 15+ failed attempts | Too many failed attempts. Try again later. |
| `auth/operation-not-allowed` | Auth method disabled in console | This sign-in method is not available |
| `auth/popup-blocked` | Browser blocked OAuth popup | Please allow popups and try again |
| `auth/network-request-failed` | No internet connection | Network error. Check your internet. |

### 6.2 Token Refresh & Expiration Handling

Firebase automatically handles token refresh:

```typescript
/**
 * How Firebase handles token refresh automatically:
 * 
 * 1. Access token (JWT) issued with ~1 hour expiration
 * 2. Refresh token stored in browser storage AUTOMATICALLY
 * 3. When token expires, Firebase SDK silently refreshes
 * 4. If refresh fails (user logged out on another tab):
 *    - onAuthStateChanged fires with user = null
 *    - App automatically redirects to login
 * 
 * Your app only needs to:
 * - Call getIdToken(forceRefresh: true) when you need fresh token
 * - Let Firebase handle everything else
 */

export async function callBackendAPI(endpoint: string) {
  try {
    // Get fresh token (Firebase refreshes silently if needed)
    const token = await getIdToken(true);
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      // Token invalid/expired even after refresh attempt
      // User must re-authenticate
      throw new Error('Session expired. Please log in again.');
    }

    return response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

---

## Phase 7: Security Rules Integration

### 7.1 Connect Firebase Auth to Firestore Rules

Your Firestore Security Rules can now check `request.auth` object:

```firestore-rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ==================== User-Specific Data ====================
    // Each user can only read/write their own budgets
    match /users/{userId}/budgets/{document=**} {
      allow read, write: if request.auth.uid == userId;
      
      // Enforce data structure
      allow create: if 
        request.resource.data.size() == 5 &&
        request.resource.data.name is string &&
        request.resource.data.amount is number &&
        request.resource.data.frequency is string &&
        request.resource.data.createdAt is number;
      
      allow update: if 
        request.resource.data.keys().hasAll(['id', 'name']) &&
        resource.data.createdAt == request.resource.data.createdAt; // createdAt immutable
    }

    // ==================== User Metadata ====================
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // ==================== Admin Routes (optional) ====================
    match /admin/{document=**} {
      allow read, write: if 
        request.auth.token.admin == true; // Custom claim set in Firebase Console
    }

    // ==================== Deny All By Default ====================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 7.2 Using `request.auth` in Rules

```firestore-rules
{
  "uid": "abc123...",           // User's UID from Firebase Auth
  "email": "user@example.com",  // User's email (if verified)
  "token": {
    "iss": "https://...",          // Token issuer
    "aud": "your-project-id",      // Audience (your Firebase project)
    "admin": false,                // Custom claim (if set)
    "premium": false,              // Custom claim (if set)
    ...other token properties
  }
}
```

---

## Testing Scenarios

### Scenario A: Page Refresh - Session Persistence

**Goal:** Verify user is "remembered" after page refresh

**Steps:**
1. Start app, see loading screen
2. onAuthStateChanged initializes
3. Firebase SDK loads cached token from browser IndexedDB
4. onAuthStateChanged fires with user data (~100ms)
5. authLoading → false, user stays logged in
6. Refresh page → same flow repeats
7. ✅ User stays signed in without re-entering credentials

**Code to Test:**
```typescript
// App.tsx
if (authLoading) return <LoadingScreen />; // This shows for ~100ms on refresh
if (!user) return <Login />;  // Skipped because cached token restored
return <App />;
```

---

### Scenario B: Token Expires or Revocation

**Goal:** Verify app responds to token expiration / account deletion on another device

**Steps:**
1. Sign in user on Device A
2. On Device B, delete user account or revoke all sessions (Firebase Console)
3. On Device A, wait 1 hour or call API
4. Firebase detects token invalid
5. If user tries action → Firebase error
6. onAuthStateChanged fires with user = null
7. App redirects to login automatically
8. ✅ User session terminated gracefully

**Code to Test:**
```typescript
// In useEffect on App.tsx
useEffect(() => {
  let unsubscribe: (() => void) | null = null;

  // onAuthStateChanged handles revocation automatically
  unsubscribe = onAuthStateChanged(auth, (user) => {
    setUser(user); // Sets to null if revoked
    setAuthLoading(false);
  });

  return () => unsubscribe?.();
}, []);

// Scenario B detection
if (!user && !authLoading) {
  // User was logged in but now isn't → redirect to login
  return <Login />;
}
```

---

### Scenario C: Account Exists with Different Credential

**Goal:** Handle social login email conflicts

**Steps:**
1. User signs up with email/password: `user@example.com / password123`
2. Later, user tries: "Sign in with Google" using same email
3. Firebase detects email already exists  with different credential
4. Throws `auth/account-exists-with-different-credential`
5. Show error: "This email uses password sign-in. Please sign in with password first."
6. After password sign-in, optionally offer: "Link Google account"
7. ✅ User can consolidate accounts

**Code to Test:**
```typescript
// src/services/authActions.ts - signInWithGoogle()
try {
  const result = await signInWithPopup(auth, googleProvider);
} catch (error: any) {
  // Specific error code
  if (error.code === 'auth/account-exists-with-different-credential') {
    const email = error.customData?.email;
    return {
      success: false,
      error: `This email (${email}) is linked to password sign-in. Use password instead.`
    };
  }
}

// Later, after password sign-in completes:
import { linkWithPopup } from 'firebase/auth';
const result = await linkWithPopup(auth.currentUser, googleProvider);
// Now both sign-in methods work
```

---

## Phase 8: Firestore Integration (Budgets)

### 8.1 Update Hooks to Use Firebase Auth Context

Update `src/hooks/useBudgets-firestore.ts` to scope by user UID:

```typescript
/**
 * src/hooks/useBudgets-firestore.ts (excerpt)
 * Updated to use Firebase Auth
 */

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth'; // New hook from Phase 8.2
import { 
  collection, 
  addDoc, 
  query, 
  where,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../db/firebase';
import { Budget } from '../types';

export function useBudgetsFirestore() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen to user's budgets only
  useEffect(() => {
    if (!user) {
      setBudgets([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'budgets'),
      where('userId', '==', user.uid) // Double-check (rules handle primary check)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Budget[];
      
      setBudgets(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { budgets, loading };
}
```

### 8.2 Create useAuth Hook

```typescript
/**
 * src/hooks/useAuth.ts
 * React hook to access current user from context
 */

import { useContext } from 'react';
import { User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuthObserver((authUser, authLoading) => {
      setUser(authUser);
      setLoading(authLoading);
    });

    return () => cleanupAuthObserver();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## Migration Checklist

- [ ] **Phase 1: Configuration**
  - [ ] Create `src/services/auth.ts` with getAuth() and onAuthStateChanged
  - [ ] Enable Email/Password provider in Firebase Console
  - [ ] Enable Google OAuth provider in Firebase Console
  - [ ] Configure OAuth Consent Screen

- [ ] **Phase 2: Observer Pattern**
  - [ ] Update `App.tsx` to use auth observer
  - [ ] Add loading state during Firebase initialization
  - [ ] Implement route guarding (unauthenticated → Login)
  - [ ] Update Settings page to show user.email

- [ ] **Phase 3: Action Methods**
  - [ ] Create `src/services/authActions.ts`
  - [ ] Implement signInWithEmail()
  - [ ] Implement signUpWithEmail()
  - [ ] Implement signInWithGoogle()
  - [ ] Implement signOutUser()
  - [ ] Add error mapping for all Firebase error codes

- [ ] **Phase 4: Route Guarding**
  - [ ] Create ProtectedRoute component (optional)
  - [ ] Update Login page route guards
  - [ ] Handle loading state properly

- [ ] **Phase 5: Login.tsx Update**
  - [ ] Update Login.tsx with Email/Password form
  - [ ] Add Google OAuth button
  - [ ] Add Sign Up / Sign In toggle
  - [ ] Display error messages from mapAuthError()
  - [ ] Show loading states during sign-in

- [ ] **Phase 6: Error Handling**
  - [ ] Test auth/user-not-found error
  - [ ] Test auth/wrong-password error
  - [ ] Test auth/email-already-in-use error
  - [ ] Test auth/too-many-requests error (5+ failed attempts)
  - [ ] Test auth/account-exists-with-different-credential error
  - [ ] Test network failure handling

- [ ] **Phase 7: Security Rules**
  - [ ] Update Firestore rules to use request.auth.uid
  - [ ] Scope budgets collection to user documents
  - [ ] Test rules security

- [ ] **Phase 8: Firestore Integration**
  - [ ] Update useBudgets hook to use auth context
  - [ ] Create useAuth React hook
  - [ ] Update budget queries to filter by user UID

- [ ] **Testing**
  - [ ] Test Scenario A: Page refresh → session persists
  - [ ] Test Scenario B: Token expiration → auto logout
  - [ ] Test Scenario C: Account exists error → proper messaging
  - [ ] Test Google OAuth popup flow
  - [ ] Test password reset flow (optional)
  - [ ] Test logout removes all auth tokens

- [ ] **Documentation**
  - [ ] Update README with Firebase Auth setup
  - [ ] Document environment variables needed
  - [ ] Create troubleshooting guide for common errors

---

## Key Takeaways

1. **onAuthStateChanged is not a preference—it's essential**
   - Handles persistence automatically
   - Detects revocation/expiration
   - Syncs across tabs
   - Eliminates race conditions

2. **Loading state is critical**
   - onAuthStateChanged fires asynchronously
   - Show loading screen until Firebase initializes
   - Prevents login screen flash on page refresh

3. **Error handling must be comprehensive**
   - Firebase throws specific error codes
   - Map codes to user-friendly messages
   - Handle special cases (e.g., account-exists-with-different-credential)

4. **All auth operations are async Promises**
   - Wrap in try/catch blocks
   - Handle errors explicitly
   - Don't assume synchronous behavior

5. **Security Rules are the source of truth**
   - Frontend auth is for UX
   - Firestore Rules protect data
   - Always validate `request.auth.uid` in Rules

6. **Token management is automatic**
   - Firebase SDK handles refresh tokens
   - Call getIdToken(true) for APIs
   - Don't manually manage tokens

---

## Next Steps

1. Create `src/services/auth.ts` (Phase 1)
2. Update `App.tsx` with observer pattern (Phase 2)
3. Create `src/services/authActions.ts` (Phase 3)
4. Update `Login.tsx` (Phase 5)
5. Update Firestore Security Rules (Phase 7)
6. Run through testing scenarios
7. Deploy to production Firebase project

