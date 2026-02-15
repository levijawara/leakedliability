

## Fix Build Errors: Add Missing Columns to `user_call_sheets`

Cursor's code references three columns on `user_call_sheets` that do not exist in the database. The TypeScript type generator rejects the queries, causing the build to fail.

### Root Cause

The `user_call_sheets` table currently has `payment_status` and `payment_status_locked`, but Cursor's code also references:
- `payment_status_confirmed_at` (timestamptz) -- used in CallSheetList.tsx line 148, and for the business-day cooldown logic
- `payment_reversal_reason` (text) -- used in the reversal modal submit handler
- `payment_reversal_reason_other` (text) -- used in AdminPaymentReversalsOther.tsx and reversal submit

### Fix

**One database migration** adding the three missing columns:

```sql
ALTER TABLE public.user_call_sheets
  ADD COLUMN IF NOT EXISTS payment_status_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reversal_reason text,
  ADD COLUMN IF NOT EXISTS payment_reversal_reason_other text;
```

No code changes needed. Once the migration runs, the auto-generated Supabase types will include these columns, and both build errors resolve:
- `CallSheetList.tsx` select query will match the schema
- `AdminPaymentReversalsOther.tsx` select query will match the schema

### What Will NOT Change
- No code file modifications
- No schema removals or renames
- No RLS policy changes (existing policies already cover UPDATE for own rows)

### Verification
1. Migration runs without error
2. Build passes (no more "column does not exist" type errors)
3. Yes/No payment buttons work on call sheet cards
4. Reversal modal stores reason fields correctly
