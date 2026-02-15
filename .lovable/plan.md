
## Add "View PDF" Button to Call Sheet Reservoir

### What changes
**1 file modified**: `src/pages/AdminCallSheetReservoir.tsx`

### Details

- Add `import { PDFViewerModal } from "@/components/callsheets/PDFViewerModal"` to the imports
- Add state: `const [viewingPdf, setViewingPdf] = useState<{ filePath: string; fileName: string } | null>(null)`
- In the Actions column (around line 613-620), add a new "View PDF" button right before the existing Download button, using the `Eye` icon (already imported)
- Add the `PDFViewerModal` component at the bottom of the JSX (before the delete AlertDialog)
- The button opens the same in-app PDF viewer modal used on the Call Sheet Manager page

### What does NOT change
- No frontend layout, CSS, or styling changes
- No schema changes
- CallSheetList / Call Sheet Manager page remains untouched (it already has a view button and no download button to remove)
- No new files created

### Verification
- Navigate to `/admin/call-sheet-reservoir`
- Each row should now show an Eye icon button next to the Download button
- Clicking it opens the PDF viewer modal with zoom, page navigation, and the file name in the header
