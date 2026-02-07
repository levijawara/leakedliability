

# Add "All / Delinquent" Admin Toggle to Leaderboard

## What this does
Adds a persistent, admin-only toggle next to the existing "Public View / Admin View" toggle on the leaderboard page. When set to "Delinquent", only producers who actively owe money are shown. When set to "All", every reported producer appears (current behavior). The setting is stored in the database and persists until an admin changes it -- just like the "Free Leaderboard Access" toggle.

## Changes

### 1. Database migration (new column on `leaderboard_config`)

Add a `show_delinquent_only` boolean column (default `false`) to the existing `leaderboard_config` table:

```sql
ALTER TABLE public.leaderboard_config
  ADD COLUMN show_delinquent_only boolean NOT NULL DEFAULT false;
```

No new RLS policies needed -- the table already has:
- "Anyone can view leaderboard config" (SELECT, true)
- "Only admins can modify leaderboard config" (ALL, admin-only)

### 2. Frontend update: `src/pages/Leaderboard.tsx` (1 file)

**a) Add a query to fetch `leaderboard_config`** -- specifically the `show_delinquent_only` field. This will sit alongside the existing `site_settings` query.

**b) Add a mutation function** to update `show_delinquent_only` when the admin toggles it.

**c) Add the toggle UI** next to the existing "Public View / Admin View" toggle (around line 644). Only visible to admins. The toggle label will read "All" or "Delinquent" based on state.

**d) Apply the filter to both mobile and desktop views** -- filter producers where `total_amount_owed > 0` when `show_delinquent_only` is true. This filter applies globally (all users see the filtered list), but only admins can change the setting.

The filtering logic (applied at both line ~695 for mobile and ~934 for desktop):

```typescript
// After existing search filter
let filtered = producers?.filter(/* existing search logic */);

// Apply delinquent filter if enabled
if (showDelinquentOnly) {
  filtered = filtered?.filter(p => (p.total_amount_owed || 0) > 0);
}
```

## What will NOT change
- No layout or styling changes beyond the new toggle element
- No schema changes to any other table
- No new files created
- No edge functions modified
- The existing "Public View / Admin View" toggle is untouched
- The `public_leaderboard` view definition stays the same

## Verification
1. Log in as admin, go to the leaderboard
2. See the new "All / Delinquent" toggle next to the existing view toggle
3. Toggle to "Delinquent" -- producers with $0 owed disappear
4. Toggle back to "All" -- all producers reappear
5. Refresh the page -- the setting persists (still shows whichever was last selected)
6. Log in as a non-admin subscriber -- the toggle is not visible, but the filter applies based on what the admin last set
7. Non-admin users cannot change the setting

## Risks
- Low: single additive column, client-side filtering, existing RLS covers access
- Rollback: drop the column and revert `Leaderboard.tsx`

