# Firebase Authentication Flow Documentation

## Overview

This document describes the complete authentication flow in the Fire Budget Tracker Forecaster application, including Firebase Auth setup, user sign-in/sign-up, and state management.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       App.tsx (Root)                        │
│                                                             │
│  1. useEffect → initAuthObserver()                         │
│  2. onAuthStateChanged callback → setUser(user)            │
│  3. User state drives routing (Login vs Dashboard)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              src/services/auth.ts                           │
│              (Firebase Auth Initialization)                 │
│                                                             │
│  • getAuth(app) → Firebase Auth singleton                  │
│  • initAuthObserver() → Sets up onAuthStateChanged()       │
│  • cleanupAuthObserver() → Cleanup on unmount              │
│  • getCurrentUser() → Get current user synchronously        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           src/services/authActions.ts                       │
│           (Firebase Auth Operations)                        │
│                                                             │
│  Email/Password:                                           │
│  • signInWithEmail(email, password)                        │
│  • signUpWithEmail(email, password)                        │
│                                                             │
│  Social OAuth:                                             │
│  • signInWithGoogle()                                      │
│                                                             │
│  Logout:                                                   │
│  • signOutUser()                                           │
│                                                             │
│  Utilities:                                                │
│  • mapAuthError() → User-friendly error messages           │
│  • getIdToken() → Get JWT for API calls                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Firebase Authentication SDK                    │
│              (External Service)                             │
│                                                             │
│  • IndexedDB for persistent session storage                │
│  • Automatic token refresh every ~1 hour                   │
│  • Multi-tab synchronization                               │
│  • Revocation detection                                    │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flow Steps

### 1. App Startup (App.tsx)

```typescript
useEffect(() => {
  initAuthObserver((user, loading) => {
    setUser(user);
    setAuthLoading(loading);
  });
  return () => cleanupAuthObserver();
}, []);
```

**What happens:**
- App mounts and calls `initAuthObserver()` once
- Firebase SDK checks IndexedDB for existing session
- If found, user is automatically signed in
- `onAuthStateChanged` callback fires with user object
- Loading state transitions from true → false

### 2. User Sign-In (Login.tsx → authActions.ts)

```typescript
// User enters email/password and clicks Sign In
const result = await signInWithEmail(email, password);

if (result.success) {
  // App component detects auth state change
  // Automatically redirects to Dashboard
}
```

**What happens:**
1. Form validates email/password
2. `signInWithEmailAndPassword(auth, email, password)` called
3. Firebase verifies credentials against backend
4. On success:
   - Firebase creates session token
   - Stores in IndexedDB (persistent across browser restart)
   - `onAuthStateChanged` callback fires with user object
   - App.tsx detects change and updates state
   - UI automatically redirects to Dashboard
5. On failure:
   - Firebase returns error code
   - `mapAuthError()` translates to user-friendly message
   - Error displayed in UI

### 3. User Sign-Up (Login.tsx → authActions.ts)

```typescript
// User enters email/password and clicks Sign Up
const result = await signUpWithEmail(email, password);

if (result.success) {
  // New account created and user automatically signed in
  // App redirects to Dashboard
}
```

**What happens:**
1. Form validates email/password (6+ characters)
2. `createUserWithEmailAndPassword(auth, email, password)` called
3. Firebase creates new user account
4. User automatically signed in (session created)
5. Same as Sign-In flow from here on

### 4. Google OAuth Sign-In (Login.tsx → authActions.ts)

```typescript
// User clicks "Continue with Google"
const result = await signInWithGoogle();

if (result.success) {
  // User selected Google account in popup
  // Firebase creates/links account
  // App redirects to Dashboard
}
```

**What happens:**
1. Google OAuth popup opens
2. User selects Google account and grants permission
3. Firebase receives OAuth token from Google
4. Firebase creates or links account (auto-creates if new)
5. Same as Sign-In from here on

### 5. Sign-Out (Settings.tsx → authActions.ts)

```typescript
// User clicks Sign Out button
const result = await signOutUser();

if (result.success) {
  // User automatically redirected to Login page
}
```

**What happens:**
1. `signOut(auth)` clears session tokens
2. IndexedDB storage cleared
3. `onAuthStateChanged` fires with user = null
4. App.tsx detects auth state change
5. UI automatically redirects to Login page

## Key Features

### Session Persistence

- **Default:** IndexedDB (browser local storage)
  - Survives browser restart
  - Survives app close/reopen
  - Persists across tabs

- **Private/Incognito:** Session memory only
  - Cleared when browser closes

### Automatic Token Refresh

- Firebase tokens expire after ~1 hour
- Firebase SDK automatically refreshes in background
- User remains signed in without re-authenticating
- If refresh fails, user automatically signed out

### Multi-Tab Synchronization

- Changes in one tab detected in all tabs
- If user logs out in Tab A, Tab B detects it
- No polling or manual sync needed

### Error Handling

All auth functions return structured result objects:

```typescript
{
  success: boolean;
  error?: string;  // User-friendly message
  uid?: string;    // For sign-up
}
```

Error codes mapped to readable messages:
- `auth/wrong-password` → "Incorrect password"
- `auth/user-not-found` → "No account found"
- `auth/email-already-in-use` → "Account already exists"
- etc. (see `mapAuthError()` for full list)

## Firebase Console Setup Required

Before authentication works, you must:

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create new project

2. **Enable Email/Password Authentication**
   - Auth → Sign-in method
   - Enable Email/Password

3. **Enable Google OAuth (Optional)**
   - Auth → Sign-in method
   - Enable Google
   - Add your domain to OAuth consent screen

4. **Create Environment Variables**
   - Copy Firebase config from Project Settings
   - Add to `.env.local`:
     ```
     VITE_FIREBASE_API_KEY=...
     VITE_FIREBASE_AUTH_DOMAIN=...
     VITE_FIREBASE_PROJECT_ID=...
     VITE_FIREBASE_STORAGE_BUCKET=...
     VITE_FIREBASE_MESSAGING_SENDER_ID=...
     VITE_FIREBASE_APP_ID=...
     ```

## Code Organization

### `src/services/auth.ts`
- Firebase Auth initialization
- `initAuthObserver()` - Set up auth state listener
- `cleanupAuthObserver()` - Clean up on unmount
- `getCurrentUser()` - Get current user synchronously
- `getIdToken()` - Get JWT token for APIs

### `src/services/authActions.ts`
- `signInWithEmail()` - Email/password sign-in
- `signUpWithEmail()` - Email/password sign-up
- `signInWithGoogle()` - Google OAuth sign-in
- `signOutUser()` - Sign-out
- `mapAuthError()` - Error message translation

### `src/App.tsx`
- Initializes auth observer in useEffect
- Manages user state with useState
- Conditionally renders Login or Dashboard
- Routes to Settings page on authenticated user

### `src/pages/Login.tsx`
- Sign-in form (email/password)
- Sign-up form (email/password)
- Google OAuth button
- Error message display

### `src/pages/Settings.tsx`
- Sign-out button
- User info display (email, UID, member since)

## Best Practices Used

1. **Observer Pattern** - React component subscribes to auth changes via `initAuthObserver()`
2. **Single Responsibility** - Auth service only handles auth, UI components handle presentation
3. **Error Mapping** - Firebase errors translated to user-friendly messages
4. **Type Safety** - All functions have TypeScript types and JSDoc documentation
5. **Cleanup** - `cleanupAuthObserver()` prevents memory leaks on unmount
6. **No Manual State** - Firebase handles session persistence and token refresh
7. **Structural Results** - Functions return `{ success, error, uid? }` for consistent error handling

## Troubleshooting

### User stays on Login page after sign-in
- Check console for Firebase errors
- Verify Firebase config in environment variables
- Ensure Firebase project has Email/Password enabled

### Google OAuth popup doesn't open
- Browser popup blocker may be blocking
- Domain not whitelisted in Firebase Console
- Check browser console for "popup blocked" error

### User signs out on page refresh
- IndexedDB storage cleared by browser
- Check browser private/incognito mode
- Verify Firebase Firestore offline persistence enabled

### "Permission denied" Firestore errors
- Firestore Security Rules not configured
- Budget documents missing userId field
- See [Firestore Migration Guide](./FIRESTORE_MIGRATION.md)

## Testing

Authentication is mocked in tests via `vitest.setup.ts`:

```typescript
vi.mock('firebase/auth', () => ({
  initializeAuth: vi.fn(),
  onAuthStateChanged: vi.fn(),
  // ... other mocks
}));
```

This allows unit tests to run without Firebase backend.

## References

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Web SDK API](https://firebase.google.com/docs/reference/js/v9)
- [Firestore Security Rules](./FIRESTORE_MIGRATION.md)
