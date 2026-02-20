

## Re-implement Homepage Search Layout

The homepage search changes (dual-input layout, ghost/badge removal) were lost from `ProducerSearchAutocomplete.tsx`. The file currently has a single-input layout for all sources with ghosts and badges shown everywhere. This plan restores the intended behavior.

### What was lost

1. **Dual-input layout** (First name + Last name, OR Production company) for homepage
2. **`isHomepage` flag** to conditionally render the homepage vs. leaderboard layout
3. **Ghost icons and status badges removed** from homepage results
4. **"Unclaimed profiles require subscription to view" footer removed** from homepage results
5. **Prompt copy** should say "Search by producer name or production company to find out."

### Changes (1 file, ~50 lines)

**File: `src/components/ProducerSearchAutocomplete.tsx`**

1. Add `isHomepage` derived from `source === 'homepage'`
2. Add `firstName`, `lastName`, `productionCompany` state variables
3. Add `handleProducerSearch` (combines first+last, searches `producer_name`)
4. Add `handleCompanySearch` (searches `company_name`)
5. Add `Button` import
6. Replace the single-input JSX with a conditional:
   - **Homepage**: Two rows separated by "or" divider
     - Row 1: First name + Last name inputs + Search button (visible when both filled)
     - Row 2: Production company input + Search button (visible when filled)
   - **Non-homepage**: Keep existing single-input autocomplete unchanged
7. In the results dropdown, conditionally hide ghost icons, all status badges, and the "Unclaimed profiles" footer when `isHomepage` is true
8. Skip the live-search `useEffect` for homepage (homepage uses explicit button clicks)

**File: `src/pages/Index.tsx`** (1 line)

Update the prompt text from "Search any producer or production company name to find out." to "Search by producer name or production company to find out."

### Technical details

- The `performSearch` function gains an optional `searchBy` parameter (`"producer_name"` or `"company_name"`) to support company searches
- Homepage searches are button-triggered (not debounced/live) since the user fills two fields
- Non-homepage behavior is completely unchanged (single input, live search, ghosts, badges)
- No new files, no schema changes, no new dependencies

### What will NOT change
- Leaderboard and profile_claim search behavior
- Search logging and admin notification logic (already gated by `isAdmin`)
- Database schema
- Any other files

### Verification
1. Navigate to homepage, confirm dual-input layout with "or" divider
2. Search a producer name -- confirm results show without ghost icons or badges
3. Search a company name -- confirm results appear
4. Navigate to leaderboard -- confirm single-input with ghosts and badges still works
