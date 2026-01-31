
# Plan: Sticky Toolbar + Fix Project Modal Buttons

## Problem Summary
1. The Call Sheets page toolbar scrolls away, unlike the Crew Contacts page where it stays visible
2. "View PDF" and "Generate Credits" buttons don't work when viewing call sheets inside a project folder

---

## Changes

### 1. Make Call Sheets Toolbar Sticky
**File: `src/components/callsheets/CallSheetList.tsx`**

Wrap the ReparseControlPanel and search/sort controls in a sticky container, matching the Crew Contacts toolbar pattern:

```typescript
// Around line 927, wrap controls in sticky container
<div className="sticky top-[73px] z-10 bg-background pb-4 pt-2">
  {/* Reparse Control Panel */}
  <ReparseControlPanel ... />

  {/* Search and Sort Controls */}
  <div className="flex flex-col sm:flex-row gap-3 mt-3">
    ...
  </div>
</div>
```

The `top-[73px]` value aligns with the navigation bar height.

---

### 2. Fix View PDF and Credits Buttons in Project Modal
**File: `src/components/callsheets/ProjectDetailModal.tsx`**

Add local state and handlers for the PDF viewer and Credits modals:

**Add imports:**
- `PDFViewerModal` from `./PDFViewerModal`
- `CreditsModal` from `./CreditsModal`

**Add state:**
```typescript
const [viewingPdf, setViewingPdf] = useState<{ filePath: string; fileName: string } | null>(null);
const [creditsSheet, setCreditsSheet] = useState<{ id: string; fileName: string } | null>(null);
```

**Update CallSheetCard props:**
```typescript
onViewPdf={(sheet) => setViewingPdf({ 
  filePath: sheet.master_file_path, 
  fileName: sheet.original_file_name 
})}
onCredits={(sheet) => setCreditsSheet({ 
  id: sheet.id, 
  fileName: sheet.original_file_name 
})}
```

**Add modals to render:**
```typescript
{/* PDF Viewer Modal */}
{viewingPdf && (
  <PDFViewerModal
    open={!!viewingPdf}
    onOpenChange={() => setViewingPdf(null)}
    filePath={viewingPdf.filePath}
    fileName={viewingPdf.fileName}
  />
)}

{/* Credits Modal */}
{creditsSheet && (
  <CreditsModal
    open={!!creditsSheet}
    onOpenChange={() => setCreditsSheet(null)}
    callSheetId={creditsSheet.id}
    fileName={creditsSheet.fileName}
  />
)}
```

---

## Technical Details

| Aspect | Details |
|--------|---------|
| Files modified | 2 |
| Lines changed | ~30 |
| Risk | Low - UI positioning and event handler wiring |
| Rollback | Revert sticky class, remove modal state/handlers |

---

## Verification

1. Open Call Sheets page and scroll down - toolbar should remain visible
2. Open a project folder with call sheets inside
3. Click the "View PDF" button (FileType icon) - PDF viewer modal should open
4. Click the "Generate Credits" button (List icon) - Credits modal should open
