

## Fix: Reflect Contact Edits in Parse Review Table

### Problem
When you edit a parsed contact (e.g., adding Massimo's last name) via the pencil icon and click Save, the contact is saved to your Crew Contacts database, but the Parse Review table still shows the original parsed data. This is because the edit modal saves to the database but never communicates the amended fields back to the parent page's local state.

### Root Cause
- `SaveContactModal` calls `onSave()` with no arguments after saving
- `ParseReview.handleSaveComplete` just closes the modal (`setSelectedContact(null)`)
- The local `callSheet.parsed_contacts` array is never updated with the user's edits

### Fix (2 files)

**File 1: `src/components/callsheets/SaveContactModal.tsx`**
- Change the `onSave` prop type from `() => void` to `(updatedContact: ParsedContact) => void`
- In `handleSave`, after a successful save, call `onSave(...)` with the edited contact data (edited name, selected roles, emails, phones, departments, IG handle, original confidence)

**File 2: `src/pages/ParseReview.tsx`**
- Update `handleSaveComplete` to accept the updated contact data and the index (from `selectedContact.index`)
- Mutate the local `callSheet` state so `parsed_contacts[index]` reflects the amended fields
- This instantly updates the table row without a page reload or database re-fetch

### What Will NOT Change
- No layout, CSS, or copy changes
- No schema changes
- No new files
- No changes to bulk Save All logic
- No changes to the SaveContactModal UI or form behavior
- The save-to-database logic remains identical

### Technical Detail

```text
Current flow:
  User edits contact --> Modal saves to DB --> onSave() --> close modal
  (table still shows original parsed data)

Fixed flow:
  User edits contact --> Modal saves to DB --> onSave(editedContact) --> update local state --> close modal
  (table row instantly reflects edits)
```

### Verification
1. Open a Parse Review page for any call sheet
2. Click the pencil icon on a contact (e.g., "Massimo")
3. Edit the name (e.g., add last name "Legittimo")
4. Click Save
5. Confirm the table row now shows "Massimo Legittimo" immediately
6. Confirm bulk Save All still works as before

