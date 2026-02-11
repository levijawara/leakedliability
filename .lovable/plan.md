
# IG Master List: Two-Column Layout with Identity Browser

## What this does
Restructures the "IG Master List" section in the Admin dashboard from a single full-width import bin into a two-column layout:
- **Left column**: The existing Import Seed Data bin (unchanged functionality, just narrower)
- **Right column**: A new scrollable, searchable list showing all 893 names + IG handles from the `ig_master_identities` table

## Changes

### File: `src/pages/Admin.tsx` (1 file)

**a) Add state for the identity browser (~5 lines, near existing IG Master List state around line 123)**

```
const [igIdentities, setIgIdentities] = useState<Array<{ raw_name: string; instagram: string }>>([]);
const [igIdentitiesLoading, setIgIdentitiesLoading] = useState(false);
const [igSearchTerm, setIgSearchTerm] = useState("");
```

**b) Add a `useEffect` to fetch all identities on tab load (~15 lines)**

Fetches all rows from `ig_master_identities` selecting only `raw_name` and `instagram`, ordered by `raw_name`. Uses `.limit(2000)` to cover growth beyond 893. Runs once on mount.

**c) Restructure the IG Master List tab content (lines 3777-3914)**

Replace the current single-column `space-y-6` div with a `grid grid-cols-1 lg:grid-cols-2 gap-6` layout (same pattern as the Maintenance Mode section).

- **Left column**: The existing Import Seed Data section (the border/dashed upload zone + Import File button). No changes to functionality.
- **Right column**: New "Matched Identities" panel containing:
  - A search input with placeholder "Search by name or handle..."
  - A scrollable container (`max-h-[500px] overflow-y-auto`) listing every identity
  - Two columns per row: Name (left-aligned) and @handle (right-aligned, muted color)
  - Filtered by the search term (matches against both name and handle, case-insensitive)
  - Shows count of filtered results (e.g., "Showing 893 of 893")

## What will NOT change
- No schema changes
- No new files created
- No edge function changes
- Import functionality is identical
- NOVA Master List section below is untouched

## Verification
1. Navigate to Admin > IG Master List tab
2. Confirm the import bin appears on the left (half-width on desktop)
3. Confirm the right panel shows all 893 names with their IG handles
4. Confirm the list is scrollable to see all entries
5. Confirm the search input filters the list in real time
6. Confirm text is selectable/copyable
