

# Fix: "View Details" Does Nothing on Crew/Vendor/Producer Reports

## Problem

The admin dashboard has two rendering paths for submission tabs:

1. **Hardcoded tabs** (lines 1986-2195): Crew Reports, Vendor Reports, Producer Reports — each `TabsContent` closes after the table with **no detail panel**.
2. **Dynamic `.map()` loop** (line 2406): Handles `payment_confirmation`, `counter_dispute`, `payment_documentation`, `report_explanation`, `report_dispute` — these **do** include the detail panel (lines 2531-2673).

When you click "View Details" on a crew report, `setSelectedItem(submission)` fires, but no component reads `selectedItem` inside the active `TabsContent`. The detail card that shows name/email/form data/documents/admin notes only renders for the dynamically-mapped types.

## Fix

Add the same review/detail panel inside each of the three hardcoded `TabsContent` blocks (crew_report, vendor_report, producer_report), rendered conditionally when `selectedItem` matches that submission type.

### Specifically

For each of the three tabs, insert the detail `Card` **after the `</Table>` and before the `</TabsContent>`**:

```text
  </Table>

  {selectedItem && selectedItem.submission_type === '<type>' && (
    <Card>  <!-- Review panel: name, email, form data, documents, admin notes, verify/reject/cancel buttons -->
    </Card>
  )}

</TabsContent>
```

The detail panel content will be identical to the existing one at lines 2531-2673 (the one used by the dynamic tabs). To avoid duplicating ~140 lines four times, I will extract the detail panel into a shared inline rendering block or a helper component, then reference it from all tab locations.

### Implementation Steps

1. **Extract** the detail panel (lines 2531-2673) into a local `renderDetailPanel(submissionType: string)` function inside the component.
2. **Insert** `{renderDetailPanel('crew_report')}` before `</TabsContent>` in the Crew Reports tab (after line 2053).
3. **Insert** `{renderDetailPanel('vendor_report')}` before `</TabsContent>` in the Vendor Reports tab (after line 2124).
4. **Insert** `{renderDetailPanel('producer_report')}` before `</TabsContent>` in the Producer Reports tab (after line 2195).
5. **Replace** the inline detail panel in the dynamic `.map()` loop (lines 2531-2673) with `{renderDetailPanel(type)}`.

### What Won't Change
- No new files, no new dependencies
- No layout, styling, or copy changes
- All existing functionality (verify, reject, admin notes, document viewing, ZIP download) preserved
- The dynamic tabs continue to work identically

