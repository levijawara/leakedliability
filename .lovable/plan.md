
# Plan: Fix NOVA Icon Showing for "N/A" Contacts

## Problem
When a contact is marked with "N/A" for their NOVA profile (meaning they don't have a profile), the contact card still shows the NOVA icon as a clickable link pointing to the literal string "N/A" - which is not a valid URL.

## Root Cause
In `CrewContactCard.tsx`:
- Line 106: `const hasIcons = contact.nova_profile_url || contact.ig_handle;`
- Line 215: `{contact.nova_profile_url && (...)`

Both checks only test for truthiness. The string "N/A" is truthy, so the icon renders.

## Solution
Add a helper function to check if a NOVA URL is valid (not null, not empty, not "N/A"), and use it in both the icon visibility check and render condition.

---

## Changes

**File: `src/components/contacts/CrewContactCard.tsx`**

### 1. Add helper function (around line 38)
```typescript
// Check if NOVA URL is valid (not null, empty, or N/A marker)
const isValidNovaUrl = (url: string | null | undefined): boolean => {
  return !!url && url !== 'N/A' && url.startsWith('http');
};
```

### 2. Update hasIcons check (line 106)
```typescript
// Before
const hasIcons = contact.nova_profile_url || contact.ig_handle;

// After
const hasIcons = isValidNovaUrl(contact.nova_profile_url) || contact.ig_handle;
```

### 3. Update render condition (line 215)
```typescript
// Before
{contact.nova_profile_url && (

// After
{isValidNovaUrl(contact.nova_profile_url) && (
```

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Files modified | 1 |
| Lines changed | ~5 |
| Risk | None - defensive check, no behavior change for valid URLs |
| Rollback | Revert the 3 small changes |

---

## Verification

1. View a contact with `nova_profile_url = 'N/A'` - should NOT show NOVA icon
2. View a contact with a valid NOVA URL - should show NOVA icon as before
3. View a contact with `nova_profile_url = null` - should NOT show NOVA icon
