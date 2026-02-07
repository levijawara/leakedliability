

# Increase Admin Notes Character Limit from 2,000 to 10,000

## Problem
Randy's submission has detailed admin notes (6,690 characters), but the database trigger `validate_admin_notes()` enforces a hard cap of 2,000 characters. Attempting to save will fail with a database exception.

## What needs to change

### 1. Database migration (new migration)
Replace the `validate_admin_notes()` trigger function to raise the limit from 2,000 to 10,000:

```sql
CREATE OR REPLACE FUNCTION public.validate_admin_notes()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.admin_notes IS NOT NULL AND length(NEW.admin_notes) > 10000 THEN
    RAISE EXCEPTION 'Admin notes must be 10000 characters or less';
  END IF;
  RETURN NEW;
END;
$$;
```

### 2. Error message update
**File:** `src/lib/errors.ts` (~1 line)

Update the user-facing error string from `'max 2000 characters'` to `'max 10,000 characters'` so the message matches the new limit.

## What will NOT change
- No frontend/UI changes (the textarea already has no maxLength and already displays the character count)
- The Zod validation schema already allows up to 50,000 characters -- no change needed
- No new files created
- No other database triggers, tables, or columns touched

## Verification
1. Open Admin, click Review on Randy's submission
2. The admin notes field should show 6,690 characters
3. Click Verify and Approve
4. Confirm it saves successfully without a "too long" error

## Risks
- None -- this is a single constant change in one trigger function and one error string
- Rollback: re-run the migration with the old `2000` value
