# Auth Flow

**Source of Truth:** `src/services/auth.ts` · `src/services/authActions.ts` · `src/pages/Login.tsx`

## Architecture

Firebase Auth singleton is initialized once at module load (`src/db/firebase.ts`). The observer pattern decouples auth state from components — `App.tsx` calls `initAuthObserver(callback)` once on mount; all components downstream receive the `user` prop or read from context.

```
App mounts
  → initAuthObserver(setUser, setAuthLoading)    src/services/auth.ts
      → onAuthStateChanged fires
          → user = null  → render <Login />
          → user = User  → render dashboard + init BudgetProvider
```

## Session Persistence

- **Default:** `browserLocalPersistence` (IndexedDB) — survives tab close/refresh
- **Fallback:** `browserSessionPersistence` — for private/incognito mode
- Token refresh is automatic; use `getIdToken(forceRefresh)` only when an API call requires a fresh JWT

## Sign-In Methods

| Method | Function | Location |
|---|---|---|
| Email/Password | `signInWithEmail(email, password)` | `src/services/authActions.ts` |
| Email/Password Register | `signUpWithEmail(email, password)` | `src/services/authActions.ts` |
| Google OAuth | `signInWithGoogle()` | `src/services/authActions.ts` |
| Sign Out | `signOutUser()` | `src/services/authActions.ts` |

All return `{ success: boolean, error?: string }`. Never throw — errors are mapped to user-readable strings via `mapAuthError()`.

## Error Mapping

`mapAuthError(error)` in `src/services/authActions.ts` converts Firebase error codes (e.g., `auth/wrong-password`) to i18n-friendly strings. Add new mappings there — do NOT surface raw Firebase error codes to the UI.

## Adding a New Auth Method

1. Add action function to `src/services/authActions.ts`
2. Surface errors via `mapAuthError()`
3. Call `showToast()` from `useToast()` for user feedback — not `alert()`
4. No routing needed — `onAuthStateChanged` triggers re-render automatically

## What NOT to Do

- Do not call `getAuth()` in components — import `auth` from `src/services/auth.ts`
- Do not check `auth.currentUser` synchronously during initial render — `authLoading` is `true` until the observer fires
- Do not redirect with `window.location` — the auth observer handles view switching
