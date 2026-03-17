# Data Layer

**Source of Truth:** `src/db/firestore-db.ts` · `src/db/firebase.ts` · `src/types.ts` · `FIRESTORE_RULES.txt`

## Schema

```typescript
// src/types.ts
interface Budget {
  id: string;           // Firestore doc ID (auto-generated)
  userId: string;       // Firebase Auth UID — enforced by security rules
  name: string;
  amount: number;
  frequency: 'Weekly' | 'Monthly' | 'Yearly';
  currency: 'USD' | 'IDR';
  createdAt: number;    // Unix ms — used for client-side sort (newest first)
  excludeWeekends?: boolean;
}
```

**Collection:** `budgets` (flat — no subcollections)

## Offline Persistence

Enabled via `persistentLocalCache()` + `persistentMultipleTabManager()` in `src/db/firebase.ts`. IndexedDB caches all reads; writes queue locally and sync when online. Never disable this — it is critical for mobile UX.

Two metadata flags from the Firestore snapshot:
- `hasPendingWrites` — local write not yet synced to server
- `isFromCache` — data served from IndexedDB (offline)

Both are surfaced in `useFirestoreLiveData` and displayed in `Home.tsx` status indicators.

## Data Access Pattern

**Always go through the hook chain — never call Firestore directly from components:**

```
Component → useBudget() context → useBudgets() hook → useFirestoreLiveData() → firestore-db.ts → firebase.ts
```

## CRUD Functions (`src/db/firestore-db.ts`)

| Function | Description |
|---|---|
| `subscribeTobudgets(userId, onNext, onError)` | Real-time listener — used by `useFirestoreLiveData` |
| `addBudget(budget)` | Returns Firestore doc ID |
| `updateBudget(id, updates)` | Partial update via `Partial<Budget>` |
| `deleteBudget(id)` | Single delete |
| `clearAllBudgets(userId)` | Batch delete — atomic |
| `loadSampleBudgets(userId, currency)` | Batch write sample data |
| `getAllBudgets(userId)` | One-time fetch (used in backup export) |

## Security Rules

Rules live in `FIRESTORE_RULES.txt` and must be deployed to Firebase Console manually. Core invariant: **`userId == request.auth.uid`** on every read/write. Required fields on CREATE: `name` (string), `amount` (number), `frequency` (string), `currency` (string).

## Adding a New Field to Budget

1. Add to `Budget` interface in `src/types.ts`
2. Update `convertFirestoreToBudget()` in `src/db/firestore-db.ts`
3. Update `AddBudgetModal.tsx` form
4. Update `loadSampleBudgets()` sample data
5. Check `migrateOldBudgets()` — add a default value for existing documents missing the field
6. Update Firestore security rules if the field needs validation

## Timestamp Convention

`createdAt` is stored as Unix **milliseconds** (not Firestore `Timestamp`). `convertFirestoreToBudget()` handles the conversion from Firestore server timestamps to ms on read.
