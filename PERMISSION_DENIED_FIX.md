# 🔒 Firestore Permission Denied Error - Troubleshooting Guide

## Error Message
```
❌ Firestore listener error: FirebaseError: Missing or insufficient permissions.
```

## Root Causes & Solutions

### 1️⃣ **Composite Index Not Yet Built** (Most Common)
When you update Firestore Security Rules, composite indexes may need to rebuild.

**How to fix:**
- ⏳ **Wait 5-10 minutes** - Firestore builds indexes automatically
- 🔄 **Refresh the page** - Ctrl+R or Cmd+R
- 🗑️ **Clear browser cache** - DevTools > Application > Clear Storage

**To check index status:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** > **Indexes**
4. Look for index on `userId` and `createdAt` fields
5. Status should change from "Building" → "Ready"

---

### 2️⃣ **Existing Budgets Missing userId Field**
Old data created before the `userId` field requirement.

**How to identify:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. **Firestore Database** > **budgets** collection
3. Look for documents without a `userId` field

**How to fix:**

**Option A: Delete old test data** (Easiest)
1. Open Firebase Console
2. Go to **budgets** collection
3. For each budget without `userId`:
   - Click the document
   - Click **Delete** button
4. Refresh your app

**Option B: Run migration function** (Automatic when possible)
```bash
# In browser DevTools console while logged in:
import { migrateOldBudgets } from './src/db/firestore-db.ts'
const result = await migrateOldBudgets(user.uid)
console.log(result)
```

---

### 3️⃣ **Security Rules Not Published**
The rules file was updated but not deployed to Firestore.

**How to fix:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project  → **Firestore Database** → **Rules**
3. Copy content from your project's `FIRESTORE_RULES.txt` file:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ... paste entire rules content ...
  }
}
```
4. Click **Publish** button
5. Wait for "Deployed successfully"
6. Refresh your app

---

### 4️⃣ **Authentication Not Properly Initialized**
App might not be reading user authentication correctly.

**How to check:**
1. Open browser **DevTools** (F12)
2. Go to **Console** tab
3. Look for logs that show:
   ```
   ✅ User authenticated: uid_here
   📡 Setting up Firestore listener for user uid_here...
   ```

If those logs don't appear:
- Your user might not be authenticated
- Try signing out, then signing back in
- Check Console for auth errors (orange/red messages)

---

## 🧪 Step-by-Step Diagnostic Checklist

Run these checks **in order**:

### Check 1: Firebase Console Access
```
✓ Can you access Firebase Console?
✓ Can you see your Firestore database?
✓ Can you see the budgets collection?
```

### Check 2: User Authentication
In Browser DevTools Console:
```javascript
// Check if user is authenticated
const user = auth.currentUser;
console.log('Current user:', user?.uid);
console.log('Auth token:', await user?.getIdToken());
```
**Expected:** Should show a real uid string like `abc123def456...`

### Check 3: Firestore Rules
In Firebase Console → **Firestore Database** → **Rules**:
```
✓ Do you see the rules with userId validation?
✓ Does it say "Deployed successfully" at the top?
✓ Did you see a "Publish" button or is it grayed out?
```

### Check 4: Document Structure
In Firebase Console → **budgets** collection:
```javascript
// For each document you see:
✓ Does it have a 'userId' field?
✓ Does the userId match your auth UID?
✓ Check the difference between documents WITH and WITHOUT userId
```

### Check 5: Firestore Indexes
In Firebase Console → **Firestore Database** → **Indexes**:
```
✓ Is there an index on collection: budgets
✓ Fields: userId (Ascending), createdAt (Descending)
✓ Status: Ready (not "Building" or "Error")
```

---

## 🆘 Emergency Steps

If nothing works:

**Step 1: Force Complete Refresh**
```bash
# In your terminal (in project root)
rm -rf node_modules/.vite  # Clear Vite cache
rm -rf .firebase              # Clear local Firebase cache
pnpm dev                       # Restart dev server
```
Then in browser:
- Press Ctrl+Shift+R (Cmd+Shift+R on Mac) to hard refresh
- Go to DevTools > Application > Storage > Clear All

**Step 2: Temporarily Relax Rules for Testing**
Replace rules with "allow all" to isolate the permission error:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /budgets/{document=**} {
      allow read, write: if true;  // Allow all (TEST ONLY)
    }
  }
}
```
If this works, the problem is the security rules logic, not the data.

**Step 3: Check Browser Console for Detailed Error**
```javascript
// In DevTools > Application > Logs, look for:
// - Red error messages from 'onSnapshot'
// - Error code should include 'permission-denied'
// - Copy the EXACT error message
```

---

## 📋 What to Share With Support

If you need help, gather this info:

1. **Error Message**
   ```
   Copy exact error from Console tab
   ```

2. **Browser Console Logs** (last 20 lines)
   ```
   DevTools > Console > Right-click > Save as
   ```

3. **Firestore Rules**
   ```
   Firebase Console > Firestore > Rules > Copy all text
   ```

4. **Sample Document Structure**
   ```
   Firebase Console > budgets > Click any document > Copy JSON
   ```

5. **Your UID**
   ```javascript
   // Run in Console:
   firebase.auth().currentUser?.uid
   ```

---

## ✅ Verification After Fix

After applying a fix, verify it worked:

```javascript
// Run in Browser DevTools Console while logged in:
const { getAuth } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js');
const { getFirestore, collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js');

const user = getAuth().currentUser;
console.log('✅ Authenticated as:', user?.uid);

// This query should work without permission error
// const q = query(collection(getFirestore(), 'budgets'), where('userId', '==', user.uid));
// const result = await getDocs(q);
// console.log('✅ Query succeeded, found', result.docs.length, 'budgets');
```

Expected output: No red errors, should load budgets successfully.

---

## 📚 Related Documentation

- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Understanding Composite Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Firebase Auth Troubleshooting](https://firebase.google.com/docs/auth/troubleshoot)
- [Firestore Offline Persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline)

---

**Need more help?** Check browser DevTools Console for: `🔒 Permission Denied Error` message with step-by-step guidance.
