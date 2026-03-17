# i18n & Currency

**Source of Truth:** `src/utils/i18n.ts` · `src/utils/currency.ts`

## i18n

Two supported locales: `'en'` (English) and `'id'` (Bahasa Indonesia).

### Usage

```typescript
import { getTranslations } from '@/utils/i18n'
const t = getTranslations(language)   // language: 'en' | 'id'
t.addBudget                           // "Add Budget" | "Tambah Anggaran"
```

`language` comes from `App.tsx` state → passed as prop to pages → passed to `getTranslations()`.

### Adding a New String

1. Add the English key+value to the `en` object in `src/utils/i18n.ts`
2. Add the Indonesian translation to the `id` object with the same key
3. TypeScript `TranslationKeys` is auto-derived from `en` — the compiler will flag any missing `id` key

**Never hardcode user-facing strings in components.** Always add to `i18n.ts` and use `t.yourKey`.

### Key Naming Convention

- `camelCase` throughout
- Action labels: `addBudget`, `deleteBudget`, `saveChanges`
- Status messages: `syncingData`, `offlineMode`, `permissionDenied`
- Section headers: `accountSettings`, `dataManagement`

## Currency

Two supported currencies: `'USD'` and `'IDR'`.

### Formatting Functions (`src/utils/currency.ts`)

| Function | Use |
|---|---|
| `formatCurrency(amount, currency)` | Display-only: `$1,234.56` / `Rp 1.234,56` |
| `getCurrencySymbol(currency)` | `$` or `Rp` |
| `formatCurrencyInput(value, currency)` | Format while user is typing in an input |
| `parseCurrencyInput(value, currency)` | Convert display string → `number` before saving |

### Format Differences

| Currency | Thousands | Decimal | Example |
|---|---|---|---|
| USD | `,` | `.` | 1,234.56 |
| IDR | `.` | `,` | 1.234,56 |

Always use `parseCurrencyInput()` before storing to Firestore — never store the display string.

### Adding a New Currency

1. Add to `Currency` type in `src/types.ts`
2. Add formatting logic to `formatCurrency()` and `formatCurrencyInput()` in `src/utils/currency.ts`
3. Add `getCurrencySymbol()` case
4. Add `parseCurrencyInput()` case
5. Add sample budgets for new currency in `loadSampleBudgets()` in `src/db/firestore-db.ts`
6. Update Firestore security rules if currency validation is needed
7. Add i18n label in `src/utils/i18n.ts`

## Time & Daily Allowance (`src/utils/time.ts`)

Budget amounts are entered per-frequency. `getTimeMetrics()` and `getDailyAllowance()` convert to real-time progress and daily spending limits.

```typescript
getTimeMetrics(frequency, excludeWeekends?)  // → { elapsed, remaining, percentage }
getDailyAllowance(amount, frequency, excludeWeekends?)  // → daily budget number
```

`excludeWeekends` skips Saturday/Sunday from working-day calculations — only relevant for `'Weekly'` and `'Monthly'` frequencies.
