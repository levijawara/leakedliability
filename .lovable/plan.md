
# Plan: Fix NOVA CSV Parsing Bug

## Problem
The CSV parser uses a broken regex that splits names containing spaces. When importing "Adam Gharib", only "Gharib" is captured.

**Root Cause (line 3983):**
```javascript
// BROKEN: [^",\s]+ excludes spaces, splitting "Adam Gharib" into two matches
const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
```

## Solution
Replace the manual regex parser with PapaParse (already installed in dependencies) for robust CSV handling.

---

## Changes

### File: `src/pages/Admin.tsx`

**Edit 1: Add PapaParse import (near top of file)**
```typescript
import Papa from 'papaparse';
```

**Edit 2: Replace CSV parsing logic (lines 3975-3989)**

Replace the broken manual CSV parser with PapaParse:

```typescript
if (novaMasterFile.name.endsWith('.csv')) {
  // Use PapaParse for robust CSV parsing
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().replace(/"/g, ''),
  });
  contacts = parsed.data;
} else {
  contacts = JSON.parse(text);
}
```

---

## After Fix: Re-import Required

Once the fix is deployed, the admin will need to **re-import the CSV** to correct the data. The existing 33K records have incorrect names and will be updated via the upsert logic (matched by username).

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Files modified | 1 (`src/pages/Admin.tsx`) |
| Lines changed | ~20 |
| Risk | Low - PapaParse is already installed |
| Database impact | None until re-import |

---

## Verification Steps

1. Deploy the fix
2. Re-upload `nova_profiles.csv` in Admin Dashboard
3. Query database: `SELECT * FROM nova_master_identities WHERE username = 'adamgharib'`
4. Verify `full_name = "Adam Gharib"` (not "Gharib")
5. Test NOVA Matching - "Adam Gharib" should now auto-suggest
