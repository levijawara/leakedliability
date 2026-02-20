

## Add Production Company Reference List and Dual-Query Company Search

### Goal
When a user searches via the "Production company name" box on the homepage, the system should search **two sources**:
1. A new reference table of ~200 known production company names (the list you provided)
2. Producers on the leaderboard who have **active debt** and a matching company name

Results from both are merged and displayed. If a company fuzzy-matches one with active debt, it is revealed to the user.

### Current State
- The `public_producer_search` view has a `company_name` column (mapped from `producers.company`).
- The `producers` table also has `sub_name` which stores production company names set by the HoldThatL Generator.
- Currently, company search only does `ilike` on `public_producer_search.company_name`.
- Active-debt companies in the DB right now: "Culture Creative" (via `company`), "Culture Collective Agency" and "Sonderhouse Productions" (via `sub_name`).

### Plan

**Step 1: Create `production_companies` reference table** (migration)
- Columns: `id` (UUID PK), `name` (TEXT UNIQUE NOT NULL), `created_at` (TIMESTAMPTZ)
- RLS: public read access (for search), admin-only write
- Seed the ~200 company names from your list, skipping duplicates

**Step 2: Update the `public_producer_search` view** (migration)
- No change needed -- it already exposes `company_name` from `producers.company`

**Step 3: Update `ProducerSearchAutocomplete.tsx`** (1 file, ~30 lines)
- Modify `handleCompanySearch` to run **two parallel queries**:
  - Query A: `production_companies` table -- `ilike` on `name`
  - Query B: `public_producer_search` view -- `ilike` on `company_name`, plus a separate query checking `producers.sub_name` where `total_amount_owed > 0`
- Merge and deduplicate results
- For companies with active debt, show them prominently in the results dropdown (same clean format -- name only, no badges since this is homepage)

### Technical Details

**Migration SQL** (simplified):
```sql
CREATE TABLE production_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE production_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON production_companies FOR SELECT USING (true);
CREATE POLICY "Admin write" ON production_companies FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO production_companies (name) VALUES
  ('Drive International Agency'),
  ('Vision Bank'),
  ... (all ~200 names, ON CONFLICT DO NOTHING)
```

**Search logic** in `handleCompanySearch`:
1. Query `production_companies` where `name ILIKE '%term%'` (reference matches)
2. Query `public_producer_search` where `company_name ILIKE '%term%'` (existing producer company matches)
3. Query `producers` where `sub_name ILIKE '%term%' AND total_amount_owed > 0` (active debt by sub_name)
4. Merge results: producers with active debt appear as actionable results; reference-only companies appear as informational matches
5. Deduplicate by normalized company name

### What Will NOT Change
- No UI layout changes (homepage stays as-is)
- No changes to leaderboard or profile_claim search
- No changes to search logging or admin notification logic
- Producer name search path is untouched
- No new files beyond the migration

### Files Touched
1. **Migration** (new): Create `production_companies` table + seed data
2. **`src/components/ProducerSearchAutocomplete.tsx`**: Update company search logic (~30 lines)

### Verification
1. Search "FYM" in production company box -- should show "FYM Agency" and "FYM" from reference list
2. Search "Culture" -- should show "Culture Creative" (active debt producer) and "Culture Collective Agency" (active debt via sub_name)
3. Search "Snapchat" -- should show reference match even if no active debt
4. Leaderboard search unchanged
