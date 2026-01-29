

## Plan: Re-run Duplicate Detection When Name is Edited

### Problem
When you edit the contact name in the SaveContactModal (e.g., changing "Shaeden Gallegos" to your own name), the duplicate detection doesn't re-run. This means:
1. If you already exist as a saved contact, you won't get the "Merge with Existing" prompt
2. You might accidentally create a duplicate of yourself

### Solution
Add a second `useEffect` that re-runs duplicate detection whenever `editableName` changes.

---

### Implementation

**File:** `src/components/callsheets/SaveContactModal.tsx`

Add a new effect after the initialization effect (around line 226):

```typescript
// Re-check duplicates when editable name changes
useEffect(() => {
  if (open && editableName && existingContacts.length > 0) {
    // Build a synthetic contact with the edited name
    const editedContact: ParsedContact = {
      ...contact,
      name: editableName.trim(),
    };
    const match = findPotentialMatch(editedContact, existingContacts);
    setDuplicateMatch(match);
    // If no match, default to save_new; if match found, force user to choose
    setAction(match ? null : 'save_new');
  }
}, [editableName]);
```

---

### Behavior After Fix

| Scenario | Before Fix | After Fix |
|----------|------------|-----------|
| Open modal with "Shaeden Gallegos" (no match) | Save enabled | Save enabled |
| Edit name to "Levi Smith" (exists in contacts) | Save stays enabled (creates duplicate) | Yellow warning appears, must choose Merge or Save as New |
| Edit name to "John Doe" (doesn't exist) | Save enabled | Save enabled |

---

### Technical Details

- Uses the existing `findPotentialMatch()` function with a synthetic contact object
- Only runs when modal is open and user has existing contacts
- Debouncing not needed since `findPotentialMatch` is synchronous and fast (in-memory check)

---

### Files Modified

| File | Change |
|------|--------|
| `src/components/callsheets/SaveContactModal.tsx` | Add useEffect to re-check duplicates when editableName changes |

---

### Verification Steps

1. Go to ParseReview page
2. Click a contact to open SaveContactModal
3. Change the name to match an existing contact you've already saved
4. Verify yellow "Possible match" warning appears
5. Choose "Save as New" or "Merge with Existing"
6. Confirm Save button works

---

### Risks

- **Low risk**: Adding one additional effect, no structural changes
- **No UI changes**: Same warning component already exists
- **Rollback**: Revert 1 file

