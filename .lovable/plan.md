

# Secure Leaderboard Data at the Database Layer

## Problem

The `public_leaderboard` view has `GRANT SELECT TO authenticated`, meaning **any logged-in user** can query the full leaderboard directly, bypassing the subscription/entitlement check that only exists in the UI via `check-leaderboard-access`.

## Solution: SECURITY DEFINER RPC (Approach 1)

Gate all leaderboard data behind a single `get_leaderboard_data` function that checks entitlements before returning rows.

---

## Phase 1: Database Migration

Create a new migration that:

1. **Creates `get_leaderboard_data` RPC** (`SECURITY DEFINER`)
   - Parameters: `p_delinquent_only BOOLEAN DEFAULT FALSE`
   - Logic (in priority order):
     - If `auth.uid()` is NULL, return empty
     - If `leaderboard_config.free_access_enabled` is TRUE, return full data
     - If user has admin role via `has_role(auth.uid(), 'admin')`, return full data
     - If user has an active entitlement (`status IN ('active', 'grace_period')` for `entitlement_type = 'leaderboard'`), return full data
     - Otherwise, return empty
   - When `p_delinquent_only = TRUE`, filter to `total_amount_owed > 0`
   - Returns the same columns as the current `public_leaderboard` view

2. **Creates `get_leaderboard_debt_check` RPC** (`SECURITY DEFINER`)
   - For the ProducerSearchAutocomplete debt enrichment queries
   - Parameters: `p_producer_ids UUID[]`
   - Returns `producer_id` and `total_amount_owed` for the given IDs
   - Same entitlement checks as above (but also allows unauthenticated homepage access since debt status enrichment uses the `public_leaderboard` view which is currently readable by `authenticated` — we'll keep this accessible to authenticated users since it only returns 2 columns)
   - Actually, on review: the sub_name search also queries public_leaderboard. This needs gating too.

3. **Revokes direct SELECT**
   ```sql
   REVOKE SELECT ON public_leaderboard FROM authenticated;
   ```

4. **Grants EXECUTE** on both new functions to `authenticated`

## Phase 2: Frontend Updates (3 files)

### File 1: `src/pages/Leaderboard.tsx`
- Replace `supabase.from("public_leaderboard").select("*")` with `supabase.rpc("get_leaderboard_data", { p_delinquent_only: showDelinquentOnly })`
- Remove any client-side delinquent filtering (the RPC handles it)

### File 2: `src/components/ProducerSearchAutocomplete.tsx`
- Replace the 3 direct `public_leaderboard` queries:
  - Debt enrichment by IDs (lines ~148-151): use `supabase.rpc("get_leaderboard_debt_check", { p_producer_ids: ids })`
  - Sub-name search (lines ~235-240): use `supabase.rpc("get_leaderboard_data", { p_delinquent_only: true })` then filter client-side by sub_name, OR create a third minimal RPC. Given scope constraints, we'll use the debt check RPC and handle sub_name search via the existing `public_producer_search` view (which doesn't expose full leaderboard data).
  - Second debt enrichment (lines ~295-298): same as first

### File 3: `src/pages/ProducerDashboard.tsx`
- Replace `supabase.from("public_leaderboard").select("pscs_score").eq("producer_id", producerId)` with a direct query to `producers` table (the fallback already exists at line 136). Simply remove the leaderboard query attempt and go straight to producers.

---

## What Will NOT Change (Invariants)
- No CSS, layout, or copy changes
- No schema changes to existing tables/columns
- The `public_leaderboard` view definition itself remains unchanged
- `check-leaderboard-access` edge function remains unchanged (still used for UI gating)
- No new files created (migration file is the only new file, which is required)
- ProducerSearchAutocomplete search behavior remains identical to users

## Risks
- If the `get_leaderboard_data` RPC has a bug in entitlement logic, entitled users could see an empty leaderboard. Mitigated by: the logic mirrors `check-leaderboard-access` which is already tested.
- ProducerDashboard losing the leaderboard-calculated PSCS score: mitigated by falling back to `producers.pscs_score` which is already populated by triggers.

## Verification Steps
1. Authenticated user without subscription calls `supabase.rpc('get_leaderboard_data')` -- should return empty array
2. Admin user calls same -- should return full leaderboard
3. User with active entitlement -- should return full leaderboard
4. Free access mode enabled -- should return full leaderboard for any authenticated user
5. Direct `SELECT * FROM public_leaderboard` by authenticated user -- should fail with permission denied
6. ProducerSearchAutocomplete still enriches debt status on homepage
7. ProducerDashboard still shows PSCS score

