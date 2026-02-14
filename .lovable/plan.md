

## Feature: Combined "From..." + Filter Modal (Split-Panel Layout)

### What It Does
Expands the existing Filter Contacts modal to double-width with a two-panel layout:
- **Left panel**: Scrollable list of the user's parsed call sheets (multi-selectable)
- **Right panel**: The existing filter UI (roles, departments, contact info, etc.)

Users can combine call sheet source filtering with all existing filters in one place. Select one or more call sheets on the left, set department/role/contact-info filters on the right, hit Apply -- and the contacts list shows only matching results.

### Layout

```text
+-------------------------------------------------------+
|              Filter Contacts        [3 active]     [X] |
+------------------------+------------------------------+
| From Call Sheets       | Search Roles                 |
|                        | [Search roles...]            |
| [ ] LAFC 2024 Shoot   |                              |
|     Jan 15, 2024       | Sort by Appearances  Sort YT |
|                        | Favorites only               |
| [x] BTS - Drake MV    |                              |
|     Dec 3, 2023        | Filter by Contact Info       |
|                        | [Phone] [Email] [IG] ...     |
| [ ] crew_list_v3.pdf   |                              |
|     Nov 20, 2023       | Departments                  |
|                        | [Camera] [Sound] [Art] ...   |
| ...                    |                              |
|                        | Roles                        |
|                        | [DoP (17)] [1st AC (12)] ... |
+------------------------+------------------------------+
| Clear All              |        [Cancel] [Apply]      |
+-------------------------------------------------------+
```

### Data Source for Left Panel

Query path: `user_call_sheets` (user's sheets) joined to `global_call_sheets` (file name, status, youtube_video_id) joined to `youtube_videos` (video title).

Display name per row: `youtube_videos.title` if linked, otherwise `global_call_sheets.original_file_name`.

Only sheets with `status = 'complete'` are shown. Ordered by `created_at DESC`.

### Filtering Logic

When call sheets are selected, the system fetches all `contact_call_sheets` rows for the selected `call_sheet_id`(s) and filters the contacts list to only those IDs. This stacks with all existing filters (search, role, department, favorites, etc.).

When no call sheets are selected, filtering works exactly as it does today -- no regression.

### State Changes

The `ContactFilters` interface gets a new field:

```typescript
export interface ContactFilters {
  // ... existing fields unchanged ...
  selectedCallSheetIds: string[];  // NEW
}
```

The `defaultFilters` in `CrewContacts.tsx` adds `selectedCallSheetIds: []`.

The `filteredContacts` useMemo in `CrewContacts.tsx` adds a filter step: if `selectedCallSheetIds.length > 0`, fetch matching contact IDs from `contact_call_sheets` and filter.

### Active Filter Chip

When call sheets are selected, a chip appears in the toolbar area: "From: [sheet name] (+N more) X" -- clicking X clears the call sheet selection.

### Files Modified

1. **`src/components/contacts/FilterModal.tsx`** -- Major update:
   - Widen modal from `max-w-2xl` to `max-w-5xl`
   - Split content into two-column grid layout (`grid grid-cols-[1fr_1.5fr]`)
   - Left column: new call sheet list with checkboxes, fetched on modal open
   - Right column: all existing filter UI (moved into right pane, zero logic changes)
   - Add `selectedCallSheetIds` to `ContactFilters` interface and `localFilters` state
   - Add `userId` prop to fetch the user's call sheets

2. **`src/pages/CrewContacts.tsx`** -- Minor update:
   - Update `defaultFilters` to include `selectedCallSheetIds: []`
   - Add a new `useEffect` or inline fetch to get contact IDs for selected call sheets
   - Add call sheet filter step in `filteredContacts` useMemo
   - Pass `userId` to FilterModal
   - Update `activeFilterCount` to include call sheet selections

### What Will NOT Change
- No schema changes, no new tables, no migrations
- No new files created (all changes in existing FilterModal.tsx and CrewContacts.tsx)
- No edge functions
- No changes to contact cards, table rows, export, duplicate merge, or any other feature
- The right-side filter UI is identical -- just relocated into a grid column
- All existing filter logic continues to work exactly as before

### Edge Cases
- User has no parsed call sheets: left panel shows "No parsed call sheets yet" message
- A selected call sheet has 0 contacts linked: those contacts simply produce an empty intersection (works naturally with existing filter logic)
- Clearing "Clear All" resets both panels (call sheets + filters)

### Verification
1. Open Crew Contacts, click Filter button
2. Modal is now wider with two panels
3. Left panel shows parsed call sheets with correct display names (video title or file name)
4. Select one or more call sheets -- checkmarks appear
5. Set some role/department filters on the right side
6. Click Apply Filters
7. Contacts list shows only contacts matching BOTH the call sheet source AND the role/department filters
8. Active filter count badge reflects call sheet selections
9. Click Filter again, click Clear All -- both sides reset
10. Apply with nothing selected -- all contacts shown (no regression)

