

# Fix Call Sheet Parser Accuracy

## Problem
The parser is significantly less accurate than ChatGPT/Claude because of architectural constraints, not prompt quality. The AI models being used are equally capable, but the pipeline around them degrades their output.

## Root Causes (ranked by impact)

### 1. Single-page screenshot (HIGHEST IMPACT)
Firecrawl returns only one screenshot (page 1). Multi-page call sheets lose all visual context for pages 2+. The AI falls back to garbled `unpdf` text for those pages.

### 2. Anchor leash is too tight
The system extracts phones/emails deterministically from `unpdf` text, then forbids the AI from outputting anything not in that list. But `unpdf` regularly misses or garbles phone numbers in complex table layouts. The AI sees the correct data in the screenshot but is not allowed to use it.

### 3. GPT-5.2 correction pass drops valid contacts
The post-validation filter requires every contact to have a name, contact info (email or phone), AND at least one role. Contacts with a name and phone but no recognized role are silently deleted.

### 4. Text truncation
The multimodal path only sends 10,000 characters of supplemental text. The text-only path caps at 50,000. Dense call sheets can exceed these limits.

## Proposed Fix (single edge function change)

### Change 1: Multi-page screenshots via Firecrawl
Replace the single Firecrawl `/v1/scrape` call with per-page screenshot requests, or switch to using the PDF bytes directly as a file upload to the AI model (Gemini and GPT both accept PDF files natively now). This gives the AI full visual context for every page.

### Change 2: Relax anchor constraint to "prefer, don't enforce"
Change the prompt and post-processing so anchors are used for *validation scoring* rather than hard filtering. If the AI returns a phone number that is NOT in the anchor list but IS clearly visible in the screenshot, keep it but flag it with lower confidence instead of deleting it.

### Change 3: Fix the zombie filter
Remove the requirement that contacts must have roles to survive. The filter should only drop contacts that have no name AND no contact info. A contact with a name and a phone number is valid even without a labeled role.

### Change 4: Send full text (up to model context limit)
Increase the text hint from 10,000 to 30,000 chars for multimodal, and from 50,000 to 100,000 for text-only. Modern models handle this easily.

### Change 5: Consider removing the triple-pass pipeline
The escalation + correction passes add latency and mutation risk. An alternative: run a single call with the strongest available model (GPT-5 or Gemini 2.5 Pro) and skip escalation entirely. This mirrors what ChatGPT does: one pass, full context, best model.

## Files Changed
- `supabase/functions/parse-call-sheet/index.ts` (1 file only)

## What Will NOT Change
- No frontend changes
- No schema changes
- No new files
- No changes to the review UI, save flow, or any other edge function

## Verification Steps
1. Pick 3 call sheets that parsed poorly before
2. Re-queue them for parsing
3. Compare contact count and accuracy against a manual ChatGPT parse of the same PDFs
4. Check edge function logs for the new metrics

## Risks
- Relaxing the anchor constraint could slightly increase hallucinated phone numbers (mitigated by confidence scoring)
- Using a stronger model for every parse increases AI credit usage
- Sending full PDFs directly to the model increases token consumption

## Found, Not Fixed
- Firecrawl API may not support per-page screenshots natively; may need to switch to direct PDF upload to AI models instead
- The `unpdf` library itself has known issues with complex table layouts; long-term, a better PDF text extractor could help

