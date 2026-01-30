

# Plan: Remove Beta Menu Items for Non-Admin Users

## Problem
The "Call Sheets" and "Crew Contacts" buttons in the Account dropdown are currently shown to users with `hasBetaAccess || isAdmin`. Now that there's a dedicated Extra Credit portal, these should only be visible to admins.

## Solution
Change the condition from `(hasBetaAccess || isAdmin)` to just `isAdmin` in both desktop and mobile navigation menus.

---

## Changes

### File: `src/components/Navigation.tsx`

| Edit | Lines | Change |
|------|-------|--------|
| 1 | ~217-226 | Desktop: Change `{(hasBetaAccess || isAdmin) && (` to `{isAdmin && (` |
| 2 | ~289-298 | Mobile: Change `{(hasBetaAccess || isAdmin) && (` to `{isAdmin && (` |

**Before:**
```tsx
{(hasBetaAccess || isAdmin) && (
  <>
    <DropdownMenuItem onClick={() => navigate("/call-sheets")}>
      <FileSpreadsheet className="h-4 w-4 mr-2" />
      Call Sheets
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate("/crew-contacts")}>
      <Users className="h-4 w-4 mr-2" />
      Crew Contacts
    </DropdownMenuItem>
  </>
)}
```

**After:**
```tsx
{isAdmin && (
  <>
    <DropdownMenuItem onClick={() => navigate("/call-sheets")}>
      <FileSpreadsheet className="h-4 w-4 mr-2" />
      Call Sheets
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => navigate("/crew-contacts")}>
      <Users className="h-4 w-4 mr-2" />
      Crew Contacts
    </DropdownMenuItem>
  </>
)}
```

---

## Optional Cleanup

The `hasBetaAccess` state and `checkBetaAccess` function can be removed entirely since they're no longer used, but I'll leave them in case you want to use beta gating for future features.

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Files modified | 1 (`src/components/Navigation.tsx`) |
| Lines changed | 2 (condition updates) |
| Risk | Low - UI visibility change only |

---

## Result

| User Type | Before | After |
|-----------|--------|-------|
| Admin | Sees Call Sheets, Crew Contacts | Sees Call Sheets, Crew Contacts |
| Beta User | Sees Call Sheets, Crew Contacts | **Hidden** |
| Regular User | Hidden | Hidden |

Non-admin users who need Call Sheets/Crew Contacts will access them through the Extra Credit portal instead.

