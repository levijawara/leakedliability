

## Clear Production Instances Table

### What will happen
Run `DELETE FROM public.production_instances;` directly against the database to clear all 188 rows.

### What will NOT change
- `user_call_sheets` (user libraries) -- untouched
- `global_call_sheets` (Alexandria/Reservoir) -- untouched
- No code files modified
- No schema changes

### Verification
- After execution, the Project Timeline on `/leaderboard` will show an empty state
- Users' call sheet libraries remain intact

