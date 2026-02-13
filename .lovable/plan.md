

## Fix: Edge Function Build Errors Blocking Backfill Button

### Problem
The "Backfill Unsaved Contacts" button calls the `import-parsed-contacts` edge function with `{"action": "backfill_complete"}`, but that function cannot deploy due to 20 TypeScript build errors. All 20 errors originate from one root cause: the `autoSaveContacts` function signature types `supabase` as `ReturnType<typeof createClient>`, which resolves all table queries to `never` because the esm.sh import has no schema generics.

### Fix (1 file, 1 line)

**File: `supabase/functions/import-parsed-contacts/index.ts`**

Change line 116:
```typescript
// FROM:
supabase: ReturnType<typeof createClient>,

// TO:
supabase: any,
```

This is purely a type annotation change. Zero logic changes. Zero behavior changes. It matches the pattern used in every other edge function in this project.

### What Will NOT Change
- No logic changes anywhere
- No frontend changes
- No schema changes
- No new files

### Verification
1. All 20 build errors resolve (they all trace to this one type)
2. Edge function deploys successfully
3. Click "Backfill Unsaved Contacts" on /admin -- should return a JSON result with sheets backfilled count

