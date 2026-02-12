
## Fix: Show Contacts Count on Complete Call Sheets

### Problem
The call sheet cards are not displaying the extracted contacts count because the UI only shows it when `status === 'parsed'`. Since the JSON import now sets status directly to `'complete'`, the count is hidden even though the data exists in the database.

### Changes (2 files, ~4 lines each)

**1. `src/components/callsheets/CallSheetCard.tsx`** (line ~206)
- Change condition from `sheet.status === 'parsed'` to include `'complete'`:
  ```
  {(sheet.status === 'parsed' || sheet.status === 'complete') && sheet.contacts_extracted !== null && (
  ```

**2. `src/components/callsheets/CallSheetList.tsx`** (line ~1098)
- Same fix for the table/list view:
  ```
  {(sheet.status === 'parsed' || sheet.status === 'complete') && sheet.contacts_extracted !== null ? (
  ```

### What Will NOT Change
- No layout, CSS, or component structure changes
- No schema changes
- No edge function changes
- No other files touched

### Verification
1. Navigate to /call-sheets
2. Confirm call sheet cards now show the contacts count (e.g., "24") next to a user icon
3. Confirm both card view and list view display correctly
