# i18n Architecture

**Source of Truth:** `src/utils/i18n.ts` (translation keys) · `src/utils/currency.ts` (number formatting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  src/utils/i18n.ts                                  │
│  ┌─────────────────┐   ┌─────────────────────────┐  │
│  │  translations.en │   │  translations.id        │  │
│  │  (source object) │   │  (must mirror en 1:1)   │  │
│  └────────┬─────────┘   └────────────┬────────────┘  │
│           │                          │               │
│           └──────────┬───────────────┘               │
│                      ▼                               │
│         TranslationKeys = keyof typeof translations.en│
│         (TypeScript auto-derives — compiler enforces │
│          parity; missing id keys are build errors)   │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼ language: Language ('en' | 'id')
                  App.tsx state
                       │
                       ▼ prop t: Record<TranslationKeys, string>
               Pages → Components
                       │
                       ▼
                  t.createBudget  →  "Add Budget" | "Tambah Anggaran"
```

**Language preference** is stored in `localStorage` (`budget_language`) and loaded on mount in `App.tsx`. It is a per-device setting — not synced to Firestore.

---

## Key Contract

### Naming Convention

| Pattern | Rule | Example |
|---|---|---|
| Case | camelCase always | `createBudget` not `create_budget` or `CreateBudget` |
| Actions | verb + noun | `createBudget`, `saveChanges`, `deleteBudget` |
| Status | noun or adjective | `syncing`, `offline`, `loading` |
| Section headers | noun + context | `accountSettings`, `dataManagement` |
| Time/period labels | descriptive noun | `daysRemaining`, `workdaysRemaining` |

### What a Key Represents

Keys name the **UI slot**, not the value. A key is a stable contract between the product and the translation.

```ts
// ✅ Slot-based — survives copy rewrites
en: { createBudget: 'Add Budget' }
// ❌ Value-based — breaks if copy changes
en: { addBudgetButtonLabel: 'Add Budget' }
```

---

## The Workflow: Adding a New String

Never hardcode a user-facing string in a component. Always follow this sequence:

1. **Add to `en`** in `src/utils/i18n.ts`:
   ```ts
   en: {
     // ...existing keys
     yourNewKey: 'English copy here',
   }
   ```

2. **Add to `id`** with the same key — TypeScript `TranslationKeys` is derived from `en`, so a missing `id` entry is a **compile error**:
   ```ts
   id: {
     // ...existing keys
     yourNewKey: 'Terjemahan Indonesia di sini',
   }
   ```

3. **Use `t.yourNewKey`** in the component (dot notation, not bracket — maintains type inference):
   ```tsx
   <button>{t.yourNewKey}</button>
   ```

---

## Dynamic Content (Interpolations)

`i18n.ts` has **no interpolation engine**. Dynamic values are composed at the render site, not inside translation strings. This is intentional — it prevents untranslatable markup from entering the string store.

### Correct Pattern

```tsx
// ✅ Static label from i18n, dynamic value composed in JSX
<p className="text-[13px] text-health-secondary">
  {t.shouldBeRemaining}  {/* "Should be remaining" */}
</p>

// ✅ Mixed static + dynamic — compose in JSX
<p>
  Of <span className="text-health-text font-medium">
    {formatCurrency(budget.amount, currency)}
  </span> total
</p>
```

### Forbidden Pattern

```ts
// ❌ Never embed runtime values inside i18n strings
en: {
  ofTotal: `Of ${amount} total`,          // amount is not in i18n scope
  budgetsCount: `You have ${n} budgets`,  // n is not in i18n scope
}
```

### Handling Counts and Plurals

English and Bahasa Indonesia do not have complex plural morphology. Use two separate keys when count affects copy:

```ts
en: {
  reconciledSingle: 'budget reconciled',
  reconciledPlural: 'budgets reconciled',
}
// Render:
`${count} ${count === 1 ? t.reconciledSingle : t.reconciledPlural}`
```

---

## RTL Safety

### Current Status

The app is **LTR-only** (English, Bahasa Indonesia). No RTL locale is currently supported. However, RTL-incompatible patterns must not accumulate — each one added today is tech debt that blocks Arabic, Hebrew, Farsi, or Urdu support tomorrow.

### The RTL Rule

> **Never use a directional CSS property when a logical equivalent exists.**

Tailwind's logical property utilities replace directional ones. The compiler cannot enforce this — it is a human contract enforced via code review and this document.

| ❌ Forbidden (directional) | ✅ Required (logical) | CSS Property |
|---|---|---|
| `text-left` | `text-start` | `text-align: start` |
| `text-right` | `text-end` | `text-align: end` |
| `ml-*` | `ms-*` | `margin-inline-start` |
| `mr-*` | `me-*` | `margin-inline-end` |
| `pl-*` | `ps-*` | `padding-inline-start` |
| `pr-*` | `pe-*` | `padding-inline-end` |
| `left-0` (position) | `start-0` | `inset-inline-start` |
| `right-0` (position) | `end-0` | `inset-inline-end` |
| `rounded-l-*` | `rounded-s-*` | border-start-radius |
| `rounded-r-*` | `rounded-e-*` | border-end-radius |

### Documented RTL Exceptions

The following directional classes are **intentional exceptions** — they describe physical screen layout that must NOT flip in RTL:

| File | Class | Reason for Exception |
|---|---|---|
| `App.tsx` | `lg:ml-[72px]` | Desktop content offset from a sidebar pinned to the physical left edge. The sidebar is always left-anchored regardless of text direction. |
| `Home.tsx` | `mr-auto` | Used as a flex spacer (`flex: 1`) in a `flex items-center` row. Direction-neutral in practice. |

All other uses of `ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right` are **RTL debt** and should be migrated before adding any RTL locale.

### Known RTL Debt

| File | Classes | Migration Target |
|---|---|---|
| `SearchableSelect.tsx` | `text-left`, `pl-9`, `pr-4` | `text-start`, `ps-9`, `pe-4` |
| `AddBudgetModal.tsx` | `pl-4`, `pr-1` | `ps-4`, `pe-1` |
| `BudgetCard.tsx` | `pl-3` (×2) | `ps-3` |

---

## Locale-Aware Number & Currency Rendering

All monetary values go through `src/utils/currency.ts`. Never format numbers directly with `.toFixed()` or manual string operations.

| Function | Purpose | Example Output |
|---|---|---|
| `formatCurrency(amount, currency)` | Display-only output | `$1,234.56` / `Rp 1.234` |
| `getCurrencySymbol(currency)` | Symbol for input prefix | `$` / `Rp` |
| `formatCurrencyInput(value, currency)` | Live formatting in `<input>` | Handles thousands/decimal separators |
| `parseCurrencyInput(value, currency)` | Convert display string → `number` before save | `"1.234,56"` → `1234.56` |

**Critical:** Always call `parseCurrencyInput()` before any Firestore write. Never store the display string.

### Locale Separator Conventions

| Currency | Thousands | Decimal | JS Locale |
|---|---|---|---|
| USD | `,` | `.` | `en-US` |
| IDR | `.` | `,` | `id-ID` |

---

## Adding a New Language

1. Extend the `Language` type in `src/utils/i18n.ts`:
   ```ts
   export type Language = 'en' | 'id' | 'ar';
   ```

2. Add a complete translation object — TypeScript will error on every missing key until parity is achieved:
   ```ts
   export const translations = {
     en: { ... },
     id: { ... },
     ar: { /* all 210+ keys */ },
   }
   ```

3. Add the language option in `src/pages/Settings.tsx` (follow the existing `OptionRow` pattern)

4. Persist the new locale key via `localStorage.setItem('budget_language', 'ar')`

5. **If RTL** (Arabic, Hebrew, Farsi, Urdu): Add a `useEffect` in `App.tsx` to set the `dir` attribute:
   ```tsx
   useEffect(() => {
     const rtlLocales: Language[] = ['ar'];
     document.documentElement.dir = rtlLocales.includes(language) ? 'rtl' : 'ltr';
   }, [language]);
   ```
   Then audit and resolve all RTL Debt entries listed above before shipping.

---

## Currency: Adding a New Currency

1. Add to `Currency` type in `src/types.ts`
2. Add formatting logic to `formatCurrency()` and `formatCurrencyInput()` in `src/utils/currency.ts`
3. Add `getCurrencySymbol()` case
4. Add `parseCurrencyInput()` case
5. Add sample budgets for the new currency in `loadSampleBudgets()` in `src/db/firestore-db.ts`
6. Add i18n label in `src/utils/i18n.ts`
7. Add the currency option in `src/pages/Settings.tsx`

---

## What i18n Does NOT Cover

| Concern | Owner |
|---|---|
| Date/time formatting | Use `Intl.DateTimeFormat` with the active locale at the render site |
| Relative time ("3 days ago") | `formatTimeAgo()` in `src/components/BudgetCard.tsx` — currently English-only; add locale awareness if multi-language |
| Number formatting outside currency | Use `Intl.NumberFormat` with the active locale |
| Error messages from Firebase | Mapped via `mapAuthError()` in `src/services/auth.ts` → i18n keys |
