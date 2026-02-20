

## Fix: Remove Public PII Exposure on `producers` Table

### Problem Confirmed
The RLS policy `"Anyone can view producers" FOR SELECT USING (true)` exists on the `producers` table. This allows anonymous users to query all columns, including PII: `email`, `phone`, `stripe_verified_first_name`, `stripe_verified_last_name`.

### Why a Simple Policy Swap Is Not Enough
Three queries in `ProducerSearchAutocomplete.tsx` hit the `producers` table directly and can run for **anonymous** (logged-out) homepage visitors:

1. `producers.select("id, total_amount_owed").in("id", ids)` -- debt enrichment
2. `producers.select("id, name, company, sub_name, total_amount_owed").ilike("sub_name", ...)` -- company sub-name search
3. `producers.select("id, total_amount_owed").in("id", viewIds)` -- view result enrichment

If we just restrict the policy to `authenticated`, these break for logged-out users. The fix is to redirect these queries to the existing PII-stripped `public_leaderboard` view (which already has `sub_name`, `total_amount_owed`, `producer_id`, `producer_name`, `company_name`).

### Changes (2 files)

**File 1 -- New database migration**

Drop the permissive policy and replace with authenticated-only:

```sql
DROP POLICY IF EXISTS "Anyone can view producers" ON public.producers;
DROP POLICY IF EXISTS "Public can view producers" ON public.producers;

CREATE POLICY "Authenticated users can view producers"
ON public.producers
FOR SELECT
TO authenticated
USING (true);
```

**File 2 -- `src/components/ProducerSearchAutocomplete.tsx`**

Redirect the three anonymous-reachable queries from `producers` to `public_leaderboard`:

- Line ~148: `from("producers").select("id, total_amount_owed").in("id", ids)` becomes `from("public_leaderboard").select("producer_id, total_amount_owed").in("producer_id", ids)` (and map `producer_id` to `id` in the loop below)
- Line ~236: `from("producers").select("id, name, company, sub_name, total_amount_owed").ilike("sub_name", ...)` becomes `from("public_leaderboard").select("producer_id, producer_name, company_name, sub_name, total_amount_owed").ilike("sub_name", ...)` (and map fields when building merged results)
- Line ~295: `from("producers").select("id, total_amount_owed").in("id", viewIds)` becomes `from("public_leaderboard").select("producer_id, total_amount_owed").in("producer_id", viewIds)` (and map `producer_id` to `id`)

### What Will NOT Change
- All other pages that query `producers` (Admin, AdminEditReport, AdminProducerMerge, Leaderboard, Profile, ClaimProducer, ProducerDashboard, HoldThatLGenerator, ConfirmReport) are behind authentication guards, so the `TO authenticated USING (true)` policy covers them
- No schema changes to any table
- No changes to existing views
- No other frontend files

### Verification
- Anonymous query `supabase.from('producers').select('email').limit(1)` should return an RLS error
- Homepage search (logged out) should still return results and show debt status
- Leaderboard, admin pages, claim flow all continue to work (authenticated)

### Risks
- Low. The `public_leaderboard` view already contains all the fields needed by the redirected queries. The only risk is a field-name mismatch (`id` vs `producer_id`), which the plan accounts for with explicit mapping.
