

## Fix Build Error and Remove Placeholder Text

### 1. Database Migration (resolves build error)
Add the two missing columns to `user_call_sheets`:

```sql
ALTER TABLE public.user_call_sheets
  ADD COLUMN IF NOT EXISTS project_type TEXT,
  ADD COLUMN IF NOT EXISTS project_subject TEXT;
```

This will update the auto-generated Supabase types so the `.update({ project_type, project_subject })` call in `CallSheetUploader.tsx` passes type checking.

### 2. Remove "e.g." placeholder (1 line change)
In `src/components/callsheets/ProjectDetailsModal.tsx`, line 113, change:

```
placeholder="e.g. Drake, Target, StarTalk, Kai Cenat"
```
to:
```
placeholder="Drake, Target, StarTalk, Kai Cenat"
```

### What will NOT change
- No other files touched
- No schema removals or renames
- No frontend layout or styling changes

### Verification
- Build errors resolve (the `project_type` TS error disappears)
- Placeholder text no longer shows "e.g."

