

## Fix: Remove `reporter_id` from `public_payment_reports` View

### Problem
The `public_payment_reports` view exposes `reporter_id` (a UUID linking to the submitting user) and is granted `SELECT` to `anon`. This means anyone with the anon key can identify who submitted each report -- a privacy issue for reporters.

### Confirmed Safe to Remove
All frontend and edge function code that reads `reporter_id` does so from the `payment_reports` **table** (which has proper RLS), not from the public view. Removing it from the view will not break any functionality.

### Fix (1 migration, 0 code changes)

Create a new migration that recreates the view without `reporter_id`:

```sql
CREATE OR REPLACE VIEW public.public_payment_reports AS
SELECT
  id,
  days_overdue,
  producer_id,
  amount_owed,
  invoice_date,
  payment_date,
  verified,
  created_at,
  updated_at,
  closed_date,
  project_name,
  reporter_type,
  report_id,
  city,
  status
FROM payment_reports
WHERE verified = true;
```

No need to re-grant since `GRANT SELECT ON public_payment_reports TO anon` persists across `CREATE OR REPLACE VIEW`.

### What Will NOT Change
- Frontend code (no component queries `reporter_id` from this view)
- Edge functions (they query the base `payment_reports` table with service role)
- Database schema (no table changes)
- RLS policies
- Any other views

### Files Touched
- 1 new migration file (schema only)

### Verification
- After migration: `SELECT column_name FROM information_schema.columns WHERE table_name = 'public_payment_reports'` should NOT include `reporter_id`
- Spot-check: `SELECT * FROM public_payment_reports LIMIT 1` should return rows without `reporter_id`

### Risks
- None. The column is not referenced from the view anywhere in application code.

