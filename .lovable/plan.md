

## Improve Duplicate Call Sheet UX: Confirm Before Linking

### Current State
Duplicate detection already works via SHA-256 content hashing (byte-level fingerprint). Renamed files with identical content are correctly caught. No parsing is needed -- this is purely a hash comparison.

### Problem
When a duplicate is detected, the system silently links it to the user's account and shows a passive toast. The user has no opportunity to cancel or even understand what happened.

### Proposed Change

**File**: `src/components/callsheets/CallSheetUploader.tsx` (1 file, ~20 lines added)

When a duplicate hash is found (line 54), instead of immediately upserting the link, show a confirmation dialog:

- Use an `AlertDialog` (already available from Radix) to prompt the user:
  - Title: "This call sheet already exists"
  - Description: "A call sheet with identical content has already been uploaded (possibly under a different filename). Would you like to add it to your list anyway?"
  - Two buttons: "Cancel" and "Add to My Sheets"
- Only if the user confirms, perform the `user_call_sheets` upsert and call `onUploadComplete`
- If they cancel, do nothing -- just reset the processing state

### What Will NOT Change
- No schema changes
- No changes to hashing logic, upload flow, or storage paths
- No layout or CSS changes to the drop zone
- No changes to CallSheetList, CallSheetCard, or CallSheetManager

### How Duplicates Are Detected (for reference)
1. Browser reads the PDF bytes and computes SHA-256
2. Hash is sent to `lookup_global_call_sheet_by_hash` RPC
3. If a matching `global_call_sheets` row exists, it is a duplicate -- regardless of filename
4. No parsing, no text comparison, no AI involved

### Verification
1. Upload a PDF that already exists under a different name -- confirmation dialog appears
2. Click "Cancel" -- nothing is added, no toast
3. Click "Add to My Sheets" -- sheet is linked, success toast shown
4. Upload a truly new PDF -- no dialog, uploads normally
