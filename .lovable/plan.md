

## Fix Build Error: Add `crew_size` Column to `production_instances`

### Root Cause
The Supabase types file reflects the actual database schema, which does not yet have a `crew_size` column on `production_instances`. The code in `Leaderboard.tsx` queries for `crew_size`, causing a `SelectQueryError` that cascades to every field access.

### Fix (1 step, 0 code files changed)
1. **Run database migration** to add the missing column:
   ```sql
   ALTER TABLE public.production_instances
     ADD COLUMN IF NOT EXISTS crew_size INTEGER;
   ```
   Once applied, the auto-generated Supabase types will update and all 24 type errors resolve.

### What will NOT change
- No code files modified
- No frontend changes
- No other tables affected

### Verification
- Build errors disappear (all 24 TS errors trace back to the single missing column)
- `/leaderboard` Project Timeline table renders without errors
