# Firebase Auth v9+ Implementation Guide

## Quick Start

This guide walks you through implementing Firebase Auth into your Budget Forecaster application.

### Files Created
- `src/services/auth.ts` - Auth initialization and observer
- `src/services/authActions.ts` - Sign-in, sign-up, Google OAuth, and error handling
- `src/hooks/useAuth.ts` - React hook for auth state
- `src/utils/logging.ts` - Logging utility
- `src/pages/Login.tsx` - Updated login page with Firebase Auth

### Files Modified
- `src/App.tsx` - Integrated auth observer and loading states
- `src/pages/Settings.tsx` - Added logout button and user info display

---

## Implementation Steps

### Step 1: Verify Firebase Configuration

Check that your `src/db/firebase.ts` has the correct Firebase config:

```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
```

### Step 2: Create `.env.local` File

Create `.env.local` in your project root with your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

**Get these from:** Firebase Console → Project Settings → General

### Step 3: Enable Firebase Auth Providers

#### Email/Password Provider

1. Go to Firebase Console → Authentication → Sign-in method
2. Click "Email/Password"
3. Enable "Email/Password"
4. Optionally enable "Email link (passwordless sign-in)"
5. Click "Save"

#### Google OAuth Provider

1. Click "Google" in Sign-in method
2. Enable it
3. Set up OAuth Consent Screen:
   - Select "External" user type
   - Fill in app name: "Budget Forecaster"
   - Add your domain to authorized origins
   - Add redirect URI: `https://yourproject.firebaseapp.com/__/auth/handler`
4. Click "Save"

> **Note:** In development, you can leave these blank for local testing with `localhost`

### Step 4: Implement App-level Auth Observer

The `App.tsx` already includes auth setup. Verify this code exists:

```typescript
useEffect(() => {
  initAuthObserver((authUser, loading) => {
    setUser(authUser);
    setAuthLoading(false);
  });

  return () => {
    cleanupAuthObserver();
  };
}, []);
```

### Step 5: Test the Flow

1. **Start dev server:**
   ```bash
   pnpm dev
   ```

2. **Verify Loading State:**
   - Page should show loading screen for ~100ms
   - Then load the app or login page

3. **Test Email/Password Sign-up:**
   - Click "Create Account"
   - Enter email and password (6+ chars)
   - Should sign up and go to dashboard

4. **Test Email/Password Sign-in:**
   - Sign out (Settings page)
   - Sign back in with same credentials
   - Should show dashboard

5. **Test Google OAuth:**
   - Click "Sign in with Google"
   - Should open OAuth popup
   - After auth, should show dashboard

6. **Test Page Refresh:**
   - Sign in successfully
   - Refresh page (Cmd+R)
   - Should NOT show login page
   - Should load dashboard immediately

---

## Common Issues & Solutions

### Issue: Page shows loading screen then login page constantly

**Cause:** Firebase app not initialized or auth observer not set up

**Solution:**
1. Check `.env.local` has correct Firebase credentials
2. Verify `initAuthObserver` is called in `App.tsx` useEffect
3. Open browser DevTools Console and look for Firebase errors

### Issue: Google OAuth popup doesn't appear

**Cause:** Browser popup blocker or provider not configured

**Solution:**
1. Check browser popup blocker settings
2. Verify Google provider enabled in Firebase Console
3. Check browser console for error: `auth/popup-blocked` or `auth/unauthorized-domain`
4. Add your domain to OAuth Consent Screen authorized origins

### Issue: "Invalid API key" error

**Cause:** Firebase config not loaded from .env

**Solution:**
1. Verify `.env.local` exists in project root
2. Verify all `VITE_` prefixes are correct
3. Stop and restart dev server (env vars cached)

### Issue: User signs out but still sees dashboard

**Cause:** Auth observer not connected to route guarding

**Solution:**
Check that `src/App.tsx` has this logic:
```typescript
if (!user) {
  return <Login t={t} />;
}
```

---

## Understanding the Auth Flow

### Session Initialization (Page Load)

```
User loads app
   ↓
App mounts, authLoading = true
   ↓
useEffect calls initAuthObserver()
   ↓
Firebase SDK loads cached token from IndexedDB (~100ms)
   ↓
onAuthStateChanged fires with user data
   ↓
authLoading = false
   ↓
App renders dashboard (or login if no user)
```

### Sign-in Flow

```
User enters email/password
   ↓
Click "Sign In"
   ↓
signInWithEmail() called
   ↓
Firebase verifies credentials
   ↓
onAuthStateChanged fires automatically
   ↓
App sees user object and renders dashboard
```

### Sign-out Flow

```
User clicks "Sign Out" in Settings
   ↓
Confirmation modal shown
   ↓
signOutUser() called
   ↓
Firebase clears stored token
   ↓
onAuthStateChanged fires with user = null
   ↓
App detects and renders login page
```

### Token Refresh (Automatic)

```
User signs in (token issued, expires in ~1 hour)
   ↓
Firebase stores refresh token in IndexedDB
   ↓
Before expiration, Firebase silently refreshes token
   ↓
If refresh fails:
   ↓
   onAuthStateChanged fires with user = null
   ↓
   App logs user out automatically
```

---

## Error Handling Examples

### Example 1: Email Already in Use (Sign-up)

```typescript
const result = await signUpWithEmail('user@example.com', 'password123');
if (!result.success) {
  // result.error = "An account with this email already exists"
  showError(result.error);
}
```

### Example 2: Wrong Password (Sign-in)

```typescript
const result = await signInWithEmail('user@example.com', 'wrongpass');
if (!result.success) {
  // result.error = "Incorrect password"
  showError(result.error);
}
```

### Example 3: Account Exists with Different Credential (Google)

```typescript
const result = await signInWithGoogle();
if (!result.success) {
  if (result.error?.includes('account-exists-with-different-credential')) {
    // Show: "This email uses password sign-in. Please sign in with password first."
    showModal({
      title: 'Sign In with Email',
      message: 'This email is linked to password authentication. Please sign in with your password.',
      action: () => switchToPasswordSignIn()
    });
  }
}
```

---

## Testing Scenarios

### Scenario A: Page Refresh (Session Persistence)

**Expected:**
- Refresh page
- Loading screen shows for ~100ms
- Dashboard appears without needing to log in again

**To Test:**
1. Sign in successfully
2. Navigate to any page
3. Press Cmd+R (refresh)
4. Observe: Page should load without login screen

### Scenario B: Token Expiration

**Expected:**
- User's token expires or is revoked on another device
- User is automatically signed out
- Next time they try to use app, they're on login page

**To Test (in development only):**
1. Sign in
2. Go to Firebase Console → Authentication → Users
3. Click the user and copy their UID
4. In Firebase CLI: `firebase auth:delete [UID]`
5. Refresh page or try API call
6. Should redirect to login page

### Scenario C: Multiple Tabs Sync

**Expected:**
- Sign in on Tab A
- Tab B should show user as signed in (without refresh)
- Sign out on Tab A
- Tab B should update to show login page

**To Test:**
1. Open app in Tab A
2. Open app in Tab B
3. Sign in on Tab A
4. Check Tab B: should show dashboard (no refresh needed)
5. Sign out on Tab A
6. Check Tab B: should show login page (auto-detected)

---

## Firestore Security Rules Integration

After implementing auth, update your Firestore Rules to use `request.auth`:

```firestore-rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Each user can only read/write their own data
    match /budgets/{userId}/items/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
    
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Deny all by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Key:** `request.auth.uid` is only available when user is signed in via Firebase Auth

---

## Security Best Practices

1. **Never store passwords client-side** ✅ Firebase handles this
2. **Always use HTTPS** ✅ Firebase enforces this
3. **Tokens are auto-refreshed** ✅ Firebase handles this
4. **Validate auth on backend** ✅ Verify ID tokens server-side
5. **Use Security Rules** ✅ Implement database-level access control

---

## Next Steps

### Immediate:
1. Set up Firebase project if not done
2. Enable Email/Password and Google providers
3. Update `.env.local` with credentials
4. Test sign-in/sign-up/sign-out flows

### Future Enhancements:
1. **Password Reset:** Implement `sendPasswordResetEmail()`
2. **Email Verification:** Require email verification before access
3. **Custom Claims:** Add admin roles via Firebase Console
4. **Anonymous Auth:** For guest users
5. **Social Providers:** Add Facebook, GitHub, Twitter

### Backend Integration:
1. Create backend endpoints that verify Firebase ID tokens
2. Use Firebase Admin SDK to verify tokens server-side
3. Create user profiles in Firestore after signup

---

## File Reference

| File | Purpose |
|------|---------|
| `src/services/auth.ts` | Initialize Firebase Auth and set up observer |
| `src/services/authActions.ts` | Sign-in, sign-up, Google OAuth, error mapping |
| `src/hooks/useAuth.ts` | React hook for accessing auth state |
| `src/pages/Login.tsx` | Login/signup UI component |
| `src/App.tsx` | Auth initialization and route guarding |
| `src/pages/Settings.tsx` | Logout and user info display |

---

## Support

For issues:
1. Check browser Developer Tools Console for errors
2. Review Firebase Console → Logs for backend errors
3. Check `[Auth]` logs in browser console for action history
4. Refer to Firebase docs: https://firebase.google.com/docs/auth

---

## Glossary

- **Auth Observer:** `onAuthStateChanged()` listener that detects auth state changes
- **Access Token:** JWT that proves user's identity (expires ~1 hour)
- **Refresh Token:** Long-lived token used to get new access tokens
- **Session Persistence:** Storing login info so user stays signed in after refresh
- **OAuth:** Social login protocol (Google, Facebook, etc.)
- **ID Token:** JWT with user claims, sent to backend APIs
- **Custom Claims:** Custom data attached to user's token (e.g., role: 'admin')
