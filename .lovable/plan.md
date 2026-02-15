

## Fix: Remove Status Badges and Parsing References from Call Sheets UI

Based on the screenshot, status badges ("pending") are still visible on every card, and the subtitle still references "real-time parsing status." Cursor's intent was to remove all status indicators since parsing is now admin-only.

### Changes

**File 1: `src/pages/CallSheetManager.tsx`** (1 line)

- Change line 59 from `"View and manage your uploaded call sheets with real-time parsing status"` to `"View and manage your uploaded call sheets"`

**File 2: `src/components/callsheets/CallSheetCard.tsx`** (~20 lines removed)

- Remove the entire `getStatusBadge` function (lines 49-83)
- Remove the status badge rendering from the header section (line 101: `{getStatusBadge(sheet.status)}`)
- Remove unused imports: `Clock`, `Loader2`, `CheckCircle`, `AlertCircle` from lucide-react and `Badge` from ui/badge
- Keep the checkbox in the header area; just remove the badge next to it

**File 3: `src/components/callsheets/CallSheetList.tsx`** (~50 lines removed)

- Remove the entire `getStatusBadge` function (lines 288-339)
- Remove the "Status" column header from the table (line 551)
- Remove the Status table cell that renders the badge (lines 579-588)
- Remove unused imports: `Clock`, `CheckCircle`, `AlertCircle` from lucide-react and `Badge` from ui/badge
- Keep `Loader2` (used for loading spinner)

### What Will NOT Change
- No schema changes
- No changes to selection, bulk delete, search, sort, PDF viewing, or upload
- No layout or spacing changes beyond removing the badge elements
- No changes to CallSheetBulkActionsBar (already clean)

### Verification
1. Build passes
2. Cards show: checkbox, filename, date, View PDF button, Delete button -- no status badge
3. List view shows: checkbox, filename, date, actions -- no Status column
4. Subtitle reads "View and manage your uploaded call sheets" (no parsing mention)
