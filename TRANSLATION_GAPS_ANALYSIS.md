# Missing Indonesian (ID) Translations — Gap Analysis

## Analysis Summary
**Total Unique Keys in EN:** 75  
**Total Keys with ID Translations:** 75  
**Missing ID Translations:** 0 ✓

However, **11 user-facing strings are hardcoded in components** instead of being in `i18n.ts`. These need to be:
1. Added to `src/utils/i18n.ts` (both EN and ID)
2. Removed from components
3. Used via `t.keyName` instead

---

## Hardcoded Strings Requiring Translation

### Location: `src/pages/Login.tsx` (line 46)
```tsx
<h1>"Budget Forecaster"</h1>
```
**Severity:** HIGH — App branding/name appears on login screen  
**New key:** `appName`

---

### Location: `src/pages/Home.tsx` (lines 195–223) — Error Recovery Section

**String 1:** "Permission Denied" (line 195)
- Severity: HIGH
- Key: `errorPermissionDenied`
- Context: Error title when Firestore permission check fails

**String 2:** "Firestore is checking access permissions. This usually resolves in 5–10 minutes after publishing Security Rules." (line 197)
- Severity: HIGH  
- Key: `errorPermissionDeniedMessage`
- Context: Explanation for permission error
- Note: The "5–10 minutes" is informational, not interpolated

**String 3:** "Wait a few minutes and try again" (line 201)
- Severity: MEDIUM
- Key: `errorPermissionAction1`
- Context: First recovery action

**String 4:** "Hard refresh: ⌘⇧R (Mac) or Ctrl⇧R (Windows)" (line 202)
- Severity: MEDIUM
- Key: `errorPermissionAction2`
- Context: Second recovery action
- Note: Platform-specific keyboard shortcuts should remain in English (OS convention)

**String 5:** "Cannot Load Budgets" (line 209)
- Severity: MEDIUM
- Key: `errorCannotLoadBudgets`
- Context: Error title for general budget loading failure

**String 6:** "Retry" (line 217)
- Severity: HIGH
- Key: `retry`
- Context: Button label in error recovery
- Note: Single word, very common

**String 7:** "Dismiss" (line 223)
- Severity: MEDIUM
- Key: `dismiss`
- Context: Button label to close error message

---

### Location: `src/pages/Home.tsx` (lines 508–523) — Firestore Initialization Wait State

**String 8:** "Waiting for Firestore" (line 513)
- Severity: HIGH
- Key: `waitingForFirestore`
- Context: Heading when app waits for Firestore permissions

**String 9:** "Access permissions are being set up. This usually takes 5–10 minutes." (line 516)
- Severity: HIGH
- Key: `waitingForFirestoreMessage`
- Context: Explanation for Firestore wait state
- Note: Same "5–10 minutes" timeframe as error message

**String 10:** "Try Again" (line 521)
- Severity: HIGH
- Key: `tryAgain`
- Context: Button label (variant of "Retry")

---

## Proposed Indonesian Translations

```typescript
// New keys to add to src/utils/i18n.ts

en: {
  // ... existing keys ...
  appName: 'Budget Forecaster',
  errorPermissionDenied: 'Permission Denied',
  errorPermissionDeniedMessage: 'Firestore is checking access permissions. This usually resolves in 5–10 minutes after publishing Security Rules.',
  errorPermissionAction1: 'Wait a few minutes and try again',
  errorPermissionAction2: 'Hard refresh: ⌘⇧R (Mac) or Ctrl⇧R (Windows)',
  errorCannotLoadBudgets: 'Cannot Load Budgets',
  retry: 'Retry',
  dismiss: 'Dismiss',
  waitingForFirestore: 'Waiting for Firestore',
  waitingForFirestoreMessage: 'Access permissions are being set up. This usually takes 5–10 minutes.',
  tryAgain: 'Try Again',
}

id: {
  // ... existing keys ...
  appName: 'Prakiraan Anggaran',
  errorPermissionDenied: 'Akses Ditolak',
  errorPermissionDeniedMessage: 'Firestore sedang memeriksa izin akses. Ini biasanya terselesaikan dalam 5–10 menit setelah menerbitkan Aturan Keamanan.',
  errorPermissionAction1: 'Tunggu beberapa menit dan coba lagi',
  errorPermissionAction2: 'Segarkan ulang: ⌘⇧R (Mac) atau Ctrl⇧R (Windows)',
  errorCannotLoadBudgets: 'Tidak Dapat Memuat Anggaran',
  retry: 'Coba Lagi',
  dismiss: 'Tutup',
  waitingForFirestore: 'Menunggu Firestore',
  waitingForFirestoreMessage: 'Izin akses sedang diatur. Ini biasanya memakan waktu 5–10 menit.',
  tryAgain: 'Coba Lagi',
}
```

---

## Translation Notes & Justifications

### `appName` → **Prakiraan Anggaran**
- Direct translation: "Budget Forecaster" → "Prakiraan Anggaran"
- "Prakiraan" = forecast/prediction (already used for `manageSpending`)
- "Anggaran" = budget (matches existing terminology)
- Maintains brand consistency with `manageSpending: 'Prakiraan'`

### `errorPermissionDenied` → **Akses Ditolak**
- Standard Indonesian error message
- "Akses" = access, "Ditolak" = denied
- Formal, standard phrasing

### `errorPermissionDeniedMessage` → **Firestore sedang memeriksa izin akses...**
- "sedang memeriksa" = is checking (present continuous)
- "izin akses" = access permissions
- "menerbitkan Aturan Keamanan" = publish Security Rules
- Technical accuracy maintained

### `errorPermissionAction1` → **Tunggu beberapa menit dan coba lagi**
- "Tunggu" = wait, "beberapa menit" = a few minutes, "coba lagi" = try again
- Uses "coba" (informal) consistent with `loading: 'Memuat...'` style

### `errorPermissionAction2` → **Segarkan ulang: ⌘⇧R (Mac) atau Ctrl⇧R (Windows)**
- "Segarkan ulang" = hard refresh (web standard)
- Keyboard shortcuts unchanged (OS convention in all languages)
- "Mac/Windows" remain English (platform names)

### `errorCannotLoadBudgets` → **Tidak Dapat Memuat Anggaran**
- "Tidak dapat" = cannot/unable to
- "Memuat" = load (matches existing `loadingBudgets: 'Memuat anggaran...'`)
- Consistent terminology

### `retry` → **Coba Lagi**
- Common UI pattern in Indonesian apps
- "Coba" = try, "Lagi" = again
- Single word acceptable, two words better for clarity

### `dismiss` → **Tutup**
- Already exists in `pwaDismiss: 'Tutup'` → using same translation
- "Tutup" = close/dismiss (standard)

### `waitingForFirestore` → **Menunggu Firestore**
- "Menunggu" = waiting for
- Service name (Firestore) kept in English (product name)
- Similar to how apps handle brand names globally

### `waitingForFirestoreMessage` → **Izin akses sedang diatur...**
- "sedang diatur" = is being set up (passive voice required in Indonesian)
- Clear and informative
- Matches permission-setting context

### `tryAgain` → **Coba Lagi**
- Same as `retry` — can reuse if button labels are identical
- If used in different contexts, keeping as separate key maintains flexibility

---

## Quality Assurance Checklist

✅ No variables (interpolation placeholders) broken  
✅ No technical terms mistranslated  
✅ Brand consistency maintained (`Prakiraan Anggaran` matches `Prakiraan`)  
✅ Keyboard shortcuts preserved (OS convention)  
✅ Service names in English (Firestore, Rules)  
✅ Standard Bahasa Indonesia (Baku) — no casual slang  
✅ All translations remain concise for UI fit  
✅ Punctuation & special characters preserved (em-dash, ⌘⇧R)  

---

## Implementation Priority

| Priority | Keys | Reason |
|---|---|---|
| **CRITICAL** | `appName`, `waitingForFirestore`, `waitingForFirestoreMessage`, `errorPermissionDenied`, `errorPermissionDeniedMessage` | App branding + initialization UX |
| **HIGH** | `retry`, `tryAgain`, `errorCannotLoadBudgets` | Error recovery paths |
| **MEDIUM** | `dismiss`, `errorPermissionAction1`, `errorPermissionAction2` | Secondary actions |

---

## Files to Modify

1. **`src/utils/i18n.ts`** — Add 11 new key-value pairs to both `en` and `id` objects
2. **`src/pages/Login.tsx`** — Replace "Budget Forecaster" with `t.appName`
3. **`src/pages/Home.tsx`** — Replace all 9 hardcoded strings with `t.keyName` references
