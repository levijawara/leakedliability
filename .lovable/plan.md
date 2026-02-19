

## Skip Search Logging and Email Notifications for Admin Accounts

### Goal
When an admin searches a name (on the leaderboard or homepage), the system should **not** insert a row into `search_logs` and **not** send an email notification. Only non-admin searches trigger these actions.

### Current State
- **Leaderboard (`src/pages/Leaderboard.tsx`)**: Already has `isAdmin` state via `has_role` RPC. Currently skips the email notification for hardcoded admin emails, but still inserts into `search_logs` for everyone.
- **Homepage autocomplete (`src/components/ProducerSearchAutocomplete.tsx`)**: Has no admin awareness. Uses hardcoded `ADMIN_EMAILS` list to skip email only. Still inserts into `search_logs` for everyone.

### Changes (2 files, ~20 lines)

**File 1: `src/pages/Leaderboard.tsx`**
- In the search logging `useEffect` (line ~304), wrap the entire block (both `search_logs` insert and `send-email` call) in an `if (!isAdmin)` guard.
- Remove the now-redundant hardcoded `ADMIN_EMAILS` check since the `isAdmin` state (from `has_role` RPC) is the proper gate.
- Add `isAdmin` to the `useEffect` dependency array.

**File 2: `src/components/ProducerSearchAutocomplete.tsx`**
- Add an `isAdmin` state and check it on mount using `supabase.rpc('has_role', ...)`.
- In the debounced search logging callback (line ~140), wrap the entire block (both insert and email) in `if (!isAdmin)`.
- In the `handleSelect` function (line ~192), also guard the `search_logs` insert with `if (!isAdmin)`.
- Remove the hardcoded `ADMIN_EMAILS` list.

### What Will NOT Change
- No schema changes
- No new files
- No UI or layout changes
- Non-admin search behavior is completely unchanged
- The `get_top_searches` RPC and Search Insights dashboard are unaffected

### Verification
1. Log in as admin (Levi's account) and search a name on the leaderboard -- confirm no new row in `search_logs` and no email received.
2. Log in as a non-admin and search a name -- confirm the row is inserted and the email is sent as before.
3. Search from the homepage (unauthenticated) -- confirm the row is inserted and the email is sent as before.

