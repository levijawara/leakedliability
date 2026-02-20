

## Homepage Search Result Categories and Active Debt Modal

### Goal
When search results appear on the homepage, each result should show one of three visual indicators, and clicking an active-debt result should show a modal instead of navigating away.

### Three Result Categories

1. **ACTIVE DEBT** -- producer exists in DB with `total_amount_owed > 0`
   - Clicking this result shows a **modal** on the homepage (not navigation)
   - Modal text: "The identity you've just searched has been previously reported, and has an **ACTIVE DEBT** on the leaderboard. Subscribe to gain viewing access."
   - "ACTIVE DEBT" rendered in **bold red text**
   - If the user is already subscribed (checked via `useLeaderboardAccess`), skip the modal and navigate directly to `/leaderboard?search=...`
   - Modal includes a "Subscribe" button (triggers checkout) and a "Close" button

2. **Previously reported, no active debt** -- producer exists in DB with `total_amount_owed <= 0`
   - Green disclaimer next to their name: **"No active debts found. ✅"**

3. **Never reported** -- only found in `production_companies` reference table (no matching producer)
   - Grey disclaimer next to their name: **"(unknown / never reported)"**

### Data Changes Needed

The `public_producer_search` view does NOT expose `total_amount_owed`. For the producer name search path (`performSearch`), we need to enrich results with debt status. Two approaches:

- **Preferred**: After getting results from `public_producer_search`, do a follow-up query on `producers` for only the matched `producer_id`s to get their `total_amount_owed`. This avoids modifying the view.

For the company search path (`handleCompanySearch`), we already query `producers` directly with `total_amount_owed`, so we can tag those results as active-debt. Reference-only results (from `production_companies`) are already distinguishable by their `ref-` prefixed IDs.

### Implementation (1 file: `ProducerSearchAutocomplete.tsx`)

**Step 1: Add debt-status tracking**
- Add a `Set<string>` state called `activeDebtIds` to track which `producer_id`s have active debt
- Add a `Set<string>` state called `knownProducerIds` to track all producer IDs (to distinguish "previously reported" from "never reported")

**Step 2: Enrich producer name search results**
- In `performSearch` (homepage only), after getting results from `public_producer_search`, query `producers` for the returned IDs to check `total_amount_owed`
- Populate `activeDebtIds` and `knownProducerIds`

**Step 3: Enrich company search results**
- In `handleCompanySearch`, the debt query already returns `total_amount_owed > 0` matches -- add those IDs to `activeDebtIds`
- The view query results go into `knownProducerIds`
- Reference-only results (prefixed with `ref-`) are neither known nor active-debt

**Step 4: Add modal state and UI**
- Add `showActiveDebtModal` boolean state and `selectedDebtProducer` state
- Use the existing `Dialog` component from `src/components/ui/dialog.tsx`
- Modal content: the specified copy with bold red "ACTIVE DEBT"
- Subscribe button triggers checkout flow; Close button dismisses

**Step 5: Update `handleSelect` for homepage**
- If homepage and producer has active debt:
  - Check subscription via `useLeaderboardAccess`
  - If subscribed: navigate to `/leaderboard?search=...`
  - If not subscribed: show the active debt modal
- If homepage and no active debt: allow normal behavior (or just close dropdown)

**Step 6: Update result row rendering for homepage**
- For each result in the dropdown, when `isHomepage`:
  - If `activeDebtIds.has(producer_id)`: no inline badge (the modal handles it on click)
  - If `knownProducerIds.has(producer_id)` but NOT in `activeDebtIds`: show green "No active debts found. ✅"
  - If neither (reference-only, `ref-` prefix): show grey "(unknown / never reported)"

### What Will NOT Change
- Leaderboard and profile_claim search behavior (badges, ghosts, navigation)
- Search logging and admin notification logic
- Database schema (no migrations)
- No new files created

### Files Touched
1. `src/components/ProducerSearchAutocomplete.tsx` (~40 lines modified)

### Verification
1. Search a producer with active debt on homepage -- modal appears with red "ACTIVE DEBT" text
2. Search a producer with no active debt -- green "No active debts found. ✅" appears inline
3. Search a company from reference list with no producer match -- grey "(unknown / never reported)" appears
4. Already-subscribed user clicks active-debt result -- navigates to leaderboard
5. Leaderboard search unchanged
