

# Widen Email Body Container for All Email Templates

## Problem
The screenshot (image-205) shows Randy's "Report Verified" email still rendering in a narrow, center-condensed column. That email comes from the shared template system (not the broadcast system we already fixed). All 28 email templates import their styles from a single shared file: `_shared/styles.ts`. That file's `container` style lacks `maxWidth: '100%'` and its `text` style lacks `textAlign: 'left'`, so the `@react-email/components` Container defaults to 580px wide.

## Solution
Update the shared styles file with the same two properties we added to the broadcast email. Since all 28 templates import from this one file, a single edit fixes every email notification system-wide.

## Changes

### File: `supabase/functions/send-email/_templates/_shared/styles.ts` (1 file, 2 lines added)

**1. Add `maxWidth: '100%'` to the `container` style (line 9-15)**

Before:
```typescript
export const container = {
  paddingLeft: '12px',
  paddingRight: '12px',
  margin: '0 auto',
  paddingTop: '40px',
  paddingBottom: '40px',
};
```

After:
```typescript
export const container = {
  paddingLeft: '12px',
  paddingRight: '12px',
  margin: '0 auto',
  maxWidth: '100%',
  paddingTop: '40px',
  paddingBottom: '40px',
};
```

**2. Add `textAlign: 'left'` to the `text` style (line 25-30)**

Before:
```typescript
export const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  fontFamily: 'IBM Plex Mono, monospace',
};
```

After:
```typescript
export const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  fontFamily: 'IBM Plex Mono, monospace',
};
```

## Templates that will be fixed (all 28)
crew-report-confirmation, producer-payment-confirmation, dispute-submission, counter-dispute-submission, producer-submission, admin-notification, crew-report-verified, crew-report-rejected, welcome, crew-report-payment-confirmed, producer-report-notification, vendor-report-confirmation, vendor-report-verified, vendor-report-rejected, admin-created-account, liability-notification, liability-loop-detected, email-verification, password-reset, liability-accepted, dispute-evidence-round-started, dispute-additional-info-required, dispute-resolved-paid, dispute-resolved-mutual, dispute-closed-unresolved, subscription-payment-failed, subscription-canceled, custom-broadcast

## What will NOT change
- No frontend/UI changes
- No schema changes
- No new files created
- The broadcast email's inlined styles are already fixed (untouched)
- No edge function logic changes
- No template content or structure changes

## Verification
1. Trigger any email (e.g., approve a test submission, or use the manual email sender)
2. Open the received email in Gmail
3. Confirm: paragraphs flow full-width, left-aligned, like a normal email

## Risks
- None -- this adds two CSS properties to a shared style object
- Rollback: remove the two added lines from `_shared/styles.ts`
