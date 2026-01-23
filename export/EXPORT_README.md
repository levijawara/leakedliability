# Leaked Liability™ — Database Migration Export Package

> **Generated**: 2026-01-23  
> **Status**: Lossless export for backend migration

---

## ⚠️ CRITICAL: Lovable Cloud Limitation

**Supabase CLI commands (`supabase link`, `supabase db dump`) will NOT work** because this project runs on Lovable Cloud, which manages the backend internally. The error you saw:

```
Your account does not have the necessary privileges to access this endpoint
Cannot find project ref. Have you run supabase link?
```

This is expected — Lovable Cloud does not expose direct Supabase CLI access.

### ✅ Alternative: I Can Export Everything

I have full SQL query access to:
- All `public` schema tables
- `auth.users` table (including raw_user_meta_data)
- All storage bucket definitions

Ask me to export any table and I'll generate SQL INSERT statements.

---

## Current Export Status

### ✅ Already Exported

| File | Contents |
|------|----------|
| `../schema.sql` (root) | Full schema: tables, views, functions, triggers, indexes |
| `policies.sql` | All RLS policies for tables and storage |
| `storage_buckets.json` | Storage bucket definitions |
| `data/config_tables.sql` | pscs_config, site_settings, leaderboard_config |
| `data/entitlements.sql` | user_roles, user_entitlements, beta_access_* |
| `data/financial.sql` | past_debts, escrow_payments, confirmation_pool |
| `data/core_tables.sql` | Partial profiles data |

### 📊 Tables Needing Export (by row count)

| Table | Rows | Status |
|-------|------|--------|
| `auth.users` | 20 | ✅ **Accessible** — ask me to export |
| `producers` | 301 | ⏳ Pending — ask me to export |
| `profiles` | 20 | ⏳ Pending (full export) |
| `payment_reports` | 12 | ⏳ Pending |
| `submissions` | 14 | ⏳ Pending |
| `crew_contacts` | 3,592 | ⏳ Needs batch export (500/batch) |
| `ig_master_identities` | 821 | ⏳ Pending |
| `global_call_sheets` | 439 | ⏳ Pending |
| `contact_call_sheets` | 7,744 | ⏳ Needs batch export |
| `audit_logs` | 27,670 | ⚠️ Very large — consider skipping |

### 🔐 Auth Data Status

I CAN access `auth.users` (20 users) with full data:
- `id`, `email`, `created_at`, `last_sign_in_at`
- `raw_user_meta_data` (account_type, legal names, phone_verified, etc.)

To export: Ask me **"Export auth.users to SQL"**

---

## Storage Buckets

```json
[
  { "id": "submission-documents", "name": "submission-documents", "public": false },
  { "id": "fafo-results", "name": "fafo-results", "public": true },
  { "id": "call_sheets", "name": "call_sheets", "public": false }
]
```

**Note:** Storage FILE CONTENTS must be downloaded separately from each bucket.

---

## Import Order (new Supabase project)

1. Create new Supabase project
2. Run `schema.sql` — creates all tables, views, functions, triggers
3. Run `policies.sql` — applies RLS (if not already in schema.sql)
4. Import data in order:
   - `auth.users` (requires service_role key)
   - `producers` (no dependencies)
   - `profiles` (references auth.users via user_id)
   - `payment_reports` (references producers)
   - `submissions` (references payment_reports)
   - `crew_contacts` (references users)
   - Remaining tables...
5. Create storage buckets from `storage_buckets.json`
6. Upload storage files manually

---

## How to Request Data Export

Tell me which tables you need:

```
"Export auth.users to SQL"
"Export producers table"
"Export crew_contacts in 500-row batches"
"Export all remaining tables"
```

I'll generate INSERT statements you can run in the new project.
