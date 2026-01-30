

# Plan: Complete Parse Review Enhancements (Retry)

## Current State

All three files still have the original implementation. None of the planned changes were saved due to interruptions.

## Files to Modify

| File | Changes Needed |
|------|----------------|
| `src/components/callsheets/ParseReviewHeader.tsx` | Replace JSON/CSV buttons with dropdown, add Save Selected + Email/Phone buttons |
| `src/components/callsheets/ParsedContactsTable.tsx` | Duplicate-first sorting, green rows, global checkbox, duplicate action banner |
| `src/pages/ParseReview.tsx` | AI disclaimer, new handlers, new props, TXT export |

---

## 1. ParseReviewHeader.tsx

**New props:**
- `selectedCount` - number of selected contacts
- `onSaveSelected` - save only selected
- `onSelectWithContact` - auto-select contacts with email/phone
- `onExportTXT` - new TXT export handler

**Layout:**
```
[Save Parsing Report ▼]                         (above toolbar, right-aligned)

[Save All] [Save Selected (X)] [Email / Phone]  [Verify Source]
```

---

## 2. ParsedContactsTable.tsx

**New props:**
- `onSelectAll` / `onDeselectAll` - global checkbox handlers
- `onMergeAll` / `onAddAll` / `onSkipAll` - duplicate bulk actions
- `duplicateCount` - number of duplicates found

**Changes:**
1. Sort duplicates to top using useMemo
2. Add global checkbox in header (indeterminate state support)
3. Green background for duplicate rows (`bg-green-900/20`)
4. Yellow banner when duplicates exist with action buttons
5. Export `hasPotentialDuplicate` function for use in parent

---

## 3. ParseReview.tsx

**New state:**
```typescript
const [skipDuplicateDetection, setSkipDuplicateDetection] = useState(false);
```

**New handlers:**
- `handleSaveSelected()` - same as Save All (clearer intent)
- `handleSelectWithContact()` - select contacts with email OR phone
- `handleSelectAll()` / `handleDeselectAll()` - global toggle
- `handleMergeAllDuplicates()` - merge duplicate contacts with existing
- `handleAddAllDuplicates()` - save duplicates as new
- `handleSkipAllDuplicates()` - exclude all duplicates
- `handleExportTXT()` - plain text export

**Header changes:**
Add AI disclaimer subtext:
```
Parse Review                 
Black Coffee.pdf             ← AI disclaimer text here →
```

---

## Technical Details

### Duplicate-first sorting (ParsedContactsTable)
```typescript
const sortedContacts = useMemo(() => {
  const withIndex = contacts.map((c, i) => ({ contact: c, originalIndex: i }));
  const duplicates = withIndex.filter(({ contact }) => 
    hasPotentialDuplicate(contact, existingContacts)
  );
  const nonDuplicates = withIndex.filter(({ contact }) => 
    !hasPotentialDuplicate(contact, existingContacts)
  );
  return [...duplicates, ...nonDuplicates];
}, [contacts, existingContacts]);
```

### Green row styling
```typescript
<TableRow className={cn(
  "transition-all",
  isExcluded && "bg-muted/50 opacity-60",
  isDuplicate && !isExcluded && "bg-green-900/20 border-l-2 border-l-green-600"
)}>
```

### Global checkbox (indeterminate)
```typescript
<Checkbox
  checked={excludedIndices.size === 0}
  ref={(el) => {
    if (el) {
      const indeterminate = excludedIndices.size > 0 && excludedIndices.size < contacts.length;
      (el as any).indeterminate = indeterminate;
    }
  }}
  onCheckedChange={(checked) => checked ? onSelectAll() : onDeselectAll()}
/>
```

### TXT export format
```
PARSE REPORT: Black Coffee 5:13:21.pdf
Parsed: 2025-01-30
Total: 19 contacts (15 included, 4 excluded)

---

1. Tamara Hansen
   Role: Director
   Email: —
   Phone: —

2. Nick Bonanno
   Role: Production Assistant
   Email: nickybon@icloud.com
   Phone: 3473698782
...
```

---

## Summary

| Aspect | Details |
|--------|---------|
| Files modified | 3 |
| New files | 0 |
| Database changes | None |
| Risk | Low - UI changes only |

