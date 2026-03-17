# Firebase Auth Implementation Checklist

**Status:** Production-ready code delivered  
**Start Time:** 15 minutes  
**Implementation Time:** 1-2 hours
**Deploy Time:** Depends on your platform

---

## Pre-Implementation (5-10 min)

- [ ] Read FIREBASE_AUTH_IMPLEMENTATION.md (skim first, 20 min)
- [ ] Have Firebase project ready (or create one)
- [ ] Find Firebase config values in Firebase Console
- [ ] Have text editor ready for `.env.local`

---

## Firebase Console Setup (10-15 min)

### Project Configuration
- [ ] Go to Firebase Console → Project Settings
- [ ] Copy API Key
- [ ] Copy Auth Domain
- [ ] Copy Project ID
- [ ] Copy Storage Bucket
- [ ] Copy Messaging Sender ID
- [ ] Copy App ID

### Email/Password Provider
- [ ] Go to Authentication → Sign-in method
- [ ] Click "Email/Password"
- [ ] Toggle "Email/Password" to ON
- [ ] Optionally enable "Email link (passwordless)"
- [ ] Click "Save"

### Google OAuth Provider
- [ ] Click "Google" in Sign-in method
- [ ] Toggle to ON
- [ ] Go to OAuth Consent Screen
- [ ] Select "External" user type
- [ ] Fill in app name: "Budget Forecaster"
- [ ] Add your domain to authorized origins
- [ ] Add `https://yourproject.firebaseapp.com/__/auth/handler`
- [ ] Click "Save"
- [ ] Test domain indicator should show "verified"

---

## Local Setup (5 min)

### Create Environment File
- [ ] Create `.env.local` in project root
- [ ] Add Firebase config values:
  ```
  VITE_FIREBASE_API_KEY=...
  VITE_FIREBASE_AUTH_DOMAIN=...
  VITE_FIREBASE_PROJECT_ID=...
  VITE_FIREBASE_STORAGE_BUCKET=...
  VITE_FIREBASE_MESSAGING_SENDER_ID=...
  VITE_FIREBASE_APP_ID=...
  ```

### Verify Setup
- [ ] `.env.local` saved in project root
- [ ] All 6 Firebase config values present
- [ ] No accidental quotes around values
- [ ] Stop and restart dev server (to reload env)

---

## Code Verification (5 min)

### New Files Exist
- [ ] `src/services/auth.ts` exists
- [ ] `src/services/authActions.ts` exists
- [ ] `src/hooks/useAuth.ts` exists
- [ ] `src/utils/logging.ts` exists

### Updated Files Modified
- [ ] `src/App.tsx` has `initAuthObserver` call
- [ ] `src/pages/Login.tsx` imports Firebase auth actions
- [ ] `src/pages/Settings.tsx` has logout button
- [ ] No import errors in IDE

---

## Local Testing (15-20 min)

### Start the App
- [ ] Run `pnpm dev`
- [ ] App opens without errors
- [ ] No "invalid API key" errors in console

### Test Sign-Up Flow
- [ ] See loading screen (~100ms)
- [ ] See login page
- [ ] Click "Create Account"
- [ ] Form toggles to sign-up mode
- [ ] Enter new email: `testuser@example.com`
- [ ] Enter password: `TestPass123!`
- [ ] Enter confirm password: `TestPass123!`
- [ ] Click "Create Account"
- [ ] Should redirect to dashboard
- [ ] Check Firebase Console → Users (new user listed)

### Test Sign-In Flow
- [ ] Click "Sign Out" in Settings
- [ ] Confirm sign-out
- [ ] Back on login page
- [ ] Click "Sign In" (toggle if needed)
- [ ] Enter same email: `testuser@example.com`
- [ ] Enter password: `TestPass123!`
- [ ] Click "Sign In"
- [ ] Should redirect to dashboard

### Test Password Error
- [ ] Sign out again
- [ ] Enter correct email but wrong password
- [ ] Click "Sign In"
- [ ] Should show: "Incorrect password"
- [ ] Error has user-friendly message

### Test Email Not Found
- [ ] On login page
- [ ] Enter non-existent email: `nobody@example.com`
- [ ] Enter any password
- [ ] Click "Sign In"
- [ ] Should show: "No account found with this email"

### Test Email Already Exists
- [ ] Click "Create Account"
- [ ] Enter same email: `testuser@example.com`
- [ ] Enter password: `TestPass123!`
- [ ] Click "Create Account"
- [ ] Should show: "An account with this email already exists"

### Test Page Refresh (Most Important!)
- [ ] Sign in successfully (reach dashboard)
- [ ] Press Cmd+R (refresh page)
- [ ] Should NOT see login page
- [ ] Should see dashboard and loading screen briefly
- [ ] User stays signed in without re-entering credentials
- [ ] ✅ Session persistence working!

### Test Google OAuth
- [ ] Back on login page
- [ ] Click "Continue with Google"
- [ ] OAuth popup should open
- [ ] Select Google account
- [ ] Should redirect to dashboard
- [ ] Check Firebase Console → Users (new Google user listed)

### Test Multi-Tab Sign-Out
- [ ] Open new browser tab (Tab B)
- [ ] Both tabs show dashboard
- [ ] In Tab A, go to Settings, click "Sign Out", confirm
- [ ] Check Tab B: Should auto-update to login page (without refresh!)
- [ ] ✅ Multi-tab sync working!

---

## Firestore Setup (Optional but Recommended)

### Update Security Rules
- [ ] Go to Firebase Console → Firestore → Rules
- [ ] Replace with:
  ```firestore-rules
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /budgets/{userId}/{document=**} {
        allow read, write: if request.auth.uid == userId;
      }
      match /{document=**} {
        allow read, write: if false;
      }
    }
  }
  ```
- [ ] Click "Publish"

### Test Rules
- [ ] Sign in as User 1
- [ ] Create a budget item
- [ ] Note the collection structure
- [ ] Sign out and sign in as User 2
- [ ] Should not see User 1's budgets
- [ ] User 2 can create their own budgets
- [ ] ✅ Data isolation working!

---

## Production Preparation (Before Deploy)

### Environment Variables
- [ ] Set `VITE_FIREBASE_API_KEY` in hosting platform
- [ ] Set all other Firebase config values
- [ ] No sensitive data in git (check `.gitignore`)
- [ ] `.env.local` is in `.gitignore`

### Firebase Console
- [ ] Switch Firebase project to production security mode
- [ ] Update authorized domains to include production URL
- [ ] Update OAuth Consent Screen with production domain
- [ ] Review Security Rules one more time

### Code
- [ ] No `console.log` statements with sensitive data
- [ ] All error messages are user-friendly
- [ ] Loading states work for slow networks
- [ ] Mobile UI looks good (test on phone)

### Testing
- [ ] Test sign-in/sign-up on production domain
- [ ] Test page refresh on production
- [ ] Test across multiple browsers
- [ ] Test on mobile (Safari, Chrome)
- [ ] Monitor Firebase Console for unusual activity

---

## Post-Deployment

### Monitoring
- [ ] Set up Firebase alerts for suspicious activity
- [ ] Monitor authentication success/failure rates
- [ ] Check for unusual error patterns
- [ ] Review user creation trends

### User Communication
- [ ] Send notification about new auth system
- [ ] Clear instructions for password reset
- [ ] Support email for auth issues

### Maintenance  
- [ ] Document how to reset user passwords
- [ ] Document how to delete user data
- [ ] Set up backup/restore procedures
- [ ] Create admin dashboard (optional)

---

## Troubleshooting

### Issue: "Invalid API key" error

**Quick Fix:**
1. Stop dev server (Ctrl+C)
2. Double-check `.env.local` values
3. Restart dev server
4. Hard refresh browser (Cmd+Shift+R)

**If still fails:**
- Firebase Console → Project Settings → Verify all keys
- Are there any quotes around values in `.env.local`?
- Is `.env.local` in project root (not a subdirectory)?

### Issue: Google OAuth popup doesn't appear

**Quick Fix:**
1. Check browser popup blocker settings
2. Check browser console for error
3. Verify Google provider enabled in Firebase Console
4. Check OAuth Consent Screen configured

### Issue: Can't sign up/sign in

**Quick Fix:**
1. Check Firebase Console → Authentication
2. Is Email/Password provider enabled? (should be blue toggle)
3. Refresh page (hard: Cmd+Shift+R)
4. Check browser console for error messages

### Issue: Page refresh doesn't preserve login

**Quick Fix:**
1. Open DevTools → Application → IndexedDB
2. Check if Firebase cache exists (should show IndexedDB database)
3. Check browser allows IndexedDB
4. Private/Incognito mode won't persist (known limitation)

---

## Reference Links

- **Firebase Console:** https://console.firebase.google.com
- **Firebase Auth Docs:** https://firebase.google.com/docs/auth
- **Error Codes:** https://firebase.google.com/docs/auth/troubleshoot-common-issues
- **Security Rules:** https://firebase.google.com/docs/firestore/security/get-started

---

## Success Indicators ✓

By the end of implementation, you should see:

- ✅ Sign-up works with new email
- ✅ Sign-in works with existing email
- ✅ Wrong password shows friendly error
- ✅ Email already exists shows friendly error
- ✅ Page refresh preserves session (no login screen)
- ✅ Google OAuth login works
- ✅ Sign-out clears session
- ✅ Settings page shows user email
- ✅ Firebase Console lists new users
- ✅ No console errors (only `[Auth]` logs)

---

## Time Breakdown

| Phase | Time |
|-------|------|
| Firebase setup | 10-15 min |
| Local setup (.env) | 5 min |
| Code verification | 5 min |
| Testing flows | 15-20 min |
| Firestore rules | 5-10 min |
| **Total** | **45-65 min** |

---

## Document Reference Quick Links

| Question | Document | Section |
|----------|----------|---------|
| "How do I set it up?" | FIREBASE_AUTH_IMPLEMENTATION.md | "Implementation Steps" |
| "Why is this better?" | FIREBASE_AUTH_MIGRATION.md | "Phase 2" |
| "What error means X?" | FIREBASE_AUTH_QUICK_REFERENCE.md | "Error Code Reference" |
| "How do I use X feature?" | FIREBASE_AUTH_QUICK_REFERENCE.md | "Code Snippets" |
| "Full deep dive?" | FIREBASE_AUTH_MIGRATION.md | All phases |
| "What was delivered?" | FIREBASE_AUTH_DELIVERY_SUMMARY.md | Full summary |

---

## Emergency Contacts

If stuck:
1. See FIREBASE_AUTH_IMPLEMENTATION.md → "Common Issues & Solutions"
2. Open browser console (F12) → Application tab
3. Check for Firebase indexedDB storage
4. Review Firebase Console → Logs

---

## Done! 🎉

Once you've completed all checkboxes, your app has:

✅ Real authentication system  
✅ Multi-device support  
✅ Automatic session persistence  
✅ Google OAuth integration  
✅ User-friendly error messages  
✅ Security-first rules  

**Next:** Users can create real accounts and start budgeting!

---

**Last Updated:** March 17, 2026  
**Status:** Ready for immediate implementation
