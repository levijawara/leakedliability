
# Plan: Route IG Matching to NOVA Matching

## Problem
After completing IG Matching, users are taken directly to Crew Contacts instead of NOVA Matching.

## Solution
Update the IG Matching page to navigate to NOVA Matching when complete, preserving the call sheet ID for context.

---

## Changes

### File: `src/pages/IGMatching.tsx`

**Edit 1: Update `handleFinish` (lines 118-124)**
- Change navigation from `/crew-contacts` to `/call-sheets/{id}/nova-matching`

**Edit 2: Update `handleSkipAll` (lines 114-116)**
- Change navigation to go to NOVA Matching instead of Crew Contacts

**Edit 3: Update "All Done" screen button (line 159)**
- Change button to "Continue to NOVA Matching"
- Navigate to `/call-sheets/{id}/nova-matching`

**Edit 4: Update "No Contacts" screen button (line 180)**
- Change navigation to NOVA Matching (users may still want to match NOVA profiles even if no IG handles needed)

---

## Flow After Implementation

```text
Parse Review
    ↓
IG Matching (/call-sheets/:id/ig-matching)
    ↓ (Finish / Skip All / All Done)
NOVA Matching (/call-sheets/:id/nova-matching)
    ↓ (Finish / Skip All / All Done)
Crew Contacts
```

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Files modified | 1 (`src/pages/IGMatching.tsx`) |
| Lines changed | ~8 |
| Database changes | None |
| Risk | Low - navigation only |
