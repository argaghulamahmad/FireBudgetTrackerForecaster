# Localization & Default Settings

## Overview

All UI-related preferences are persisted to localStorage **ONLY** (not synced to Firestore). These are device-scoped settings specific to each user's local environment.

---

## Default Settings

### Language
- **Default:** `'en'` (English)
- **Supported:** `'en'` (English), `'id'` (Bahasa Indonesia)
- **Key:** `budget_language`
- **Location:** Managed in `src/App.tsx`

### Currency
- **Default:** `'IDR'` (Indonesian Rupiah)
- **Supported:** `'USD'` (US Dollar), `'IDR'` (Indonesian Rupiah)
- **Formatting:**
  - **IDR:** `Rp 10.000` (thousands separator = `.`, decimal separator = `,`, no decimal places)
  - **USD:** `$10,000.00` (thousands separator = `,`, decimal separator = `.`)
- **Key:** `budget_currency`
- **Location:** Managed in `src/App.tsx`
- **Utility:** `src/utils/currency.ts` → `formatCurrency()`, `formatCurrencyInput()`, `getCurrencySymbol()`

### View Mode
- **Default:** `'detailed'`
- **Supported:** `'compact'` (minimal info), `'detailed'` (full details)
- **Key:** `budget_view_mode`
- **Location:** Managed in `src/App.tsx` via `PreferencesContext`

### Sort Order (Field)
- **Default:** `'name'`
- **Supported:** `'name'`, `'amount'`, `'urgency'`
- **Key:** `budget_sort_field`
- **Location:** Managed in `src/pages/Home.tsx`
- **Usage:** Click sort menu in home page to change

### Sort Direction
- **Default:** `'asc'` (ascending)
- **Supported:** `'asc'`, `'desc'`
- **Key:** `budget_sort_dir`
- **Location:** Managed in `src/pages/Home.tsx`

### Grouping (Group by Status)
- **Default:** `false` (no grouping)
- **Supported:** `true` (group by deficit/onTrack), `false` (show all)
- **Key:** `budget_group_by_status`
- **Location:** Managed in `src/pages/Home.tsx`
- **Behavior:** When `true`, budgets are grouped into:
  - **Deficit:** spending exceeds budget (negative variance)
  - **On Track:** within budget (positive or null variance)

---

## localStorage Keys Reference

| Key | Type | Default | Scope |
|---|---|---|---|
| `budget_currency` | `'USD' \| 'IDR'` | `'IDR'` | App-level (PreferencesContext) |
| `budget_language` | `'en' \| 'id'` | `'en'` | App-level (App.tsx) |
| `budget_view_mode` | `'compact' \| 'detailed'` | `'detailed'` | App-level (PreferencesContext) |
| `budget_sort_field` | `'name' \| 'amount' \| 'urgency'` | `'name'` | Home page only |
| `budget_sort_dir` | `'asc' \| 'desc'` | `'asc'` | Home page only |
| `budget_group_by_status` | `'true' \| 'false'` | `'false'` | Home page only |

---

## Implementation Details

### Initialization Strategy

1. **App-level preferences** (App.tsx):
   - On mount, attempt to load from localStorage
   - If missing or invalid, use default and persist it
   - Ensures consistent defaults across all sessions

2. **Home-level preferences** (Home.tsx):
   - Sort field & direction initialize from localStorage with defaults
   - Grouping initializes from localStorage with default `false`
   - Any change auto-persists via `useEffect` hooks

### TypeScript Safety

All localStorage keys are explicitly typed:
- `Currency = 'USD' | 'IDR'`
- `Language = 'en' | 'id'`
- Sort field: `'name' | 'amount' | 'urgency'`
- Sort direction: `'asc' | 'desc'`
- Grouping: `boolean` (stored as string, parsed on load)

---

## Translation Keys

All user-facing labels for preferences are in `src/utils/i18n.ts`:

| Key | English | Bahasa Indonesia |
|---|---|---|
| `language` | Language | Bahasa |
| `currency` | Currency | Mata Uang |
| `viewMode` | View Mode | Mode Tampilan |
| `sortBy` | Sort By | Urutkan Berdasarkan |
| `sortByName` | Name | Nama |
| `sortByAmount` | Amount | Jumlah |
| `sortByUrgency` | Urgency | Urgensi |
| `compactView` | Compact View | Tampilan Ringkas |
| `detailedView` | Detailed View | Tampilan Detail |

---

## Adding a New Preference

To add a new preference that should persist to localStorage:

1. **Define the type** in `src/types.ts` if it's a new preference category
2. **Add initialization logic** in appropriate file:
   - App-level → `src/App.tsx` (use `useState` with localStorage fallback)
   - Page-level → `src/pages/Home.tsx` or respective page
3. **Create setter function** that both updates state AND calls `localStorage.setItem()`
4. **Or use useEffect** to automatically persist state changes
5. **Add translation keys** for any UI labels in `src/utils/i18n.ts`
6. **Document** the localStorage key in this file

**Example:**
```typescript
// In App.tsx or Home.tsx
const [myPreference, setMyPreference] = useState<MyType>(() => {
  const saved = localStorage.getItem('budget_my_preference') as MyType | null;
  return saved ?? 'defaultValue';
});

// Auto-persist on change
useEffect(() => {
  localStorage.setItem('budget_my_preference', myPreference);
}, [myPreference]);
```

---

## Testing Default Behavior

To verify defaults are applied correctly:

1. **Clear localStorage:** Open DevTools Console and run:
   ```javascript
   localStorage.clear()
   ```

2. **Reload the page** and verify:
   - Currency displays as IDR (Rp format)
   - Language is English
   - View Mode is Detailed
   - Sort Order is Name (ascending)
   - Grouping is off

3. **Change a setting** and reload to confirm it persists
