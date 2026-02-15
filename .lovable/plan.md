

## Two Changes to Call Sheet Manager

### 1. Show call sheet count next to "Your Call Sheets"

**File**: `src/pages/CallSheetManager.tsx`

Currently the tab title is hardcoded as `"Your Call Sheets"` (line 57). To show a live count, the page needs to query the `user_call_sheets` table for the current user's row count and display it in the CardTitle.

- Add state for `sheetCount` and a `useEffect` that fetches `supabase.from('user_call_sheets').select('id', { count: 'exact', head: true })` filtered by the authenticated user
- Update line 57 from `Your Call Sheets` to `Your Call Sheets ({count})`
- The count refreshes when the component mounts or when the user switches to the "sheets" tab

### 2. Single-file upload only

**File**: `src/components/callsheets/CallSheetUploader.tsx`

Currently supports drag-and-drop of up to 50 files with a bulk queue UI. This will be simplified to single-file upload:

- Remove `MAX_FILES` constant (line 20)
- Remove bulk queue state (`uploadQueue`, `currentIndex`, `processingRef`)
- Remove `processBulkUpload` and `handleBulkUpload` functions
- Remove the entire "upload queue" progress/list UI (the `ScrollArea` block showing per-file status)
- Simplify to: user picks ONE file, it uploads directly via `processFile`, shows a toast on success/duplicate/error
- Remove `multiple` attribute from the file input (line 233)
- Update drop handler to only take the first file: `files[0]`
- Update copy from "up to 50 files at once" to just "PDF files only, max 10MB"
- Keep the hashing, duplicate detection, and single-file `processFile` logic intact

### What Will NOT Change
- No schema changes
- No changes to hashing or duplicate detection logic
- No changes to CallSheetList, CallSheetCard, or bulk actions bar
- No layout/CSS changes beyond described text updates

### Verification
1. Build passes
2. "Your Call Sheets" tab header shows count in parentheses matching total sheets
3. Upload zone accepts only one file at a time (no multi-select, no queue UI)
4. Single file uploads with hash check, duplicate detection, and toast feedback

