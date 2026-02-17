

## Fix: Admin Payment Confirmation Failing

### Root Cause

The `admin-confirm-payment` edge function inserts `confirmation_type: 'admin_confirmation'` into the `payment_confirmations` table, but the database enum `confirmation_type_enum` only allows these values:

- `crew_confirmation`
- `producer_documentation`
- `admin_verification`

### Fix (1 file, 1 line)

**File:** `supabase/functions/admin-confirm-payment/index.ts`

Change line 72:
```
confirmation_type: 'admin_confirmation',
```
to:
```
confirmation_type: 'admin_verification',
```

### What will NOT change
- No schema changes
- No frontend changes
- No other files touched

### Verification
- After deploying, retry confirming Report ID CR-20260206-78651 as paid
- Expected: success, payment confirmation recorded, status updated to paid

