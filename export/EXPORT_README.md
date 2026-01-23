# Supabase Database Export Package
**Exported: 2026-01-23**
**Project: Leaked Liability™**

## Export Contents

### ✅ INCLUDED IN THIS EXPORT

| File | Description | Status |
|------|-------------|--------|
| `schema.sql` | Complete schema (tables, views, functions, triggers, RLS, indexes) | ✅ Complete |
| `data/core_tables.sql` | Core business data (producers, profiles, payment_reports, submissions) | ✅ Complete |
| `data/config_tables.sql` | Configuration data (pscs_config, leaderboard_config, site_settings) | ✅ Complete |
| `data/contacts_data.sql` | Crew contacts, identity groups, IG master identities | ✅ Complete |
| `data/call_sheets.sql` | Global call sheets, user call sheets | ✅ Complete |
| `data/entitlements.sql` | User roles, entitlements, beta access | ✅ Complete |
| `data/financial.sql` | Payment confirmations, escrow, confirmation pool | ✅ Complete |
| `policies.sql` | All RLS policies extracted separately | ✅ Complete |
| `storage_buckets.json` | Storage bucket definitions | ✅ Complete |
| `supabase/functions/` | Edge functions (already in codebase) | ✅ Already in repo |

### ⚠️ REQUIRES MANUAL EXPORT (NOT ACCESSIBLE VIA SQL)

The following tables are in the `auth` schema and cannot be exported via SQL queries.
You must export these via **Supabase CLI** or **Dashboard**:

| Table | Command |
|-------|---------|
| `auth.users` | `supabase db dump --data-only --table auth.users` |
| `auth.identities` | `supabase db dump --data-only --table auth.identities` |
| `auth.sessions` | `supabase db dump --data-only --table auth.sessions` |
| `auth.refresh_tokens` | `supabase db dump --data-only --table auth.refresh_tokens` |

### Manual Auth Export Instructions

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link to your project:
```bash
supabase login
supabase link --project-ref blpbeopmdfahiosglomx
```

3. Export auth data:
```bash
supabase db dump --data-only --schema auth -f export/auth_data.sql
```

---

## Database Statistics

| Table | Row Count |
|-------|-----------|
| producers | 301 |
| profiles | 20 |
| payment_reports | 12 |
| crew_contacts | 3,592 |
| submissions | 14 |
| user_roles | 1 |
| user_entitlements | 7 |
| global_call_sheets | 439 |
| ig_master_identities | 821 |
| identity_groups | 147 |
| audit_logs | 27,670 |
| email_logs | 350 |
| search_logs | 66 |
| analytics_daily_visitors | 311 |
| past_debts | 9 |
| escrow_payments | 1 |
| ig_usernames | 24 |

---

## Storage Buckets

```json
[
  { "id": "submission-documents", "name": "submission-documents", "public": false },
  { "id": "fafo-results", "name": "fafo-results", "public": true },
  { "id": "call_sheets", "name": "call_sheets", "public": false }
]
```

---

## Import Order (for new Supabase project)

Execute in this order to respect foreign key constraints:

1. `schema.sql` - Creates all tables, views, functions, triggers, indexes
2. `policies.sql` - Creates RLS policies (may already be in schema.sql)
3. `data/config_tables.sql` - Config tables first (no dependencies)
4. `data/core_tables.sql` - Producers, profiles (needed by other tables)
5. `auth_data.sql` - Auth users (manually exported)
6. `data/entitlements.sql` - User roles, entitlements
7. `data/contacts_data.sql` - Crew contacts, identity groups
8. `data/call_sheets.sql` - Call sheet data
9. `data/financial.sql` - Payment confirmations, escrow

---

## Notes

- All UUIDs and IDs are preserved exactly as they exist in production
- All timestamps are preserved
- Foreign key relationships are maintained
- Edge functions are in `supabase/functions/` directory (will auto-deploy)
- Storage bucket policies are included in `policies.sql`

---

## Verification Checklist

After import, verify:
- [ ] All tables created
- [ ] Row counts match expected
- [ ] Auth users can log in
- [ ] RLS policies working correctly
- [ ] Edge functions deployed
- [ ] Storage buckets accessible
