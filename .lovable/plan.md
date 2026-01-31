
# Plan: Add Navigation Buttons + N/A Button for Matching Pages

## Problem Summary
1. Users cannot go back to review/fix previous matching decisions
2. NOVA matching wastes time re-searching names that don't have NOVA profiles

---

## Solution Overview

### Architecture Change
Switch from "remove from queue" to "index-based navigation":
- Keep all contacts in array throughout the session
- Track current position with `currentIndex` state
- Track processed contacts with a `Set<string>` for matched/skipped IDs
- For NOVA: Add separate tracking for "N/A" (no profile exists)

```text
Before: contacts = [A, B, C] -> match A -> contacts = [B, C]
After:  contacts = [A, B, C], currentIndex = 0 -> match A -> currentIndex = 1
```

---

## Changes

### 1. IGMatching.tsx
**File: `src/pages/IGMatching.tsx`**

**State changes:**
- Add `currentIndex` state (default 0)
- Add `processedIds` Set to track matched/skipped contacts
- Keep full contacts array (don't filter on match/skip)

**New handlers:**
```typescript
const handlePrevious = () => {
  if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
};

const handleNext = () => {
  if (currentIndex < contacts.length - 1) setCurrentIndex(prev => prev + 1);
};
```

**Updated match/skip handlers:**
- Add contact ID to processedIds Set
- Auto-advance to next contact (increment currentIndex)

**UI addition (below the contact card):**
```typescript
<div className="flex justify-center gap-4 mt-6">
  <Button 
    variant="outline" 
    onClick={handlePrevious}
    disabled={currentIndex === 0}
  >
    <ChevronLeft className="h-4 w-4 mr-2" />
    Previous
  </Button>
  <Button 
    variant="outline" 
    onClick={handleNext}
    disabled={currentIndex >= contacts.length - 1}
  >
    Next
    <ChevronRight className="h-4 w-4 ml-2" />
  </Button>
</div>
```

---

### 2. NOVAMatching.tsx
**File: `src/pages/NOVAMatching.tsx`**

Same changes as IGMatching, plus:

**Additional state:**
- Add `noProfileIds` Set to track contacts marked as "N/A"

**New handler:**
```typescript
const handleNoProfile = async (contactId: string) => {
  // Mark in database with special value
  await supabase
    .from('crew_contacts')
    .update({ nova_profile_url: 'N/A' })
    .eq('id', contactId);
  
  setNoProfileIds(prev => new Set([...prev, contactId]));
  setSkippedCount(prev => prev + 1);
  
  // Auto-advance
  if (currentIndex < contacts.length - 1) {
    setCurrentIndex(prev => prev + 1);
  }
};
```

**Pass to NOVAContactCard:**
```typescript
onNoProfile={() => handleNoProfile(currentContact.id)}
```

---

### 3. NOVAContactCard.tsx
**File: `src/components/callsheets/NOVAContactCard.tsx`**

**Props addition:**
```typescript
interface NOVAContactCardProps {
  // ... existing props
  onNoProfile?: () => void;  // New optional prop
}
```

**UI addition (next to Skip button):**
```typescript
<div className="mt-6 flex justify-center gap-3">
  <Button variant="ghost" size="lg" onClick={onSkip} className="text-muted-foreground">
    Skip This Person
  </Button>
  {onNoProfile && (
    <Button 
      variant="outline" 
      size="lg" 
      onClick={onNoProfile}
      className="text-orange-500 border-orange-500/50 hover:bg-orange-500/10"
    >
      <Ban className="h-4 w-4 mr-2" />
      N/A (No Profile)
    </Button>
  )}
</div>
```

---

## N/A Logic for NOVA

When "N/A" is clicked:
1. Store `nova_profile_url = 'N/A'` in the database
2. This special value will:
   - Be excluded from "needs matching" queries in future sessions
   - Be recognized as "confirmed no profile" vs "never checked"
3. User can still go back with Previous button and change their mind

---

## Position Display Update

The header position display will show actual index position:
```typescript
// Before: based on processedCount
{currentPosition} of {totalOriginal}

// After: based on currentIndex
{currentIndex + 1} of {contacts.length}
```

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Files modified | 3 |
| Lines changed | ~80 |
| Risk | Low - UI navigation, no data model changes |
| Database change | Store 'N/A' string in nova_profile_url for explicit no-profile |

---

## Verification

1. Go to IG Matching page with multiple contacts
2. Match first contact, verify auto-advance to second
3. Click "Previous" - should go back to first contact (already matched)
4. Click "Next" - should return to second contact
5. Go to NOVA Matching page
6. Click "N/A" on a contact - should advance and mark as N/A
7. Click "Previous" - should see the N/A'd contact
8. Verify N/A'd contacts don't appear in future matching sessions
