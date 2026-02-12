
## Ensure Merge Stacks All Data (Source Files Gap Fix)

### Current State (What's Already Working)
- **Call sheet appearances**: The merge already transfers all `contact_call_sheets` links from duplicates to the primary contact before deletion. Since call sheet counts are derived from this table, appearances already stack correctly.
- **YouTube views**: Views are computed client-side from `contact_call_sheets` links -> projects -> `youtube_videos`. Since the links are transferred, YouTube views already aggregate correctly after a merge.
- **Array fields**: Phones, emails, roles, departments, and IG handles are already merged via union (no data loss).

### The One Gap
The `source_files` array on the `crew_contacts` record is **not** being included in the merge update. The `mergeContactData()` function already computes the merged `source_files`, but the database update and local state update both omit it.

### Fix (1 file, ~2 lines changed)

**File: `src/components/contacts/DuplicateMergeModal.tsx`**

1. Add `source_files: mergedData.source_files` to the Supabase `.update()` call (around line 164, alongside the other merged fields).
2. Add `source_files: mergedData.source_files` to the local state object pushed into `updatedContacts` (around line 263).

That's it. No other files, no schema changes, no edge function changes.

### What Will NOT Change
- No layout, CSS, or UI changes
- No schema changes
- No edge function changes
- No other files

### Verification
1. Find two contacts that share data (same person, different spellings)
2. Merge them via the Duplicate Merge modal
3. Confirm the merged contact retains all call sheet appearances (count should be the sum of unique sheets)
4. Confirm YouTube views reflect the combined total
5. Confirm `source_files` array contains entries from both contacts
