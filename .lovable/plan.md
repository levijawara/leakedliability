
# Plan: Smart Auto-Skip + Dynamic Counts for IG & NOVA Matching

## Problem
1. Users must re-match names they've already matched before (time waste)
2. The "833 verified identities" (IG) and "33K+ NOVA profiles" texts are hardcoded

## Solution
For both matching pages, implement:
1. **Auto-skip logic**: Check `user_ig_map` / previously matched NOVA profiles to auto-apply known matches
2. **Dynamic count**: Fetch actual counts from master identity tables

---

## Changes

### File 1: `src/pages/IGMatching.tsx`

| Edit | Lines | Description |
|------|-------|-------------|
| 1 | ~30 | Add `masterIdentityCount` state |
| 2 | 34-98 | Update `fetchContacts` to check `user_ig_map` and auto-apply known matches |
| 3 | 228 | Replace hardcoded `833` with `{masterIdentityCount.toLocaleString()}` |

**Auto-skip logic:**
```text
For each contact without IG:
  1. Check user_ig_map for (user_id, name)
  2. If found → update crew_contacts.ig_handle, skip queue
  3. If not found → add to matching queue
```

---

### File 2: `src/pages/NOVAMatching.tsx`

| Edit | Lines | Description |
|------|-------|-------------|
| 1 | ~30 | Add `masterIdentityCount` state |
| 2 | 34-72 | Update `fetchContacts` to check if name was previously matched by this user |
| 3 | ~145 | Replace hardcoded "33K+" with `{masterIdentityCount.toLocaleString()}` |

**Auto-skip logic:**
```text
For each contact without NOVA:
  1. Query nova_master_identities for exact name match
  2. If contact's name was previously matched by this user → auto-apply, skip queue
  3. If not found → add to matching queue
```

**Note:** For NOVA, we'll check if the user has previously matched this exact name to a NOVA profile by looking at their other crew_contacts that share the same normalized name and have a nova_profile_url.

---

## Flow Diagram

```text
Contact Load
    ↓
Already has IG/NOVA? → Skip (existing)
    ↓
Check user's previous matches for this name
    ↓
Found match? → Auto-apply, increment auto-matched count
    ↓
Not found? → Add to matching queue
```

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Files modified | 2 |
| Tables queried | `user_ig_map`, `ig_master_identities`, `nova_master_identities`, `crew_contacts` |
| New columns | None |
| Risk | Low - additive logic only |

---

## Verification Steps

1. Match "Ryan Schwerzler" to an IG handle on one call sheet
2. Upload a new call sheet with "Ryan Schwerzler"
3. Start IG Matching → Ryan should be auto-skipped
4. Verify subtitle shows live count (e.g., "854" not "833")
5. Repeat test for NOVA matching
