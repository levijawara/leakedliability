
# Plan: Incremental Parse Review Enhancements

## Strategy

Break the large update into **6 small edits** across 3 files to avoid platform timeouts.

---

## Edit 1: ParseReviewHeader.tsx - Add new props and dropdown

**Changes:**
- Add props: `selectedCount`, `onSaveSelected`, `onSelectWithContact`, `onExportTXT`
- Replace JSON/CSV buttons with dropdown menu
- Add "Save Selected" and "Email / Phone" buttons

**Lines affected:** ~90 lines total, full rewrite acceptable for small file

---

## Edit 2: ParsedContactsTable.tsx - Add new props interface

**Changes (lines 37-46):**
- Add to interface: `onSelectAll`, `onDeselectAll`, `onMergeAll`, `onAddAll`, `onSkipAll`, `duplicateCount`

---

## Edit 3: ParsedContactsTable.tsx - Add duplicate sorting and global checkbox

**Changes:**
- Add useMemo for duplicate-first sorting
- Add global checkbox in header
- Add duplicate banner before table

---

## Edit 4: ParsedContactsTable.tsx - Update row styling

**Changes (lines 229-232):**
- Add green background for duplicate rows: `bg-green-900/20 border-l-2 border-l-green-600`

---

## Edit 5: ParseReview.tsx - Add new handlers

**Changes (after line 354):**
- Add `handleExportTXT` function
- Add `handleSaveSelected` function  
- Add `handleSelectWithContact` function
- Add `handleSelectAll` / `handleDeselectAll`
- Add duplicate bulk action handlers

---

## Edit 6: ParseReview.tsx - Update component props

**Changes (lines 405-440):**
- Add AI disclaimer subtext in header section
- Pass new props to `ParseReviewHeader`
- Pass new props to `ParsedContactsTable`

---

## Execution Order

```text
1. ParseReviewHeader.tsx    (full rewrite - small file)
2. ParsedContactsTable.tsx  (interface update)
3. ParsedContactsTable.tsx  (sorting + banner)
4. ParsedContactsTable.tsx  (row styling)
5. ParseReview.tsx          (handlers)
6. ParseReview.tsx          (props + JSX)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Edit timeout | Small edits (~30-50 lines each) |
| Partial state | Each edit is functional standalone |
| Rollback | Can revert individual edits |

---

## Summary

| Aspect | Details |
|--------|---------|
| Total edits | 6 |
| Max lines per edit | ~50 |
| Files touched | 3 |
| Database changes | None |
