

# Fix: Parse Human-Readable Dates in import-parsed-contacts

## Problem
The `parsed_date` column in `global_call_sheets` is a `date` type, but Claude's JSON files contain human-readable date strings like `"MARCH 15th, 2024"` which PostgreSQL rejects with error `22007`.

## Solution
Add a date-parsing helper in the edge function that normalizes these strings into ISO date format (`YYYY-MM-DD`) before writing to the database. If parsing fails, store `null` instead of crashing the update.

## What Changes
- **1 file**: `supabase/functions/import-parsed-contacts/index.ts`
- Add a `tryParseDate(raw: string): string | null` helper that:
  - Strips ordinal suffixes (`st`, `nd`, `rd`, `th`)
  - Attempts `new Date(cleaned)` parsing
  - Returns `YYYY-MM-DD` string on success, `null` on failure
- Replace the direct assignment `parsed_date: parsedDate` with `parsed_date: tryParseDate(parsedDate)`

## What Will NOT Change
- No frontend changes
- No schema changes
- No other edge functions modified

## Verification
- Re-upload the XZIBIT JSON that previously failed
- Confirm the row updates successfully with `parsed_date = '2024-03-15'`
- Confirm other JSONs with unusual date formats gracefully fall back to `null`

