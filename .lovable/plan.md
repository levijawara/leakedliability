
# Fix: Duplicate Merge Call Sheet Attribution Loss

## Problem Summary
When contacts are merged via "Find Duplicates", call sheet attributions from the deleted duplicates are **permanently lost** due to `ON DELETE CASCADE` on the foreign key. The merge logic updates contact data but doesn't transfer call sheet links before deletion.

## Technical Root Cause

```text
┌─────────────────────────────────────────────────────────────────┐
│  Current Merge Flow (BROKEN)                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Update primary contact with merged data         ✓ Works    │
│  2. Delete duplicate contacts                       ✓ Works    │
│  3. contact_call_sheets FK has CASCADE DELETE                   │
│     └─> Links to deleted contacts are LOST          ✗ BUG      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Database Constraint (Confirmed)
```sql
-- Foreign key on contact_call_sheets:
constraint_name: contact_call_sheets_contact_id_fkey
delete_action: 'c' (CASCADE)
```

## Evidence From Your Data

| Contact | Arin Ray (12:21:21) | Arin Ray (12:19:21) | Explanation |
|---------|---------------------|---------------------|-------------|
| Whipalo | ✓ | ✓ | Saved as same contact (name matched exactly) |
| Julio Durango | ✓ | ✓ | Saved as same contact |
| Silvia Durango | ✓ | ✓ | Saved as same contact |
| Brian Beckwith | ✗ | ✓ | Merged; link from `BRiAN BECKWITH` was lost |
| Levi Jawara | ✗ | ✗ | Merged; both links lost |

Parsed names from PDFs:
- `Levi Jawara` vs `LEVI JAWARA` (casing difference → 2 contacts → merged → links lost)
- `Brian Beckwith` vs `BRiAN BECKWITH` (casing difference → same issue)

---

## Solution

### Step 1: Modify `DuplicateMergeModal.tsx` Merge Logic

Add a step to **transfer call sheet links** from duplicates to the primary contact **before deletion**.

**Location**: `src/components/contacts/DuplicateMergeModal.tsx` (around line 186)

**Insert Before Delete:**
```typescript
// STEP: Transfer contact_call_sheets links from duplicates to primary
for (const dupId of idsToDelete) {
  // Get all call sheet links for this duplicate
  const { data: dupLinks } = await supabase
    .from('contact_call_sheets')
    .select('call_sheet_id')
    .eq('contact_id', dupId);

  if (dupLinks && dupLinks.length > 0) {
    for (const link of dupLinks) {
      // Check if primary already has this link (avoid duplicates)
      const { data: existingLink } = await supabase
        .from('contact_call_sheets')
        .select('id')
        .eq('contact_id', primaryId)
        .eq('call_sheet_id', link.call_sheet_id)
        .maybeSingle();

      // If primary doesn't have this link, create it
      if (!existingLink) {
        await supabase
          .from('contact_call_sheets')
          .insert({
            contact_id: primaryId,
            call_sheet_id: link.call_sheet_id
          });
      }
    }
  }
}

// Now safe to delete duplicates (their links are transferred)
```

### Step 2: Add Logging for Visibility

Log transferred links so you can verify the fix:
```typescript
console.log('[DuplicateMergeModal] Transferred', transferredCount, 
  'call sheet links from duplicates to primary:', primaryContact.name);
```

---

## Technical Details

### Files to Modify
1. `src/components/contacts/DuplicateMergeModal.tsx`
   - Add link transfer logic before the delete operation (between lines 183-186)

### No Database Changes Required
- The existing schema is correct
- The CASCADE behavior is appropriate (just need to transfer first)

### Performance Note
- For typical merge operations (2-5 duplicates), this adds ~5-10 additional queries
- Negligible impact on UX

---

## Immediate Data Recovery (Optional)

For Brian and Levi, you can manually restore the missing links using the "Credits" modal on each Arin Ray call sheet, which allows promoting contacts from `parsed_contacts` back to `crew_contacts`. Alternatively, I can provide a SQL script to backfill based on the `parsed_contacts` JSON.

---

## Summary

| Action | Description |
|--------|-------------|
| **Root Cause** | Merge deletes duplicates without transferring their `contact_call_sheets` links |
| **Fix** | Insert link-transfer step before deletion in `DuplicateMergeModal.tsx` |
| **Files Changed** | 1 file (DuplicateMergeModal.tsx) |
| **Risk Level** | Low - additive logic, no schema changes |
| **Rollback** | Simply remove the added code block |
