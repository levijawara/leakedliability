

## Fix: Two Issues with Call Sheet Filter Modal

### Issue 1: LAFC Still Shows "Needs Review"

**Root Cause**: The LAFC call sheet has `status = 'parsed'` in `global_call_sheets`. When you save contacts individually (via the pencil icon on the Parse Review page), nothing updates the sheet's status to `'complete'`. The "Needs Review" badge appears when `status === 'parsed' && savedContactCount === 0`.

The JSON import pipeline correctly sets status to `'complete'`, but the individual save paths (`SaveContactModal`, `ParseReview` bulk save) do not update the parent sheet's status.

**Fix**: After saving contacts from a parsed sheet (in `ParseReview.tsx`), update the `global_call_sheets.status` from `'parsed'` to `'complete'`. This is a small addition to the existing save logic -- after successfully saving one or more contacts, run:

```sql
UPDATE global_call_sheets SET status = 'complete' WHERE id = <sheet_id> AND status = 'parsed';
```

This only transitions `parsed` to `complete`, never touching other statuses.

**File**: `src/pages/ParseReview.tsx` (1 file, small change in the save handler)

---

### Issue 2: Filter Modal Shows "No Parsed Call Sheets Yet"

**Root Cause**: The `fetchCallSheets()` function is only called inside `handleOpenChange(open)` when `open === true`. However, Radix Dialog's `onOpenChange` callback is NOT triggered when the `open` prop changes from `false` to `true` externally (via the parent setting `isOpen={true}`). It only fires on user-initiated close actions (clicking overlay, pressing Escape, etc.).

Result: `fetchCallSheets()` never runs, so the left panel always shows "No parsed call sheets yet."

**Fix**: Add a `useEffect` that watches `isOpen` and `userId`. When the modal opens (and userId is available), fetch the call sheets:

```typescript
useEffect(() => {
  if (isOpen && userId) {
    setLocalFilters(filters);
    setRoleSearch("");
    fetchCallSheets();
  }
}, [isOpen, userId]);
```

This ensures the data loads every time the modal opens, regardless of how it was triggered.

**File**: `src/components/contacts/FilterModal.tsx` (1 file, adding a useEffect, ~5 lines)

---

### Summary

| Issue | Root Cause | Fix | File |
|-------|-----------|-----|------|
| LAFC "Needs Review" | `status` stays `'parsed'` after saving contacts | Update to `'complete'` after save | `ParseReview.tsx` |
| Empty call sheet list | `fetchCallSheets` never called on modal open | Add `useEffect` triggered by `isOpen` | `FilterModal.tsx` |

### What Will NOT Change
- No schema changes or migrations
- No new files
- No layout, CSS, or copy changes
- No changes to the right-side filter panel behavior
- No changes to bulk save, export, or duplicate detection

### Verification
1. Open Crew Contacts, click Filter -- left panel should now show 187 call sheets
2. Navigate to the LAFC Parse Review page, save a contact -- status should update from "Needs Review" to "Complete" on the Call Sheet Manager page
