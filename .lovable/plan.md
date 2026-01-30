
# Plan: Enhance Parse Review Toolbar and Duplicate Handling

## Overview

Major UX improvements to the Parse Review page including new action buttons, duplicate-first sorting with visual styling, a global select/deselect checkbox, consolidated export options, and an AI disclaimer.

## Changes Summary

| Feature | Description |
|---------|-------------|
| Save Selected | Saves only currently selected (checked) contacts |
| Email / Phone filter | Auto-selects contacts that have email or phone |
| Duplicates first + green rows | Detected duplicates appear at top with dark green background |
| Duplicate action buttons | "Merge All", "Add All", "Skip All" for bulk duplicate handling |
| Global checkbox | Master checkbox to select/deselect all contacts |
| Save Parsing Report dropdown | Replaces JSON/CSV buttons with dropdown (JSON, CSV, TXT) |
| AI disclaimer | Subtext next to "Parse Review" header |

---

## 1. New Toolbar Buttons

### Current Toolbar
```
[Save All] [JSON] [CSV] [Verify Source]
```

### New Toolbar
```
[Save All] [Save Selected] [Email / Phone]    [Save Parsing Report ▼]    [Verify Source]
```

**Button behaviors:**
- **Save All**: Saves all selected contacts (existing behavior)
- **Save Selected**: Saves only currently checked contacts (same as Save All but clearer intent)
- **Email / Phone**: Selects all contacts that have at least one email OR phone number

---

## 2. Duplicate-First Sorting with Green Rows

### Visual Hierarchy
```text
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠ 5 POTENTIAL DUPLICATES — CHOOSE ACTION FOR EACH                  │
│ Quick Actions: [⇆ Merge All] [+ Add All] [✕ Skip All]              │
├─────────────────────────────────────────────────────────────────────┤
│ ☑ 1  Levi Jawara        PA         lojawara@gmail.com   904...     │ ← Dark green bg
│ ☑ 2  Nick Bonanno       PA         nickybon@icloud.com  347...     │ ← Dark green bg
├─────────────────────────────────────────────────────────────────────┤
│ ☑ 3  Tamara Hansen      Director   —                    —          │ ← Normal row
│ ☑ 4  Jill Gerena        Director   —                    —          │ ← Normal row
└─────────────────────────────────────────────────────────────────────┘
```

### Duplicate Action Buttons

| Button | Action |
|--------|--------|
| **Merge All** | For each duplicate, merge with the matched existing contact |
| **Add All** | Save all duplicates as NEW contacts (ignore duplicate detection) |
| **Skip All** | Deselect all duplicate rows (exclude from save) |

---

## 3. Global Select/Deselect Checkbox

Add a checkbox in the table header that:
- **Checked** = All contacts selected (none excluded)
- **Indeterminate** = Some contacts selected
- **Unchecked** = All contacts deselected (all excluded)

Clicking toggles between "select all" and "deselect all".

---

## 4. Save Parsing Report Dropdown

Replace current JSON and CSV buttons with a single dropdown:

```text
[Save Parsing Report ▼]
  ├─ Export as .JSON
  ├─ Export as .CSV
  └─ Export as .TXT
```

Position: Above the main toolbar, right-aligned.

### TXT Format
Plain text format with contact info:

```text
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

## 5. AI Disclaimer

Add subtext to the right of "Parse Review" header:

```text
Parse Review                    Call sheet parsing is powered by AI,
Black Coffee 5:13:21.pdf        which can make mistakes. If any details
                                don't make sense, double-check the
                                actual source file.
```

Styled as small, muted text.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ParseReview.tsx` | Add AI disclaimer, new handlers for Save Selected, Email/Phone filter, duplicate actions, TXT export, global select |
| `src/components/callsheets/ParseReviewHeader.tsx` | Replace JSON/CSV with dropdown, add Save Selected + Email/Phone buttons |
| `src/components/callsheets/ParsedContactsTable.tsx` | Sort duplicates first, green row styling, add global checkbox, add duplicate section header with action buttons |

---

## Technical Implementation

### ParseReview.tsx

**New state:**
```typescript
const [skipDuplicateDetection, setSkipDuplicateDetection] = useState(false);
```

**New handlers:**
```typescript
// Save only selected (checked) contacts
const handleSaveSelected = async () => {
  // Same as handleSaveAll but with clearer intent
};

// Auto-select contacts with email or phone
const handleSelectWithContact = () => {
  const toInclude: number[] = [];
  contacts.forEach((c, idx) => {
    if (c.emails.length > 0 || c.phones.length > 0) {
      toInclude.push(idx);
    }
  });
  handleIncludeMultiple(toInclude);
  // Exclude all others
  const toExclude = contacts
    .map((_, idx) => idx)
    .filter(idx => !toInclude.includes(idx));
  handleExcludeMultiple(toExclude);
};

// Global select/deselect
const handleSelectAll = () => {
  if (excludedIndices.size === contacts.length) {
    // All excluded → include all
    setExcludedIndices(new Set());
  } else {
    // Include all
    setExcludedIndices(new Set());
  }
};

const handleDeselectAll = () => {
  setExcludedIndices(new Set(contacts.map((_, i) => i)));
};

// Duplicate bulk actions
const getDuplicateIndices = () => {
  return contacts
    .map((c, idx) => ({ contact: c, idx }))
    .filter(({ contact }) => hasPotentialDuplicate(contact, existingContacts))
    .map(({ idx }) => idx);
};

const handleMergeAllDuplicates = async () => {
  // Process only duplicate contacts, merge with existing
};

const handleAddAllDuplicates = () => {
  // Set skipDuplicateDetection flag so they save as new
  setSkipDuplicateDetection(true);
};

const handleSkipAllDuplicates = () => {
  // Exclude all duplicate indices
  const dupIndices = getDuplicateIndices();
  handleExcludeMultiple(dupIndices);
};

// TXT export
const handleExportTXT = () => {
  const lines = [`PARSE REPORT: ${callSheet.original_file_name}`];
  lines.push(`Parsed: ${callSheet.parsed_date || new Date().toISOString()}`);
  // ... format as plain text
};
```

### ParsedContactsTable.tsx

**Sorting duplicates first:**
```typescript
const sortedContacts = useMemo(() => {
  const withIndex = contacts.map((c, i) => ({ contact: c, originalIndex: i }));
  
  // Separate duplicates and non-duplicates
  const duplicates = withIndex.filter(({ contact }) => 
    hasPotentialDuplicate(contact, existingContacts)
  );
  const nonDuplicates = withIndex.filter(({ contact }) => 
    !hasPotentialDuplicate(contact, existingContacts)
  );
  
  return [...duplicates, ...nonDuplicates];
}, [contacts, existingContacts]);
```

**Green row styling for duplicates:**
```typescript
<TableRow
  className={cn(
    "transition-all",
    isExcluded && "bg-muted/50 opacity-60",
    isDuplicate && !isExcluded && "bg-green-900/30 border-l-2 border-l-green-600"
  )}
>
```

**Duplicate section header:**
```typescript
{duplicateCount > 0 && (
  <div className="bg-yellow-900/30 border-l-4 border-l-yellow-500 px-4 py-3">
    <div className="flex items-center justify-between">
      <span className="font-medium text-yellow-200">
        ⚠ {duplicateCount} POTENTIAL DUPLICATES — CHOOSE ACTION FOR EACH
      </span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Quick Actions:</span>
        <Button variant="outline" size="sm" onClick={onMergeAll}>
          <Merge className="h-4 w-4 mr-1" />
          Merge All
        </Button>
        <Button variant="outline" size="sm" onClick={onAddAll}>
          <Plus className="h-4 w-4 mr-1" />
          Add All
        </Button>
        <Button variant="outline" size="sm" onClick={onSkipAll}>
          <X className="h-4 w-4 mr-1" />
          Skip All
        </Button>
      </div>
    </div>
  </div>
)}
```

**Global checkbox in header:**
```typescript
<TableHead className="w-[40px] px-2">
  <Checkbox
    checked={excludedIndices.size === 0}
    indeterminate={excludedIndices.size > 0 && excludedIndices.size < contacts.length}
    onCheckedChange={(checked) => {
      if (checked) {
        onSelectAll();
      } else {
        onDeselectAll();
      }
    }}
  />
</TableHead>
```

---

## UI Flow After Changes

1. User loads Parse Review
2. Duplicates appear at top with dark green background
3. Yellow banner shows "X POTENTIAL DUPLICATES" with Merge All / Add All / Skip All
4. Header has global checkbox to select/deselect all
5. Toolbar has: Save All, Save Selected, Email/Phone, Save Parsing Report dropdown, Verify Source
6. AI disclaimer appears next to page title
7. Export dropdown offers JSON, CSV, TXT formats

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Sorting changes row references | Low | Use originalIndex for all operations |
| Green styling in light mode | Low | Use CSS variables / test both themes |
| TXT export formatting | Low | Simple text, no external dependencies |
| Merge All bulk operation | Medium | Process sequentially, show progress toast |

---

## Summary

| Aspect | Details |
|--------|---------|
| New files | None |
| Modified files | 3 (ParseReview.tsx, ParseReviewHeader.tsx, ParsedContactsTable.tsx) |
| Database changes | None |
| Rollback | Revert the 3 files |
