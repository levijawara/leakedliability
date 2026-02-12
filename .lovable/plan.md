
## Add Email Preview to Manual Email Sender

### Problem
Currently, clicking "Send Email" in the Manual Email Sender fires immediately with no preview. You want to see exactly what the recipient will receive -- populated with real producer data -- before confirming the send.

### Approach
Add a preview step to `ManualEmailSender.tsx` that renders the actual email template component with real producer data inline, plus a confirm/cancel flow.

### Changes (1 file)

**File: `src/components/admin/ManualEmailSender.tsx`**

1. **Add preview state**: New `showPreview` boolean and `previewData` object state
2. **Change "Send Email" button behavior**: Instead of calling the edge function directly, it now builds the template data locally (mirroring the `buildTemplateData` logic from the edge function) and shows a preview panel
3. **Render the preview**: When `showPreview` is true, display the actual React email template component (e.g., `LiabilityNotification`) with the real producer's data (name, amount owed, project, days overdue, etc.) in a styled preview container showing From/To/Subject headers -- same layout as the existing EmailPreview on the sitemap page
4. **Confirm/Cancel buttons**: Below the preview, show "Confirm Send" (triggers the actual edge function call) and "Cancel" (returns to the form)
5. **Import the template components**: Import the same template components already used in `EmailPreview.tsx` (they are already importable from the supabase functions path)

### Data Flow

```text
Select template + producer
        |
   Click "Preview Email"
        |
   Build template data locally (from producer record)
        |
   Render actual React email component with real data
        |
   Show From / To / Subject header + rendered template
        |
   "Confirm & Send" --> calls edge function as before
   "Back to Edit"   --> hides preview, returns to form
```

### What fetches the real data
The `producers` array is already passed as a prop with `id`, `name`, `email`, `company`. For the liability notification specifically, we also need `total_amount_owed`, `oldest_debt_days`, and the latest report's `project_name` and `report_id`. These are already fetched by the edge function, but for the preview we need them client-side. We will:
- Expand the `Producer` interface to include `total_amount_owed`, `oldest_debt_days` (these fields already exist on the producers table)
- When preview is triggered, do a quick Supabase query for the latest `payment_reports` row for that producer to get `project_name`, `report_id`, and `invoice_date`

### What Will NOT Change
- No layout or CSS changes to existing components
- No schema changes
- No edge function changes
- No new files created
- The `EmailPreview.tsx` component on the sitemap page is untouched
- The actual send logic remains identical

### Technical Details
- Template components are imported from `../../../supabase/functions/send-email/_templates/` (same pattern as `EmailPreview.tsx`)
- The `buildTemplateData` function logic is duplicated client-side (only for preview rendering -- the edge function still builds its own data server-side for the actual send)
- Preview container uses existing Card, Badge, and Button components
- Only the templates that are commonly sent manually need full preview support; others can fall back to showing the template name and data as JSON

### Verification
1. Go to /admin, expand Producer Notification Emails
2. Select "Initial Liability Notification" template
3. Select Serena de Comarmond as producer
4. Click "Preview Email" -- should see the full rendered email with her real data (name, $1,400, project "Cheaters", 168 days overdue)
5. Click "Confirm & Send" to actually send
6. Or click "Back to Edit" to return to form
