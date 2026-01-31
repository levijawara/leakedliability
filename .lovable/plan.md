
# Plan: Allow Single Call Sheet Project Creation

## Problem
Currently, the "Create Project" button only appears when 2+ call sheets are selected. However, a single work-day (one call sheet) can result in multiple videos, so users need the ability to create a project folder for just one call sheet.

## Solution
Lower the minimum selection threshold from 2 to 1 in two files.

---

## Changes

### 1. Show Button for 1+ Selected
**File: `src/components/callsheets/CallSheetBulkActionsBar.tsx`**

```typescript
// Line 163: Change threshold from 2 to 1
- {selectedIds.length >= 2 && (
+ {selectedIds.length >= 1 && (
```

### 2. Update Modal Validation & Copy
**File: `src/components/callsheets/CreateProjectModal.tsx`**

```typescript
// Line 43: Allow single sheet
- if (selectedSheets.length < 2) return;
+ if (selectedSheets.length < 1) return;

// Line 99-101: Handle singular/plural description
- Group {selectedSheets.length} call sheets into a single project folder.
+ Group {selectedSheets.length} call sheet{selectedSheets.length !== 1 ? 's' : ''} into a project folder.

// Line 138: Update button disabled condition
- disabled={isCreating || !projectName.trim() || selectedSheets.length < 2}
+ disabled={isCreating || !projectName.trim() || selectedSheets.length < 1}
```

---

## Result
Users can now create a project folder with just 1 call sheet selected, allowing them to link multiple videos to a single work-day.

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Files modified | 2 |
| Lines changed | 4 |
| Risk | None - simple threshold change |
