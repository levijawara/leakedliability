

# Plan: Create NOVA Matching Portal

## Overview

Build a sequential matching portal for NOVA profiles (similar to IG Matching Portal) that cross-references contacts against the 33K+ `nova_master_identities` table using **NAME-ONLY** matching.

## Matching Strategy (Per User Guidance)

| What To Match | Source Table | Method |
|---------------|--------------|--------|
| Name (First + Last) | `nova_master_identities.normalized_name` | Fuzzy match against `crew_contacts.name` |
| IG handles | **NOT USED** | User confirmed these won't correlate |

## Database Query Path

```text
crew_contacts (contact without nova_profile_url)
    ↓ name (normalized)
nova_master_identities (33K+ records)
    ↓ normalized_name match
→ Returns: profile_url, full_name, roles
```

## Implementation Components

### 1. New Edge Function: `get-seed-nova-suggestion`
Similar to `get-seed-ig-suggestion`, but simpler (name-only):

**Input:**
- `name: string` - contact's name

**Logic:**
1. Normalize input name (lowercase, trim, collapse spaces)
2. Query `nova_master_identities` for exact or fuzzy `normalized_name` match
3. Return best match with confidence level

**Output:**
```typescript
{
  seedSuggestion: string | null,  // profile_url
  confidence: 'high' | 'medium',
  matchedName: string,            // What name was found in NOVA
  username: string,               // NOVA username from URL
  roles: string[]                 // NOVA roles for context
}
```

### 2. New Component: `NOVAContactCard.tsx`
Streamlined version of `IGContactCard` for NOVA matching:

**Key Differences from IG Card:**
- No phone/email matching (name only)
- Shows NOVA profile URL instead of IG handle
- Links to itsnova.com profile for verification
- Updates `crew_contacts.nova_profile_url` on confirm

**UI Elements:**
- Contact name + role display
- Suggested NOVA match card with confidence badge
- "Use This" / "Not a Match" buttons
- Manual search input (search by name in NOVA table)
- Skip button
- Coworkers section (optional)

### 3. New Page: `NOVAMatching.tsx`
Route: `/call-sheets/:id/nova-matching`

**Structure (mirrors `IGMatching.tsx`):**
- Fetch contacts linked to call sheet without `nova_profile_url`
- Sequential one-at-a-time queue
- Progress bar showing position
- Navigation: Back, Skip All, Finish buttons

### 4. Integration Points

**Entry Point (ParseReview.tsx):**
Add "Match NOVA Profiles" button alongside existing "Match IG Handles"

**Entry Point (SaveSuccessBar.tsx):**
Add NOVA matching option after save

**App.tsx Route:**
```typescript
<Route path="/call-sheets/:id/nova-matching" element={<RequireAuth requireBeta><NOVAMatching /></RequireAuth>} />
```

## Technical Details

### Name Matching Algorithm

```typescript
function normalizeNameForNova(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')     // collapse spaces
    .replace(/[^\w\s]/g, ''); // remove punctuation
}

// Query approach for edge function:
const { data } = await supabase
  .from('nova_master_identities')
  .select('profile_url, full_name, normalized_name, username, roles')
  .eq('normalized_name', normalizedContactName)
  .limit(1);

// Fallback: fuzzy match for partial names
if (!data?.length) {
  const { data: fuzzyData } = await supabase
    .from('nova_master_identities')
    .select('*')
    .ilike('normalized_name', `%${nameParts.last}%`)
    .limit(5);
  // Score by first name match
}
```

### Confidence Levels

| Scenario | Confidence |
|----------|------------|
| Exact normalized name match | HIGH |
| Last name + first initial match | MEDIUM |
| Last name only match | LOW (skip auto-suggest) |

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/get-seed-nova-suggestion/index.ts` | Edge function for name-based NOVA lookup |
| `src/components/callsheets/NOVAContactCard.tsx` | UI card for matching workflow |
| `src/pages/NOVAMatching.tsx` | Main portal page |

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add route for `/call-sheets/:id/nova-matching` |
| `src/pages/ParseReview.tsx` | Add "Match NOVA Profiles" button |
| `src/components/callsheets/SaveSuccessBar.tsx` | Add NOVA matching option |

## User Flow

1. User uploads call sheet and saves contacts
2. SaveSuccessBar shows "Match NOVA Profiles" option
3. User clicks → goes to `/call-sheets/:id/nova-matching`
4. For each contact without `nova_profile_url`:
   - System queries `nova_master_identities` by normalized name
   - If match found: Show suggested NOVA profile with "Use This" / "Not a Match"
   - If no match: Show "No match found" with manual search
   - User confirms or skips
5. On confirm: Update `crew_contacts.nova_profile_url`
6. Progress until all contacts processed

## Summary

| Aspect | IG Portal | NOVA Portal |
|--------|-----------|-------------|
| Matching by | Phone → Email → Name | **Name ONLY** |
| Master table | `ig_master_identities` (833) | `nova_master_identities` (33K+) |
| Target field | `crew_contacts.ig_handle` | `crew_contacts.nova_profile_url` |
| Confidence source | Phone = high, Name = medium | Exact name = high, Fuzzy = medium |

