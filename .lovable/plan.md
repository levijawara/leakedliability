

# Import 439 Claude-Parsed Call Sheet JSONs

## What This Does
Creates a single edge function that accepts a batch of Claude Code's extracted JSON files, transforms them to match the database format, and updates the corresponding `global_call_sheets` records so they show as "parsed" with full contact data -- ready for review in the existing ParseReview UI.

## Data Transformation

Claude's format (per contact):
```text
{ department: "PRODUCTION", role: "Gaffer", name: "Dante Talano", phone: "850.814.3396", email: "dantetalano28@gmail.com", call_time: "12:00 PM" }
```

Database format (per contact in `parsed_contacts` JSONB):
```text
{ name: "Dante Talano", roles: ["Gaffer"], departments: ["PRODUCTION"], phones: ["850.814.3396"], emails: ["dantetalano28@gmail.com"], confidence: 1.0, needs_review: false, ig_handle: null }
```

The function will:
- Convert singular `phone`/`email`/`role`/`department` to arrays
- Filter out contacts where `name` is clearly a role label (e.g., "VIDEO", "Photographer", "Steadi Op") by checking if the name has no spaces and matches common role keywords -- but flag them for review rather than dropping them
- Set confidence to 1.0 (human-verified extraction)
- Extract `production_info.date` into `parsed_date`
- Extract `production_info.production_name` into `project_title`

## Matching Strategy
Match Claude's `source_file` field against `original_file_name` in `global_call_sheets`. The filenames are "pretty much exactly the same" per your description, so we'll normalize both (lowercase, trim whitespace, normalize colons/slashes) before comparing.

## Edge Function: `import-parsed-contacts`

**Input** (POST body): An array of Claude JSON objects, sent in batches.

**Per record, the function will:**
1. Normalize `source_file` and find the matching `global_call_sheets` row by `original_file_name`
2. Transform `crew[]` contacts to the `parsed_contacts` JSONB format
3. Update the row: set `parsed_contacts`, `contacts_extracted`, `status = 'parsed'`, `parsed_date`
4. Log match/miss stats

**Auth:** Admin-only (same pattern as other admin edge functions).

## How You'll Use It
You can upload the 439 JSON files in batches using a simple script or even paste them into the admin panel. The function accepts up to 50 files per request to stay within edge function timeouts.

Alternatively, I can add a small admin UI button on the Call Sheet Manager page that lets you drag-drop the JSON files and auto-imports them -- but that would be a frontend change, so I'll only do that if you want it.

## Files Changed
- `supabase/functions/import-parsed-contacts/index.ts` (NEW file -- 1 file only)
- `supabase/config.toml` (add function config entry)

## What Will NOT Change
- No frontend changes
- No schema changes  
- No modifications to existing edge functions
- ParseReview UI will automatically work since it reads `parsed_contacts` from the same table

## Verification Steps
1. Deploy the edge function
2. Send one test JSON (the ALO x Jisoo file you just shared) via curl
3. Confirm the matching `global_call_sheets` row now has `status = 'parsed'` and correct `parsed_contacts`
4. Open ParseReview for that call sheet and verify contacts display correctly
5. Then batch-send the remaining 438 files

## Risks
- Filename mismatches: if Claude's `source_file` doesn't match `original_file_name` exactly, those records will be skipped and reported in the response so you can fix them manually
- No data loss: only updates rows that currently have `status != 'parsed'` or have empty `parsed_contacts`, unless you pass a `force: true` flag

## Technical Notes
- The function will NOT create new `global_call_sheets` rows -- it only updates existing ones
- Contacts where `name` is null/empty will be dropped
- The `call_time` field from Claude's output will be stored in a metadata field but won't break anything if ignored
