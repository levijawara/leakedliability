

## Consolidate Search Insights: Merge Top 10 into Total Searches Card

### What Changes

**File:** `src/pages/AdminSearchInsights.tsx` (1 file, ~30 lines changed)

1. **Limit top searches to 10** -- slice `topSearches` to the first 10 entries when rendering (the RPC may return more, we just display 10)
2. **Remove the standalone "Most Searched Producers" Card** (lines 168-223)
3. **Expand the "Total Searches" Card** to include the Top 10 table directly below the total count number
4. **Update card title/description** to reflect combined content (e.g. "Total Searches" header stays, description becomes "All-time searches with Top 10 most searched")

The resulting layout:
- **Card 1**: Total Searches count + Top 10 table (combined)
- **Card 2**: Recent Searches (unchanged)

### What Will NOT Change
- No schema or RPC changes
- No new files
- No styling or layout changes beyond merging the two cards
- Recent Searches card stays exactly as-is
- Data fetching logic unchanged
