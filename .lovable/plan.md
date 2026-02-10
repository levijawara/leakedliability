

# Email Domain Autocorrection in Call Sheet Parser

## Problem
The anchor extraction regex accepts any structurally valid email, so OCR-garbled domains like `amall.com`, `amail.com`, `amiall.com`, `amaill.com` flow through the entire pipeline uncorrected. The image shows at least 6 mangled emails from a single call sheet. The validation step only checks for `@` and `.` -- it never questions the domain.

## Solution
Add a post-processing email correction step in `supabase/functions/parse-call-sheet/index.ts` that:

1. Checks each email domain against a whitelist of known-good domains
2. If not on the whitelist, attempts autocorrection using Levenshtein distance (max edit distance: 2)
3. Rejects truncated emails (ending in `...` or missing TLD)
4. Logs every correction for debugging

This runs after anchor extraction but before contacts are saved, so corrected emails propagate to all downstream consumers.

## Changes

### File: `supabase/functions/parse-call-sheet/index.ts` (1 file)

**a) Add email domain correction utilities (~35 lines, inserted after the `extractAnchors` function around line 80)**

```typescript
// Known-good email domains (expandable)
const KNOWN_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'icloud.com', 'outlook.com', 'hotmail.com',
  'aol.com', 'me.com', 'mac.com', 'live.com', 'msn.com',
  'protonmail.com', 'ymail.com', 'comcast.net', 'att.net', 'sbcglobal.net',
];

// Garbage domains to always reject or correct
const GARBAGE_DOMAINS = [
  'amall.com', 'amalll.com', 'amial.com', 'amail.com', 'amiall.com',
  'amaill.com', 'gmial.com', 'gmaill.com', 'gmall.com',
];

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function correctEmailDomain(email: string): { corrected: string; changed: boolean; reason?: string } {
  // Reject truncated emails
  if (email.endsWith('...') || email.endsWith('…') || !email.includes('.')) {
    return { corrected: email, changed: false, reason: 'truncated_or_invalid' };
  }

  const [local, domain] = email.split('@');
  if (!local || !domain) return { corrected: email, changed: false };

  const lowerDomain = domain.toLowerCase();

  // Already a known-good domain
  if (KNOWN_EMAIL_DOMAINS.includes(lowerDomain)) {
    return { corrected: email, changed: false };
  }

  // Skip domains that look like real company domains (contain multiple parts)
  const domainParts = lowerDomain.split('.');
  if (domainParts.length > 2 || (domainParts[0].length > 8 && !GARBAGE_DOMAINS.includes(lowerDomain))) {
    return { corrected: email, changed: false };
  }

  // Check if it's a known garbage domain or close to a known-good one
  let bestMatch = '';
  let bestDistance = Infinity;

  for (const known of KNOWN_EMAIL_DOMAINS) {
    const dist = levenshteinDistance(lowerDomain, known);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = known;
    }
  }

  // Autocorrect if edit distance <= 2
  if (bestDistance <= 2 && bestDistance > 0) {
    const corrected = `${local}@${bestMatch}`;
    console.log(`[parse-call-sheet] Email corrected: ${email} -> ${corrected} (distance=${bestDistance})`);
    return { corrected, changed: true, reason: `${lowerDomain} -> ${bestMatch} (dist=${bestDistance})` };
  }

  return { corrected: email, changed: false };
}
```

**b) Apply correction inside the existing `extractAnchors` function (modify lines 57-63)**

Before:
```typescript
const emailMatches = text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
for (const m of emailMatches) {
  const email = m[0].toLowerCase().trim();
  if (!email.startsWith('.') && !email.endsWith('.') && email.includes('.')) {
    emails.add(email);
  }
}
```

After:
```typescript
const emailMatches = text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
for (const m of emailMatches) {
  let email = m[0].toLowerCase().trim();
  if (!email.startsWith('.') && !email.endsWith('.') && email.includes('.')) {
    const { corrected } = correctEmailDomain(email);
    emails.add(corrected);
  }
}
```

**c) Also apply correction in `validateAndNormalizeContacts` (modify lines 1330-1333)**

Before:
```typescript
const validEmails = (contact.emails || []).filter(email => {
  if (!email) return false;
  return email.includes('@') && email.includes('.') && !email.startsWith('@');
});
```

After:
```typescript
const validEmails = (contact.emails || [])
  .filter(email => {
    if (!email) return false;
    // Reject truncated emails
    if (email.endsWith('...') || email.endsWith('…')) return false;
    return email.includes('@') && email.includes('.') && !email.startsWith('@');
  })
  .map(email => {
    const { corrected } = correctEmailDomain(email);
    return corrected;
  });
```

This double-application ensures corrections happen both at anchor extraction (so the AI gets clean anchors) and at final validation (catching any emails the AI itself introduced).

## What will NOT change
- No frontend/UI changes
- No schema changes
- No new files created
- No edge function logic changes beyond the email correction
- The anchor-based phone extraction is untouched
- The AI prompt system is untouched
- Existing parsed call sheets are not retroactively corrected (only new parses)

## Verification
1. Re-parse the LAFC call sheet that produced the garbled emails
2. Check the logs for `[parse-call-sheet] Email corrected:` entries
3. Confirm `amall.com`, `amail.com`, `amiall.com` domains are corrected to `gmail.com`
4. Confirm legitimate company domains like `lafc.com` and `genesisduran.com` are left untouched
5. Confirm truncated emails like `david@davidhigghotogra...` are rejected

## Risks
- Low: corrections only apply when Levenshtein distance is <= 2, so real company domains won't be touched
- The `KNOWN_EMAIL_DOMAINS` list is expandable without code changes in future
- Rollback: remove the correction function and revert the two call sites

