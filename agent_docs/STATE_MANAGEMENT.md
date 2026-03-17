# State Management

**Source of Truth:** `src/context/BudgetContext.tsx` · `src/context/ToastContext.tsx` · `src/App.tsx`

## State Layers

| Layer | Mechanism | Location | Persisted |
|---|---|---|---|
| Auth state | `useState` + Firebase observer | `App.tsx` | Firebase session |
| Budget data | Context + Firestore listener | `BudgetContext.tsx` | Firestore + IndexedDB |
| Toast notifications | Context + `useState` | `ToastContext.tsx` | No |
| UI preferences | `useState` + `localStorage` | `App.tsx` | `localStorage` |
| Active tab | `useState` | `App.tsx` | No |

**No Redux. No Zustand. No external state library.**

## BudgetContext

Wrap components that need budget data in `<BudgetProvider userId={uid}>`. Access via `useBudget()`.

```typescript
// What useBudget() returns
{
  budgets: Budget[]
  loading: boolean
  error: string | null
  hasPendingWrites: boolean   // local write not yet synced
  isFromCache: boolean        // served from IndexedDB
  addBudget(budget): Promise<string>
  updateBudget(id, updates): Promise<void>
  deleteBudget(id): Promise<void>
  clearAllData(): Promise<void>
  loadSampleData(currency): Promise<void>
  refetch(): void
}
```

`BudgetProvider` requires `userId` — it is mounted only after auth succeeds (`App.tsx`). Do not mount it with a null/undefined userId.

## ToastContext

Wrap at root level (already done in `App.tsx`). Access via `useToast()`.

```typescript
const { showToast } = useToast()
showToast('Budget saved', 'success')           // auto-dismiss 3s
showToast('Permission denied', 'error', 5000)  // custom duration ms
showToast('Syncing...', 'info')
```

Toast types: `'success'` | `'error'` | `'info'`

## User Preferences (localStorage)

Stored in `App.tsx`, passed as props down to pages:

| Key | Type | Default |
|---|---|---|
| `currency` | `'USD' \| 'IDR'` | `'USD'` |
| `language` | `'en' \| 'id'` | `'en'` |
| `viewMode` | `'compact' \| 'detailed'` | `'detailed'` |

Preferences are read on mount from `localStorage` and written on change. They are **not** synced to Firestore — they are per-device.

## Provider Order

```tsx
// App.tsx render tree — order matters
<ToastProvider>           // must be outermost (all children can toast)
  <BudgetProvider userId={uid}>
    <Home /> or <Settings />
  </BudgetProvider>
</ToastProvider>
```

`BudgetProvider` is only rendered when `user !== null`. `ToastProvider` is always rendered (Login page needs toasts too).

## Adding New Global State

1. Determine scope: auth-lifetime → `App.tsx` state; budget-related → `BudgetContext`; ephemeral UI → local component state
2. Do not create a new Context unless the state is genuinely global and needed by 3+ unrelated components
3. Preferences that should persist across sessions → `localStorage`, not Firestore
