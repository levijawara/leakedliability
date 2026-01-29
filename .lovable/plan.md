

# Fix: NOVA Import Skipping All Records Due to URL Mismatch

## Root Cause

The `extractUsernameFromUrl` function in `import-nova-master-list` Edge Function uses a regex that only matches `itsnova.co`:

```typescript
const match = url.match(/itsnova\.co\/([^/?#]+)/i);
```

But your scraped data uses `www.itsnova.com`:
- Data: `https://www.itsnova.com/andrelynch`
- Expected: `https://itsnova.co/andrelynch`

Result: Every single URL fails extraction and 33,252 records get skipped.

## Solution

Update the regex to accept BOTH `.co` and `.com` domains, with optional `www.` prefix:

```typescript
function extractUsernameFromUrl(url: string): string | null {
  // Handle URLs like:
  // - https://itsnova.co/andrelynch
  // - https://www.itsnova.com/andrelynch
  const match = url.match(/(?:www\.)?itsnova\.(?:co|com)\/([^/?#]+)/i);
  if (match) {
    return match[1].toLowerCase().trim();
  }
  return null;
}
```

## Technical Change

| File | Change |
|------|--------|
| `supabase/functions/import-nova-master-list/index.ts` | Update regex pattern on line 23 |

## Expected Results

After fix, re-uploading the same file:

| Metric | Before | After |
|--------|--------|-------|
| Skipped | 33,252 | ~0 (only invalid records) |
| Imported | 0 | ~29,000+ (after deduplication) |
| Unique Processed | 0 | 29,000+ |

## Verification

After deploying the fix:
1. Re-upload the same JSON file via Admin > NOVA Master List
2. Response should show `imported` count in the thousands
3. Query `nova_master_identities` table to confirm records exist

