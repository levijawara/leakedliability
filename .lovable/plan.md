

# Fix: Broadcast Email Text Wrapping (Center-Condensed to Natural)

## Problem
The broadcast email body renders in a narrow, center-condensed column (approx 580px wide) because the `Container` component from `@react-email/components` defaults to `max-width: 580px`. Combined with the monospace font (`IBM Plex Mono`), this creates the "poetry-style" paragraph wrapping visible in the H&MUA email (image-198). The Corporate Billing email (image-200) looks natural because it has no artificial width constraint.

## Root Cause
Line 114 of `send-broadcast-email/index.ts`:
```typescript
React.createElement(Container, { style: container }, ...)
```
The `Container` component renders a `<table>` with inline `max-width: 580px`. The local `container` style (lines 24-30) does NOT override this, so the default kicks in.

## Solution
Override the `Container` max-width to `100%` and add explicit `textAlign: 'left'` to the text style. This makes broadcast emails flow like normal Gmail/Outlook emails while keeping the LL header, footer, and overall structure intact.

## Changes

### File: `supabase/functions/send-broadcast-email/index.ts` (1 file, ~4 lines changed)

**1. Widen the container (line 24-30)**

Before:
```typescript
const container = {
  paddingLeft: '12px',
  paddingRight: '12px',
  margin: '0 auto',
  paddingTop: '40px',
  paddingBottom: '40px',
};
```

After:
```typescript
const container = {
  paddingLeft: '12px',
  paddingRight: '12px',
  margin: '0 auto',
  maxWidth: '100%',
  paddingTop: '40px',
  paddingBottom: '40px',
};
```

Setting `maxWidth: '100%'` overrides the `Container` component's default `580px` so text flows to the full width of the email client viewport (just like a normal Gmail-composed email).

**2. Add explicit left-alignment to body text (line 40-45)**

Before:
```typescript
const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  fontFamily: 'IBM Plex Mono, monospace',
};
```

After:
```typescript
const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  fontFamily: 'IBM Plex Mono, monospace',
};
```

This prevents any email client from inheriting or defaulting to center alignment.

---

## What will NOT change
- No frontend/UI changes to the BroadcastEmailSender component
- No schema changes
- No new files created
- The shared `_templates/_shared/styles.ts` is NOT modified (other emails keep their current look)
- Auth, admin check, Resend logic, rate limiting, email logging -- all untouched
- Only the BROADCAST email layout changes; all other email templates remain identical

## Verification
1. Go to Admin > Broadcast Email
2. Enter a test subject, body text with multiple paragraphs, and your own email as recipient
3. Send the test email
4. Open the received email in Gmail
5. Confirm: paragraphs flow full-width, left-aligned, like a normal email -- no narrow center-condensed column

## Risks
- None -- this only changes two inline CSS properties on the broadcast email template
- Other email templates are unaffected (they use the shared styles file, not this inlined copy)
- Rollback: revert `supabase/functions/send-broadcast-email/index.ts` to previous version

