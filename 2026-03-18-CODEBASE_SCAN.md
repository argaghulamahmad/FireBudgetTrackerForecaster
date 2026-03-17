# 🔍 FireBudgetTrackerForecaster — Architectural Audit
**Date**: 2026-03-18
**Auditor Role**: Principal Frontend Architect
**Scope**: Complete codebase review (3,635 lines of React/TypeScript)
**Status**: 🟡 Growth-stage with critical technical debt

---

## 📋 Executive Summary

**FireBudgetTrackerForecaster** is a React 19 + Firebase/Firestore budget tracking application. The codebase is functionally complete but exhibits significant architectural immaturity:

### 🟢 Strengths
- Modern stack: React 19, Vite, Tailwind v4, TypeScript
- Clean separation: Firebase auth/Firestore in dedicated modules
- Type-safe component props (partial)
- Thoughtful offline-first design (IndexedDB persistence)
- Internationalization support (en/id)

### 🔴 Critical Issues
1. **AuthContext defined but never provided** — `useAuth()` hook is dead code
2. **No TypeScript strict mode** — null safety not enforced
3. **Deprecated Firestore APIs** — runtime warnings on Firebase v12+
4. **Dead duplicate hook** — `useBudgets-firestore.ts` mirrors `useBudgets.ts`
5. **No tests** — zero coverage across 3,635 lines

### 🟠 High-Impact Debt
- **Prop drilling**: Home → BudgetCard chain passes 5+ props
- **Loose translation typing**: `Record<string, string>` catches zero typos
- **Unused packages**: dexie, express, @google/genai, motion inflate bundle
- **Unimplemented features**: Settings export/import are UI stubs

### 🟡 Medium Risk
- `refetch()` function is a no-op
- `isDeleting` state set but never read
- Hard page reloads for error recovery
- Misuse of `console.warn` for info logs

---

## 📁 Project Structure Map

```
FireBudgetTrackerForecaster/
├── docs/
│   ├── FIREBASE_AUTH_*.md (5 setup guides)
│   ├── FIREBASE_SETUP.md
│   ├── MIGRATION_GUIDE.md
│   ├── PERMISSION_DENIED_FIX_*.md
│   └── README.md
│
├── src/
│   ├── main.tsx (10 lines)
│   │   └─ Mounts <App /> in React 19 strict mode
│   │
│   ├── App.tsx (194 lines) ⭐ **Root component — all global state lives here**
│   │   ├─ useState: user, authLoading, activeTab, isAddBudgetOpen, budgetToEdit
│   │   ├─ useState: currency, language, viewMode (persisted to localStorage)
│   │   ├─ useEffect: initAuthObserver() — listens for Firebase auth changes
│   │   ├─ useBudgets(user?.uid) — real-time Firestore listener
│   │   └─ Routes (JSX inline): Login | Home | Settings | AddBudgetModal
│   │
│   ├── types.ts (10 lines)
│   │   └─ Budget interface (id, userId, name, amount, frequency, currency, createdAt, excludeWeekends?)
│   │
│   ├── index.css (7 lines)
│   │   └─ Tailwind v4 import, Inter font
│   │
│   ├── components/ (625 lines total)
│   │   ├─ AddBudgetModal.tsx (169 lines) — form for add/edit, modal wrapper
│   │   ├─ BottomNav.tsx (37 lines) — tab switcher (Home|Settings)
│   │   ├─ BudgetCard.tsx (141 lines) — displays single budget with delete/edit buttons
│   │   ├─ ConfirmModal.tsx (77 lines) — reusable confirmation dialog
│   │   ├─ SearchableSelect.tsx (105 lines) — dropdown for frequency selection
│   │   └─ SummaryCard.tsx (96 lines) — total balance, categories count
│   │
│   ├── db/ (613 lines total) **Firebase/Firestore layer**
│   │   ├─ firebase.ts (131 lines) **Firebase SDK init**
│   │   │   ├─ initializeApp()
│   │   │   ├─ initializeFirestore() with custom config
│   │   │   ├─ initializeOfflinePersistence() — tries multi-tab, falls back to single-tab
│   │   │   ├─ setupFirestoreEmulator() (unused)
│   │   │   └─ ⚠️ Uses deprecated: enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence
│   │   │
│   │   ├─ firestore-db.ts (472 lines) **All CRUD operations**
│   │   │   ├─ READ: getAllBudgets(), subscribeTobudgets() ⚠️ subscribeTobudgets() is dead (unused)
│   │   │   ├─ WRITE: addBudget(), updateBudget(), deleteBudget()
│   │   │   ├─ BATCH: clearAllBudgets(), loadSampleBudgets()
│   │   │   ├─ UTILITY: migrateOldBudgets() (never called from UI)
│   │   │   ├─ HELPER: convertFirestoreToBudget()
│   │   │   └─ FirestoreBudget interface, BudgetListener type
│   │   │
│   │   └─ db.ts (10 lines) 🚨 **DEAD CODE**
│   │       └─ Dexie IndexedDB schema (replaced by Firestore persistence)
│   │
│   ├── hooks/ (607 lines total) **Custom React hooks**
│   │   ├─ useAuth.ts (76 lines) 🚨 **BROKEN: AuthContext defined but no <AuthProvider>**
│   │   │   ├─ AuthContext created but never provided
│   │   │   ├─ useAuth() hook would throw "must be used within AuthProvider"
│   │   │   └─ Actual auth state managed in App.tsx instead
│   │   │
│   │   ├─ useBudgets.ts (183 lines) ✅ **ACTIVE — the real hook**
│   │   │   └─ Wraps useFirestoreLiveData() + Firestore CRUD operations
│   │   │
│   │   ├─ useBudgets-firestore.ts (121 lines) 🚨 **DEAD DUPLICATE**
│   │   │   └─ Near-identical to useBudgets.ts but missing userId parameter
│   │   │
│   │   └─ useFirestoreLiveData.ts (227 lines) **Core Firestore subscription**
│   │       ├─ useState: data[], loading, error, hasPendingWrites, isFromCache
│   │       ├─ useEffect: initializeOfflinePersistence() on mount
│   │       ├─ useEffect: onSnapshot listener with userId filter
│   │       ├─ Error handling: permission-denied, unavailable
│   │       ├─ refetch callback (⚠️ no-op — just sets loading=true)
│   │       └─ Metadata tracking: snapshot.metadata.fromCache, hasPendingWrites
│   │
│   ├── pages/ (855 lines total) **Top-level routes**
│   │   ├─ Login.tsx (224 lines) **Authentication UI**
│   │   │   ├─ useState: mode (signin|signup), email, password, confirmPassword, error, isLoading
│   │   │   ├─ signIn(), signUp(), signInWithGoogle() from authActions.ts
│   │   │   ├─ Inline JSX for form, no extracted sub-components
│   │   │   └─ Props: t (translation object)
│   │   │
│   │   ├─ Home.tsx (357 lines) **Budget list & summary**
│   │   │   ├─ Props received from App: budgets[], loading, error, hasPendingWrites, isFromCache,
│   │   │   │  currency, t, viewMode, onViewModeChange, onAddBudgetClick, onEditBudget,
│   │   │   │  onDeleteBudget, onLoadSampleData
│   │   │   │  (⚠️ **12 props — heavy prop drilling**)
│   │   │   ├─ useState: budgetToDelete, sortBy, showSortMenu, dismissedError, isDeleting
│   │   │   ├─ Components used: <SummaryCard>, <BudgetCard>, <ConfirmModal>
│   │   │   ├─ Permission error handling: special "Waiting for Firestore" message
│   │   │   └─ Features: sort by name/amount/urgency, switch view mode, delete confirmation
│   │   │
│   │   └─ Settings.tsx (274 lines) **User preferences & data**
│   │       ├─ Props: currency, language, viewMode, user, t, callbacks (5 onChange + 2 data ops)
│   │       ├─ useState: 4 modal visibility flags, importFile, isSigningOut
│   │       ├─ Features: change currency/language/viewMode, load sample data, clear all data,
│   │       │  sign out, export/import budgets (⚠️ stubs — `alert("coming soon")`)
│   │       └─ Components: 4× <ConfirmModal>, file input
│   │
│   ├── services/ (511 lines total) **Firebase Auth service layer**
│   │   ├─ auth.ts (193 lines) **Firebase Auth observer**
│   │   │   ├─ initAuthObserver() — global module-level onAuthStateChanged listener
│   │   │   ├─ cleanupAuthObserver() — unsubscribe function
│   │   │   └─ Singleton pattern: listener stored in module scope
│   │   │
│   │   └─ authActions.ts (318 lines) **Firebase Auth operations**
│   │       ├─ signIn(email, password) — Email/password authentication
│   │       ├─ signUp(email, password) — Create account + custom claims
│   │       ├─ signOut() — Unsubscribe listener + sign out
│   │       ├─ signInWithGoogle() — OAuth redirect flow
│   │       ├─ ⚠️ Unused exports: setCustomClaims, resetPassword (not called from UI)
│   │       └─ Error handling: Firebase-specific error codes + user-friendly messages
│   │
│   └── utils/ (420 lines total) **Utility functions & constants**
│       ├─ cn.ts (6 lines) — clsx + tailwind-merge for class composition
│       ├─ currency.ts (56 lines) — Currency type, formatCurrency(), parseCurrency()
│       ├─ i18n.ts (157 lines) — Language type, translations objects (en/id), 50+ keys
│       │   ⚠️ Typed as Record<string, string> everywhere — no key validation
│       ├─ logging.ts (57 lines) — logAuthAction(), logAppEvent(), logError()
│       │   (defined but unused in current codebase)
│       └─ time.ts (95 lines) — getTimeMetrics(), getDailyAllowance() for budget calculations
│
├── vite.config.ts — Vite config + React plugin, port 3000
├── tsconfig.json — ⚠️ strict mode NOT enabled
├── eslint.config.js — ESLint flat config, React rules
├── package.json — pnpm workspaces
├── .env — Firebase keys + Gemini API key (gitignored)
└── .env.example — template
```

---

## 🛠 Complete Tech Stack

| Layer | Tech | Version | Notes |
|---|---|---|---|
| **Runtime** | React | `^19.0.0` | Latest, with Strict Mode in main.tsx |
| | TypeScript | `~5.8.2` | Without strict mode enabled 🟠 |
| | react-dom | `^19.0.0` | Browser rendering |
| **Build** | Vite | `^6.2.0` | Dev server on :3000, ESM |
| | @vitejs/plugin-react | `^5.0.4` | JSX compilation |
| **Styling** | Tailwind CSS | `^4.1.14` | v4 (uses @import, no config file) |
| | @tailwindcss/vite | `^4.1.14` | Vite integration |
| | tailwind-merge | `^3.5.0` | Class name merging |
| | clsx | `^2.1.1` | Class name utilities |
| **Backend** | Firebase | `^12.10.0` | Auth + Firestore |
| | (persistence) | Built-in | IndexedDB via deprecated APIs 🟠 |
| **UI** | lucide-react | `^0.546.0` | 50+ icons |
| **AI** 🚨 | @google/genai | `^1.29.0` | **UNUSED** — installed but never imported |
| **Legacy** 🚨 | dexie | `^4.3.0` | **DEAD** — replaced by Firestore |
| | dexie-react-hooks | `^4.2.0` | **DEAD** — same |
| **Animation** 🚨 | motion | `^12.23.24` | **UNUSED** — installed, not imported |
| **Server** 🚨 | express | `^4.21.2` | **UNUSED** — no server.js file |
| | dotenv | `^17.2.3` | **UNUSED** — Vite uses env files |
| **Dev** | ESLint | `^9.39.4` | Flat config |
| | typescript-eslint | `^8.57.1` | TS rules |
| | eslint-plugin-react | `^7.37.5` | React rules |
| | eslint-plugin-react-hooks | `^7.0.1` | Hook rules |
| **Testing** | (none) | — | **Zero test coverage** 🚨 |

### Bundle Impact of Dead Packages
```
dexie: ~120 KB (minified)
dexie-react-hooks: ~5 KB
express: ~50 KB
@google/genai: ~30 KB
motion: ~45 KB
─────────────────
Total: ~250 KB of unnecessary bundle weight
```

---

## 🔗 Component Relationship Map

```mermaid
graph TD
    A["App.tsx<br/>(root, global state)"]
    A -->|user, authLoading| B["[Auth Gate]"]
    B -->|false| C["Login.tsx"]
    B -->|true| D["Tabs Router"]

    D -->|activeTab=home| E["Home.tsx<br/>(12 props!)"]
    D -->|activeTab=settings| F["Settings.tsx<br/>(10+ props)"]

    A -->|currency, t, viewMode,<br/>onViewModeChange,<br/>onLoadSampleData| G["BottomNav.tsx"]

    E -->|budgets, currency, t,<br/>viewMode| H["SummaryCard.tsx"]
    E -->|budget, currency, t,<br/>onDelete, onEdit, viewMode| I["BudgetCard.tsx<br/>(map: ×N)"]
    E -->|isOpen, currency, t,<br/>onClose, onAdd, onEdit,<br/>initialData| J["AddBudgetModal.tsx"]

    J -->|options, selectedValue,<br/>onSelect, placeholder| K["SearchableSelect.tsx"]

    E -->|isOpen, title, message,<br/>confirmText, onConfirm,<br/>onCancel| L["ConfirmModal.tsx"]

    F -->|isOpen, ... (×4 instances)| L

    A -->|budgets via useBudgets| M["useFirestoreLiveData"]
    M -->|userId filter| N["Firestore onSnapshot"]
    N -->|real-time updates| M
    N -->|cached data| O["IndexedDB<br/>(deprecated API)"]

    A -->|callbacks| P["useBudgets"]
    P -->|addBudget, updateBudget,<br/>deleteBudget, clearAllBudgets,<br/>loadSampleBudgets| Q["firestore-db.ts<br/>(CRUD layer)"]
    Q -->|Firestore SDK| N

    A -->|initAuthObserver| R["services/auth.ts<br/>(module-level singleton)"]
    R -->|Firebase Auth| S["onAuthStateChanged"]
    S -->|user state| A

    C -->|signIn, signUp,<br/>signInWithGoogle| T["services/authActions.ts"]
    T -->|Firebase Auth| S
```

### Prop Drilling Analysis

| Component | Props | Concern |
|---|---|---|
| `Home.tsx` | 12 | **Very heavy** — 6 callbacks + data + 5 UI flags |
| `Settings.tsx` | 10+ | **Very heavy** — similar pattern |
| `AddBudgetModal.tsx` | 6 | **High** — form wrapper with multiple handlers |
| `BudgetCard.tsx` | 6 | **High** — repeated for each item |
| `SummaryCard.tsx` | 4 | OK |
| `BottomNav.tsx` | 3 | OK |
| `SearchableSelect.tsx` | 4 | OK |
| `ConfirmModal.tsx` | 5 | OK (reused multiple times) |

**Impact**: Refactoring to pass `budgets`, `error`, `isLoading` via Context would eliminate ~8–10 props per page.

---

## 📊 State & Data Management Audit

### Data Lifecycle

```
1. APP INITIALIZATION
   └─ App.tsx mounts
      ├─ useEffect: initAuthObserver() (module-level, listens forever)
      └─ useEffect: useBudgets(user?.uid)
         ├─ useFirestoreLiveData(userId, initialize=true)
            ├─ useEffect: initializeOfflinePersistence() ← sets up IndexedDB
            └─ useEffect: onSnapshot(userId filter) ← subscribes to real-time updates

2. REAL-TIME UPDATES
   └─ Firestore onSnapshot fires
      ├─ Metadata: hasPendingWrites (local changes pending server)
      ├─ Metadata: fromCache (using offline data)
      └─ setData(budgets) in useFirestoreLiveData
         └─ propagates up to App → Home → BudgetCard (via props)

3. USER ACTION (add/edit/delete)
   └─ Home.tsx: onDeleteBudget(id) callback
      └─ App.tsx: deleteBudget(id)
         └─ firestore-db.ts: deleteDoc()
            └─ Firestore SDK
               ├─ Write locally to IndexedDB (hasPendingWrites=true)
               ├─ Sync to server over network
               └─ onSnapshot fires again with updated data

4. OFFLINE SCENARIO
   └─ Network disconnects
      └─ onSnapshot returns fromCache=true
      └─ Local writes queue in IndexedDB
      └─ UI shows "Using offline data" + "Syncing..." badges
      └─ Network reconnects
         └─ Firebase SDK syncs queued writes
         └─ onSnapshot fires with server data

5. ERROR SCENARIO (Permission Denied)
   └─ onSnapshot fires with error
      └─ useFirestoreLiveData catches permission-denied
         ├─ setError(new Error("Permission Denied..."))
         └─ Home.tsx shows red alert with "Waiting for Firestore" + retry button
      └─ "Retry Now" → window.location.reload() (hard refresh)
```

### State Tree

```
App.tsx (8 useState + 1 useBudgets)
├─ user: User | null
├─ authLoading: boolean
├─ activeTab: 'home' | 'settings'
├─ isAddBudgetOpen: boolean
├─ budgetToEdit: Budget | null
├─ currency: Currency (persisted to localStorage)
├─ language: Language (persisted to localStorage)
├─ viewMode: 'compact' | 'detailed' (persisted to localStorage)
└─ useBudgets(user?.uid)
   └─ useFirestoreLiveData(userId, initialize=true)
      ├─ data: Budget[]
      ├─ loading: boolean
      ├─ error: Error | null
      ├─ hasPendingWrites: boolean
      ├─ isFromCache: boolean
      └─ refetch: () => void (no-op!)

Local component state (not listed above):
├─ Home.tsx: budgetToDelete, sortBy, showSortMenu, dismissedError, isDeleting
├─ Login.tsx: mode, email, password, confirmPassword, error, isLoading
├─ Settings.tsx: isClearModalOpen, isLoadSampleModalOpen, isSignOutModalOpen, importFile, isSigningOut
├─ AddBudgetModal.tsx: name, displayAmount, frequency, excludeWeekends, isSubmitting
├─ SearchableSelect.tsx: isOpen, searchTerm
└─ ConfirmModal.tsx: isLoading
```

### State Anti-Patterns Found

| Issue | Location | Severity | Impact |
|---|---|---|---|---|
| **No Context for shared state** | App.tsx (budget data) | 🔴 | Props drill through 2–3 component levels (Home, Settings, cards) |
| **AuthContext defined, not used** | hooks/useAuth.ts | 🔴 | Dead hook; auth state is ad-hoc in App.tsx |
| **`refetch` is a no-op** | useFirestoreLiveData.ts:213 | 🔴 | Calling it causes infinite loading; should reset the listener |
| **`isDeleting` set, never read** | Home.tsx:42, 348 | 🟠 | Delete button has no loading indicator during deletion |
| **Loose `t` typing** | Every component | 🟠 | `Record<string, string>` catches zero typos in translation keys |
| **State syncing via useEffect** | None detected ✅ | — | Good: no props-to-state anti-pattern |
| **Inline object/function creation** | App.tsx, Home.tsx | 🟠 | Props are stable (good), but `getTimeMetrics()` called in sort comparator every render |
| **No error boundary** | App.tsx | 🟡 | Uncaught error would crash entire app |

---

## 🚨 Critical Technical Debt Log

### 🔴 CRITICAL (Fix Immediately)

#### 1. **AuthContext Defined But Never Provided**
- **File**: `src/hooks/useAuth.ts`
- **Issue**: `createContext(AuthContextType)` + `useAuth()` hook, but no `<AuthProvider>` wrapping the app
- **Current State**: Calling `useAuth()` anywhere throws "must be used within an AuthProvider"
- **Impact**:
  - Hook is unusable dead code
  - Auth state scattered across App.tsx instead of centralized
  - Creates confusion for future devs
- **Fix**: Either (a) delete `useAuth.ts` and manage auth in App.tsx, OR (b) create `<AuthProvider>` and wire it up in main.tsx
- **Effort**: 1 hour

#### 2. **No TypeScript Strict Mode**
- **File**: `tsconfig.json`
- **Issue**: `"strict": true` not set; null checks, implicit any, etc. not enforced
- **Current State**: `currency: Currency`, `user: User | null` could be `any` without error
- **Impact**:
  - Null pointer exceptions at runtime
  - Drift in type safety across codebase
  - Harder onboarding for typed-minded devs
- **Fix**: Add `"strict": true` to tsconfig; fix resulting errors (expect ~30–50 error lines)
- **Effort**: 2–3 hours

#### 3. **Deprecated Firestore Persistence APIs**
- **File**: `src/db/firebase.ts` lines 69, 79
- **APIs**: `enableMultiTabIndexedDbPersistence()`, `enableIndexedDbPersistence()`
- **Issue**: Marked as deprecated in Firebase SDK v9+; on v12.10.0 runtime warnings emitted
- **Current State**: Fallback logic works but emits console warnings
- **Impact**:
  - Runtime warnings in console (confusing for users)
  - May break in future Firebase versions
  - Firebase promotes `persistentLocalCache()` instead
- **Fix**: Migrate to `persistentLocalCache()` with fallback strategy
- **Effort**: 2 hours

#### 4. **Duplicate Hook: `useBudgets-firestore.ts`**
- **File**: `src/hooks/useBudgets-firestore.ts` (121 lines)
- **Issue**: Near-identical copy of `useBudgets.ts` but missing the `userId` parameter
- **Current State**: Not imported anywhere; App.tsx uses `useBudgets.ts` (correct one)
- **Impact**:
  - Confuses future developers
  - Dead code cluttering repo
  - If someone accidentally imports it, will fail at runtime (userId undefined)
- **Fix**: Delete `useBudgets-firestore.ts`; keep `useBudgets.ts`
- **Effort**: 5 minutes

---

### 🟠 HIGH (Fix in Next Sprint)

#### 5. **`refetch()` Function is a No-Op**
- **File**: `src/hooks/useFirestoreLiveData.ts` lines 212–216
- **Code**:
  ```typescript
  const refetch = useCallback(async () => {
    setLoading(true);
    // Comment: "The effect will automatically refetch since dependencies haven't changed"
  }, []);
  ```
- **Issue**: Sets `loading=true` but does nothing else; effect won't re-run because `userId` dependency hasn't changed
- **Current State**: Function exported in public API but unused; if called, shows infinite loading spinner
- **Impact**:
  - Manual retry is broken
  - Misleading API surface (why export a no-op?)
  - "Retry Now" button on error should call this, but it calls `window.location.reload()` instead
- **Fix**: Either (a) remove `refetch`, OR (b) implement it: unsubscribe + resubscribe to Firestore listener
- **Effort**: 1 hour

#### 6. **Loose Translation Key Typing**
- **File**: All component prop files (HomeProps, SettingsProps, etc.)
- **Issue**: `t: Record<string, string>` everywhere; no validation of key names
- **Current State**: `t.syncing`, `t.offline`, `t.editBudget` are used; `i18n.ts` has ~50 keys but no TypeScript interface
- **Example Typo**: If code calls `t.editBudgets` (plural) instead of `t.editBudget`, renders nothing silently
- **Impact**:
  - Translation key typos hidden until QA or user testing
  - No IDE autocomplete for valid keys
  - Maintenance burden (hard to refactor key names)
- **Fix**: Create a `TranslationKeys` type interface with all ~50 keys; use `t: Record<TranslationKeys, string>`
- **Effort**: 1–2 hours (one-time, then catches errors forever)

#### 7. **Dead Package Dependencies**
- **File**: `package.json`
- **Packages**: `dexie`, `dexie-react-hooks`, `@google/genai`, `express`, `motion`
- **Issue**: Installed but zero imports anywhere in `src/`
- **Current State**: All packages in node_modules; included in bundled output
- **Impact**: ~250 KB bundle bloat
- **Fix**: `npm uninstall dexie dexie-react-hooks @google/genai express motion dotenv`
- **Effort**: 5 minutes

#### 8. **Unimplemented Export/Import Features**
- **File**: `src/pages/Settings.tsx` lines 156–189, 245–267
- **Code**: `handleExport()` and `handleImport()` call `alert("Export functionality coming soon")`
- **Issue**: UI exists, functionality is stubs
- **Current State**: Users see "Export" / "Import" buttons but they don't work
- **Impact**:
  - Broken UI experience
  - Maintenance burden (document or remove)
- **Fix**: Either (a) implement export/import (download JSON, upload, parse, batch write), OR (b) remove UI buttons and delete code
- **Effort**: 4–6 hours (if implementing) or 20 minutes (if removing)

#### 9. **`isDeleting` State Set But Never Read**
- **File**: `src/pages/Home.tsx` lines 42, 348–349
- **Code**:
  ```typescript
  const [isDeleting, setIsDeleting] = useState(false);
  // later...
  setIsDeleting(true);
  await onDeleteBudget(budgetToDelete);
  ```
- **Issue**: State is toggled but never read; delete button has no loading indicator
- **Current State**: Button is unresponsive-looking during delete
- **Impact**: UX issue; users don't know action is pending
- **Fix**: Use `isDeleting` in button className: `disabled={isDeleting}` + show spinner
- **Effort**: 15 minutes

---

### 🟡 MEDIUM (Fix in Current or Next Sprint)

#### 10. **Heavy Prop Drilling**
- **File**: `src/App.tsx` → `src/pages/Home.tsx` (12 props)
- **Issue**: Home receives `budgets`, `loading`, `error`, `hasPendingWrites`, `isFromCache`, `currency`, `t`, `viewMode`, + 4 callbacks
- **Impact**: Hard to refactor; future component additions bloat prop list further
- **Fix**: Create `BudgetContext` (via useContext) to pass `{ budgets, loading, error, metadata }` down; keep callbacks as props
- **Effort**: 2–3 hours

#### 11. **Hard Page Reload for Error Recovery**
- **File**: `src/pages/Home.tsx` line 51–53
- **Code**: `handleRetry() { window.location.reload(); }`
- **Issue**: Blunt approach; discards all React state and re-initializes the entire app
- **Impact**:
  - User loses any transient UI state (e.g., sort order, view mode)
  - Poor UX for a simple permission error
- **Fix**: Call `refetch()` instead (once fixed); or manually re-subscribe to Firestore listener
- **Effort**: 30 minutes

#### 12. **`console.warn` Misused for Info Logs**
- **File**: `firebase.ts`, `useFirestoreLiveData.ts`, `firestore-db.ts`, `auth.ts` (10+ occurrences)
- **Examples**:
  ```typescript
  console.warn('✅ Multi-tab IndexedDB persistence enabled');
  console.warn(`📈 Budgets updated (pending: ${hasPendingWrites}, cache: ${isFromCache})`);
  ```
- **Issue**: `console.warn` is for warnings; these are informational
- **Impact**:
  - Console becomes noisy (yellow warnings for normal operation)
  - Obscures actual warnings
  - ESLint rule only allows `.warn` and `.error` (bans `.log`)
- **Fix**: Create a `logger.ts` with `log()`, `warn()`, `error()` that respects ESLint rules; update all sites
- **Effort**: 1–2 hours

#### 13. **No React Error Boundary**
- **File**: App.tsx
- **Issue**: No `<ErrorBoundary>` wrapper around child components
- **Impact**: Unhandled error in any component (e.g., BudgetCard) crashes entire app silently
- **Fix**: Add `<ErrorBoundary>` wrapper; implement fallback UI with error details + retry
- **Effort**: 2 hours

---

### 🟢 LOW (Nice-to-Have)

#### 14. **Missing Test Framework**
- **File**: Project root
- **Issue**: Zero tests; no Jest, Vitest, or similar configured
- **Impact**: No safety net for refactoring; regressions go undetected
- **Fix**: Add Vitest + React Testing Library; write smoke tests for key flows
- **Effort**: 4–6 hours (setup + initial test suite)

#### 15. **`experimentalForceLongPolling: false`**
- **File**: `src/db/firebase.ts` line 48
- **Issue**: Explicitly set to `false`, making it a no-op; left over from copy-paste
- **Fix**: Remove the line (defaults to `false`)
- **Effort**: 1 minute

#### 16. **No Documentation of Auth Flow**
- **File**: src/services/auth.ts, authActions.ts (docs exist in docs/)
- **Issue**: Complex auth observer pattern (module-level singleton) not documented inline
- **Fix**: Add JSDoc comments explaining the singleton pattern, why it's needed, and edge cases
- **Effort**: 30 minutes

#### 17. **Missing Return Type Annotations**
- **File**: Several hooks and utils
- **Example**: `getTimeMetrics()` in `src/utils/time.ts` returns an object but has no explicit return type
- **Fix**: Add explicit `return: TypeName` to all exported functions
- **Effort**: 1 hour

---

## 📈 Performance & Security Review

### Performance

| Aspect | Current State | Assessment |
|---|---|---|
| **Bundle Size** | ~250 KB dead package weight | 🔴 Bloated; remove unused deps |
| **Code Splitting** | No lazy loading of pages | 🟡 Monolithic bundle; consider React.lazy for Settings/Login |
| **Component Re-renders** | No memoization used | 🟡 App-wide re-renders on state change; BudgetCard rememo candidate |
| **Firestore Listener** | onSnapshot for every userId | 🟢 Efficient; leverages real-time subscriptions |
| **IndexedDB Persistence** | Using deprecated APIs | 🟠 Works but will break in future Firebase versions |
| **Font Loading** | Google Fonts (Inter) | 🟢 Async loaded, no render blocking |
| **Tailwind CSS** | v4 with @import | 🟢 Modern approach, no runtime overhead |

### Security

| Vector | Current State | Assessment |
|---|---|---|
| **Firebase Auth** | Email/password + Google OAuth | 🟢 Best practices: password hashed server-side, OAuth via Firebase |
| **Firestore Security Rules** | Must be set up manually | 🟡 Rules provided in docs, but user must publish manually |
| **User Data Isolation** | `userId` field on all documents | 🟢 Security rules enforce: `request.auth.uid == resource.data.userId` |
| **XSS Prevention** | React sanitizes props natively | 🟢 No user HTML input; no innerHTML used |
| **CSRF** | Firebase handles via tokens | 🟢 No custom forms; Firebase Auth SDKs manage tokens |
| **API Key Exposure** | Firebase keys in .env | 🟢 Firebase keys are public (API keys are scoped to web domain) |
| **Secrets** | Gemini API key in .env | 🟠 Should use server-side proxy or service account (never expose client-side) |
| **Input Validation** | Budget amount parsed as number | 🟡 Should validate min/max, currency, frequency enums |

### Performance Optimizations

1. **Code splitting**: Lazy-load Settings and Login pages with React.lazy
2. **Remove dead packages**: Save ~250 KB
3. **Memoize components**: Wrap BudgetCard, SummaryCard with memo (prevent child re-renders)
4. **Logger singleton**: Create once, import everywhere (vs. strings throughout code)
5. **Migrate Firestore APIs**: `persistentLocalCache()` replaces deprecated methods
6. **Add Error Boundary**: Prevent full-app crashes

---

## 🛣 Recommended Refactoring Roadmap

### Phase 1: Critical Fixes (1–2 days) 🔴
**Goal**: Stabilize codebase, fix blockers

1. **Fix TypeScript Strict Mode** (2 hrs)
   - Enable `strict: true` in tsconfig.json
   - Fix null-check errors

2. **Delete Dead Hook Duplicate** (5 min)
   - Remove `src/hooks/useBudgets-firestore.ts`

3. **Wire Up AuthContext OR Delete It** (1 hr)
   - Option A: Create `<AuthProvider>` in main.tsx, move auth state to context
   - Option B: Delete `src/hooks/useAuth.ts`, document that auth is in App.tsx

4. **Implement `refetch()` Function** (1 hr)
   - Make it actually unsubscribe/resubscribe to Firestore
   - Update error handler to call `refetch()` instead of `location.reload()`

5. **Remove Dead Package Dependencies** (5 min)
   - `npm uninstall dexie dexie-react-hooks @google/genai express motion dotenv`

### Phase 2: High-Impact Improvements (2–3 days) 🟠
**Goal**: Better maintainability, UX polish

6. **Migrate Firestore Persistence APIs** (2 hrs)
   - Replace deprecated `enableMultiTabIndexedDbPersistence()` with `persistentLocalCache()`
   - Update error handling

7. **Add Translation Key Type Safety** (1.5 hrs)
   - Create `TranslationKeys` type from `i18n.ts` keys
   - Update all component props to use typed `Record<TranslationKeys, string>`
   - Test in IDE autocomplete

8. **Fix Delete Loading State** (30 min)
   - Read `isDeleting` in button: `disabled={isDeleting}`
   - Show spinner during deletion

9. **Add Context for Shared State** (3 hrs)
   - Create `BudgetContext` for `{ budgets, loading, error, metadata }`
   - Wrap `<App>` in `<BudgetProvider>`
   - Refactor Home, Settings, BudgetCard to use `useBudget()` hook
   - Simplify prop drilling

10. **Create Logger Utility** (1.5 hrs)
    - Replace all `console.warn()` with `logger.info()`
    - Separate concerns

### Phase 3: Future-Proofing (2–3 days) 🟡
**Goal**: Scalability, testing, documentation

11. **Add React Error Boundary** (1.5 hrs)
    - Wrap App tree; catch and display errors gracefully

12. **Add Component Memoization** (1 hr)
    - Wrap BudgetCard, SummaryCard with `React.memo()`
    - Prevent unnecessary re-renders

13. **Implement Export/Import** (4–6 hrs)
    - Or remove UI buttons if deprioritized

14. **Add Test Suite** (4–6 hrs)
    - Vitest + React Testing Library
    - Smoke tests for: login, add budget, delete budget, auth state

15. **Document Auth Flow** (30 min)
    - Add JSDoc to services/auth.ts explaining singleton pattern

### Timeline Estimate
- **Critical** (Phase 1): 1–2 days ← **Do ASAP**
- **High-Impact** (Phase 2): 2–3 days
- **Future-Proofing** (Phase 3): 2–3 days (spread over sprints)
- **Total**: ~5–8 days to fully address all debt

---

## 📝 Summary Table

| Category | Finding | Severity | Effort | Impact |
|---|---|---|---|---|
| **Architecture** | No global state Context | 🟠 | 3 hrs | Props: 12 → 4 at Home level |
| **Code Quality** | Dead hook duplicate | 🔴 | 5 min | Clean up confusion |
| **Type Safety** | Strict mode off | 🔴 | 2 hrs | Catch nulls at compile time |
| **Deprecated APIs** | Firestore persistence | 🔴 | 2 hrs | Remove console warnings |
| **Bundle** | 250 KB dead packages | 🟠 | 5 min | Reduce size by ~7% |
| **UX** | Delete has no loading state | 🟠 | 30 min | Better feedback |
| **DX** | Translation keys not typed | 🟠 | 1.5 hrs | IDE autocomplete + catch typos |
| **Testing** | Zero test coverage | 🟡 | 4–6 hrs | Safety net for refactoring |
| **Docs** | Auth flow undocumented | 🟡 | 30 min | Onboarding clarity |

---

## ✅ Next Steps

1. **This week**: Fix critical items (Phases 1.1–1.5)
2. **Next week**: High-impact improvements (Phase 2.6–2.10)
3. **Backlog**: Future-proofing (Phase 3.11–3.15)

**For questions or clarifications**, see the full documentation in `docs/` folder.
