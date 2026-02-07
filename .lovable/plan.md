

# Fix: "Unknown Producer" — Serena de Comarmond Not Showing on Leaderboard

## Problem
Randy's verified crew report created a producer record named **"Unknown Producer"** instead of **"Serena de Comarmond"**. The leaderboard correctly shows the producer — but under the wrong name.

## Root Cause
The submission form (`CrewReportForm.tsx`) stores producer info as **flat top-level fields**:

```text
form_data = {
  "producer_name": "Serena",           // flat string
  "producer_last_name": "De Comarmond", // flat string
  "producer_company": "Elysium Media",  // flat string
  "producer_email": "serena@elysiummedia.tv"
}
```

But the Admin approval code (`Admin.tsx` lines 621-623) expects `producer_name` to be an **object** with sub-properties:

```typescript
// What Admin.tsx expects (wrong):
formData.producer_name?.company     // undefined — it's a string "Serena"
formData.producer_name?.firstName   // undefined
formData.producer_name?.lastName    // undefined
// Result: falls through to 'Unknown Producer'
```

This mismatch causes every crew report to create a producer named "Unknown Producer."

## Solution
Update the producer name extraction logic in `Admin.tsx` to handle both the flat-field format (what the form actually sends) and the nested-object format (legacy/defensive). This pattern appears in 4 places in the file.

## Changes

### File: `src/pages/Admin.tsx` (1 file, ~4 locations, same fix each time)

Replace the producer name extraction at lines 621-623, 790-792, 975-977, and 1006-1008 with logic that checks both formats:

Before (all 4 locations):
```typescript
const producerName = formData.producer_name?.company || 
  `${formData.producer_name?.firstName || ''} ${formData.producer_name?.lastName || ''}`.trim() ||
  'Unknown Producer';
```

After:
```typescript
const producerName = (
  // Format 1: flat fields from CrewReportForm (current)
  (typeof formData.producer_name === 'string' && formData.producer_name)
    ? (formData.producer_company && formData.reporting_type === 'production_company'
        ? formData.producer_company
        : `${formData.producer_name} ${formData.producer_last_name || ''}`.trim())
    // Format 2: nested object (legacy/defensive)
    : formData.producer_name?.company || 
      `${formData.producer_name?.firstName || ''} ${formData.producer_name?.lastName || ''}`.trim()
) || 'Unknown Producer';
```

This produces:
- For Randy's submission: `"Serena De Comarmond"` (correct)
- For production company reports: the company name (correct)
- For any legacy nested-object format: still works (backward compatible)

### Database: Fix the existing "Unknown Producer" record

A one-time data fix is also needed to rename the existing producer record from "Unknown Producer" to "Serena de Comarmond" and set the company to "Elysium Media". This will be done via a migration:

```sql
UPDATE producers 
SET name = 'Serena de Comarmond', 
    company = 'Elysium Media',
    sub_name = 'Elysium Media'
WHERE id = '329fee85-25dd-4e14-882e-48b4b592f6ac' 
  AND name = 'Unknown Producer';
```

## What will NOT change
- No frontend/UI layout changes
- No schema changes (just a data update)
- No new files created
- The submission form itself is untouched
- No edge functions modified
- The #HoldThatL generator is unrelated to this issue

## Verification
1. After applying: check the leaderboard — "Serena de Comarmond" with sub-name "Elysium Media" should appear where "Unknown Producer" was
2. Submit a new test crew report with a different producer name
3. Verify and approve it in Admin
4. Confirm the new producer appears on the leaderboard with the correct name (not "Unknown Producer")

## Risks
- Low: the name extraction change handles both data formats defensively
- The data fix targets a single record by UUID + name guard, so no accidental updates
- Rollback: revert `Admin.tsx` and rename the producer back to "Unknown Producer"
