

## Fix: Two Build Errors from Cursor's LL 2.0 Push

### Error 1: `ParseResult.production_company` does not exist
**File**: `supabase/functions/parse-call-sheet/index.ts` (line 776)

**Cause**: Cursor's code references `parseResult.production_company`, but the `ParseResult` interface (line 185) only has: `contacts`, `project_title`, `parsed_date`, `unassigned_emails`, `unassigned_phones`. There is no `production_company` field.

**Fix**: Add `production_company` to the `ParseResult` interface as an optional field:
```typescript
interface ParseResult {
  contacts: ParsedContact[];
  project_title: string | null;
  parsed_date: string | null;
  unassigned_emails: string[];
  unassigned_phones: string[];
  production_company: string | null;  // ADD THIS
}
```

This is safe because: the AI model parsing the call sheet may or may not return this field. If the model doesn't return it, it defaults to `null` via the `??` operator on line 776.

**File touched**: `supabase/functions/parse-call-sheet/index.ts` (1 line added to interface)

---

### Error 2: `production_instances` table not in Supabase types
**File**: `src/pages/Leaderboard.tsx` (lines 159, 769, 773)

**Cause**: The `production_instances` table does not exist in the database yet. The migration file exists in `supabase/migrations/` but was never applied. The generated TypeScript types don't include `production_instances`, so the Supabase client rejects it at compile time.

**Fix**: Run the migration to create the `production_instances` table. This will:
1. Create the table with the correct schema (id, global_call_sheet_id, production_name, company_name, shoot_start_date, etc.)
2. Set up RLS policies (public read, service role write)
3. Backfill from existing parsed call sheets
4. Auto-regenerate TypeScript types so `supabase.from("production_instances")` compiles

The migration SQL should match what Cursor defined:
- Table `production_instances` with columns: `id`, `global_call_sheet_id` (unique FK), `production_name`, `company_name`, `primary_contacts` (jsonb), `shoot_start_date` (date), `extracted_date` (date), `verification_status` (text), `metadata` (jsonb), `created_at`, `updated_at`
- RLS: anyone can SELECT, service role / admins can INSERT/UPDATE
- Backfill from `global_call_sheets` where status in ('parsed', 'complete')

**Action**: Database migration (creates 1 new table)

---

### Summary

| Error | Root Cause | Fix | Scope |
|-------|-----------|-----|-------|
| `production_company` not on `ParseResult` | Missing interface field | Add optional field to interface | 1 line in edge function |
| `production_instances` not valid table | Migration not applied | Run migration to create table | Database migration |

### What Will NOT Change
- No layout, CSS, or copy changes
- No changes to existing leaderboard logic
- No changes to any other edge function
- No changes to FilterModal or CrewContacts

### Verification
1. Build should pass with no TS errors
2. Active Productions tab on Leaderboard should load backfilled data
3. Parse function should successfully upsert production instances after parsing

