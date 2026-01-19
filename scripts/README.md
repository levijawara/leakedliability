# Crew Contacts Instagram Enrichment Script

This script enriches existing `crew_contacts` records with Instagram handles from `crew_contacts_MASTER_with_ig.json`.

## Prerequisites

1. **Environment Variables**: You need the following environment variables set:
   - `SUPABASE_URL` (or `VITE_SUPABASE_URL`)
   - `SUPABASE_SERVICE_ROLE_KEY` (required to bypass RLS for updates)

2. **JSON File**: The script will look for `crew_contacts_MASTER_with_ig.json` in these locations (in order):
   - `/Users/glendaleexpress/Desktop/crew_contacts_MASTER_with_ig.json`
   - `../crew_contacts_MASTER_with_ig.json` (parent directory)
   - `./data/crew_contacts_MASTER_with_ig.json` (data directory)
   - `./crew_contacts_MASTER_with_ig.json` (current directory)

3. **Dependencies**: Run `npm install` first to install `tsx` (required to run TypeScript files).

## Usage

### Dry Run (Recommended First)

Always run in dry-run mode first to see what would be updated without making changes:

```bash
npm run enrich:ig:dry-run
```

Or manually:

```bash
DRY_RUN=true npm run enrich:ig
```

### Live Run

After reviewing the dry-run output, run for real:

```bash
npm run enrich:ig
```

Or manually:

```bash
npm run enrich:ig
```

## How It Works

1. **Loads JSON File**: Reads `crew_contacts_MASTER_with_ig.json` containing contacts with Instagram handles.

2. **Builds Index**: Fetches all existing contacts from `crew_contacts` table and builds fast lookup indexes by:
   - Normalized phone numbers (10-digit, strips formatting, handles 11-digit numbers starting with 1)
   - Normalized email addresses (lowercase, trimmed)

3. **Matches Contacts**: For each JSON contact:
   - Primary: Match by normalized phone number
   - Fallback: Match by normalized email address (if no phone match)
   - Skips if Instagram handle is empty

4. **Updates Instagram Handles**: For each match:
   - Only updates if `ig_handle` column is currently `NULL`, empty, or whitespace-only
   - Never overwrites existing Instagram handles
   - Does NOT modify any other fields

5. **Logging**: Provides detailed statistics and examples of updates performed.

## Matching Rules

### Phone Normalization
- Strips all non-digit characters
- If 11 digits and starts with `1`, treats as 10 digits (drops leading `1`)
- Both `3105551234` and `13105551234` match the same contact
- Must be exactly 10 digits after normalization

### Email Normalization
- Splits on `;` or `,`
- Trims whitespace
- Lowercases for case-insensitive matching
- Filters out empty strings

### Update Safety
- Only updates `ig_handle` column if it's currently empty/null
- Never overwrites existing handles
- Idempotent: safe to run multiple times
- Deduplicates matches (same contact won't be updated twice per run)

## Output

The script provides:
- Total contacts processed
- Number of matches found (by phone vs email)
- Number of updates performed
- Number skipped (existing IG handles, no matches)
- Example updates (first 10) showing before/after

## Safety Features

- **Dry-run mode**: Test without making changes
- **Idempotent**: Safe to run multiple times
- **No overwrites**: Never touches existing Instagram handles
- **Deduplication**: Handles duplicate matches gracefully
- **Error handling**: Continues processing even if individual updates fail

## Troubleshooting

### "Failed to find JSON file"
- Ensure the JSON file exists in one of the search paths
- Check file permissions

### "SUPABASE_SERVICE_ROLE_KEY environment variable is required"
- Set the service role key (not the anon key)
- Service role key is needed to bypass RLS for updates

### "Failed to fetch contacts"
- Check Supabase connection and credentials
- Verify the `crew_contacts` table exists
