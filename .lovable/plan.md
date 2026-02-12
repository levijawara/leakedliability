
## Fix: Auto-Save Contacts for Already-Complete Call Sheets

### Root Cause

When the auto-save code was deployed, the `auto_save_reviewed` batch action only processed call sheets with `status = 'parsed'`. However, many sheets were already `status = 'complete'` from earlier JSON imports that ran BEFORE auto-save existed. Those contacts were written to `parsed_contacts` on the sheet but never inserted into `crew_contacts` or linked via `contact_call_sheets`.

This is why you see "5 unsaved contacts" and "9 unsaved contacts" -- those people exist in the call sheet's `parsed_contacts` array but have no matching record in `crew_contacts`.

### Fix (1 file, ~20 lines)

**File: `supabase/functions/import-parsed-contacts/index.ts`**

Add a new action `backfill_complete` that:

1. Fetches all `status = 'complete'` call sheets that have `parsed_contacts`
2. For each sheet, counts how many `contact_call_sheets` links exist
3. If the link count is less than `contacts_extracted`, runs `autoSaveContacts` to insert any missing contacts
4. This is idempotent -- existing contacts get matched by email/phone and merged, truly new ones get inserted

This reuses the existing `autoSaveContacts` function with zero changes to it.

### Secondary Fix: Strip "(empty)" Placeholder Strings

The Claude JSON files sometimes include `"(empty)"` as a literal string for missing phone/email fields. The edge function currently stores these verbatim. Add a small sanitization step in the default import flow to treat `"(empty)"` as absent data (empty array) instead of storing it as a real value.

### What Will NOT Change

- No frontend/UI changes
- No schema changes
- No existing file creation
- No changes to merge logic or dedup logic
- The `autoSaveContacts` function itself stays untouched

### Verification

1. Deploy the updated edge function
2. Call the `backfill_complete` action via curl
3. Check that "unsaved contacts" count drops to 0 on the PUMA x Snipes and Lil Nas X sheets
4. Confirm total crew_contacts count increased appropriately
5. Confirm no `"(empty)"` strings in newly created contacts
