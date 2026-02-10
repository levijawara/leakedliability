

# GPT-5.2 Final Correction Pass (with Chat's Guardrails)

## What this does
Adds a single GPT-5.2 API call as the final correction pass in `supabase/functions/parse-call-sheet/index.ts`, sitting between Step 7 (sanitization) and the database write. GPT-5.2 receives the raw extracted text and the structured JSON, and returns a corrected version. This replaces the need for endless rule-based fixes.

## Changes

### File: `supabase/functions/parse-call-sheet/index.ts` (1 file, ~80 lines added)

**a) Add `correctWithGPT52` function (~65 lines, after `handleAIResponse` around line 1162)**

This function sends the raw text + parsed contacts to `openai/gpt-5.2` via the Lovable AI gateway using tool calling for structured output. The system prompt includes all of Chat's guardrails:

```
System prompt rules:
1. Fix OCR-garbled email domains (Levenshtein distance <= 2 from gmail.com, icloud.com, yahoo.com, outlook.com, hotmail.com only). Never guess a company domain from context.
2. Reject truncated emails (ending in "..." or missing TLD)
3. Correct obvious name misspellings ONLY if the raw text explicitly contains the correct spelling
4. Validate roles/departments against what appears in the raw text
5. Merge duplicates ONLY if BOTH email AND phone match, or the raw text clearly identifies them as the same person
6. Do NOT invent data. If you cannot confidently fix something, leave it unchanged.
7. Do NOT remove contacts. Only correct or merge them.
8. Preserve phone numbers exactly as provided.
9. Do NOT expand partial names or initials into full names unless the raw text explicitly contains that exact full name.
10. Never rewrite, reformat, normalize, or add country codes to phone numbers. Return them exactly as they appear in the input JSON.
11. If a contact does not appear in the raw text provided, do not modify it.
```

On failure (rate limit, timeout, bad response), falls back to the original `finalContacts` with a warning log. The parse always succeeds.

**b) Add post-response validation (~10 lines, inside `correctWithGPT52`)**

After receiving the tool response, validate every contact has:
- A non-empty `name`
- At least one email OR one phone
- A non-empty `roles` array

Drop any "zombie" contacts that fail validation. Log dropped count.

**c) Insert the correction call (between lines 780 and 782)**

After `finalContacts` is computed and before `parseTiming`:

```typescript
const correctionStart = Date.now();
const correctedContacts = await correctWithGPT52(bestText, finalContacts, lovableApiKey);
logAction(`GPT-5.2 correction: ${correctedContacts.length} contacts (was ${finalContacts.length})`, correctionStart);
```

Then use `correctedContacts` instead of `finalContacts` in the database update and all subsequent logic.

**d) Update `parseTiming` metadata (line 784)**

Add `gpt52_correction: true` to the timing object so you can track which sheets went through the correction pass.

## What will NOT change
- No frontend/UI changes
- No schema changes
- No new files created
- No changes to extraction, verification, escalation, or anchor leash logic
- The Levenshtein email correction (just added) stays as a first-pass filter
- Existing parsed call sheets are not retroactively corrected
- Phone extraction is untouched

## Verification
1. Re-parse the LAFC call sheet that produced garbled emails
2. Check logs for `[parse-call-sheet] GPT-5.2 correction:` entries
3. Confirm OCR-damaged emails are corrected, legitimate company domains preserved
4. Confirm no contacts are dropped (count before == count after, minus any merges)
5. Confirm phone numbers are returned exactly as input (no reformatting)
6. Confirm partial names like "J. Micah F." are NOT expanded
7. Test fallback: temporarily use a bad API key and verify the parse still completes with original data

## Risks
- Low: additive-only, fallback on failure, no schema changes
- Adds 2-5 seconds to parse time (acceptable for background processing)
- Rollback: remove `correctWithGPT52` and its single call site
