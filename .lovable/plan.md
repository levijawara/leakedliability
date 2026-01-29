
## Plan: Fix Greyed-Out Save Button in SaveContactModal

### Problem Identified

The Save button is disabled because `action` state is `null`. There's a bug in the `useEffect` logic:

```text
Effect 1 (line 201): if (open && existingContacts.length > 0) → sets action to 'save_new'
Effect 2 (line 214): if (open) → ALWAYS resets action to null (line 226)
```

**Two issues:**
1. Effect 2 runs AFTER Effect 1 and unconditionally resets `action = null`
2. Effect 1 never runs if `existingContacts` is empty (no contacts saved yet)

### Fix

Merge the logic into a single `useEffect` that properly handles the action state:

**Before (broken):**
```typescript
// Effect 1: Check duplicates
useEffect(() => {
  if (open && existingContacts.length > 0) {
    const match = findPotentialMatch(contact, existingContacts);
    setDuplicateMatch(match);
    if (match) {
      setAction(null);
    } else {
      setAction('save_new');
    }
  }
}, [open, contact, existingContacts]);

// Effect 2: Initialize fields (overwrites action!)
useEffect(() => {
  if (open) {
    // ... set all fields ...
    setAction(null);  // BUG: This always runs and resets action
  }
}, [open, contact]);
```

**After (fixed):**
```typescript
// Single unified effect for modal initialization
useEffect(() => {
  if (open) {
    // Reset all form fields
    setSelectedRoles(new Set(contact.roles || []));
    setSelectedEmails(new Set(contact.emails || []));
    setSelectedPhones(new Set(contact.phones || []));
    setSelectedDepartments(new Set(contact.departments || []));
    setExtraIgHandle(contact.ig_handle || '');
    setEditableName(contact.name);
    setNewRole('');
    setNewEmail('');
    setNewPhone('');
    setShowExtraFields(false);
    
    // Check for duplicates and set action AFTER field initialization
    if (existingContacts.length > 0) {
      const match = findPotentialMatch(contact, existingContacts);
      setDuplicateMatch(match);
      setAction(match ? null : 'save_new');
    } else {
      // No existing contacts - default to save_new
      setDuplicateMatch(null);
      setAction('save_new');
    }
  }
}, [open, contact, existingContacts]);
```

---

### Files Modified

| File | Change |
|------|--------|
| `src/components/callsheets/SaveContactModal.tsx` | Merge two useEffects into one; ensure action defaults to 'save_new' when no duplicates |

---

### Verification Steps

1. Navigate to `/call-sheets/:id/review`
2. Click on a contact from the PDF to open SaveContactModal
3. Verify the Save button is **enabled** (not greyed out) for new contacts
4. Verify duplicate warning still appears and disables Save when there IS a match

---

### Risks

- **Low risk**: Single file change to effect logic
- **No UI changes**: Button behavior only
- **Rollback**: Revert 1 file

---

### Technical Details

The root cause is React's effect execution order. When both effects have overlapping triggers (`open`), they both run in sequence. Effect 2 always won because it ran last and unconditionally set `action = null`.

By consolidating into a single effect with the correct dependency array `[open, contact, existingContacts]`, the logic becomes deterministic:
- If duplicate found → `action = null` (force user choice)
- If no duplicate OR no existing contacts → `action = 'save_new'` (enable Save immediately)
