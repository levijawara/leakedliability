#!/usr/bin/env tsx
/**
 * Run the backfill_complete action to save unsaved contacts from complete call sheets.
 * Fixes "5 unsaved contacts", "9 unsaved contacts" etc. in the Generate Credits modal.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=xxx tsx scripts/run-backfill-contacts.ts
 *   # Or add ADMIN_EMAIL/ADMIN_PASSWORD to .env
 *
 * Environment variables:
 *   - VITE_SUPABASE_URL or SUPABASE_URL
 *   - VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY (anon key for auth)
 *   - ADMIN_EMAIL (admin user email)
 *   - ADMIN_PASSWORD (admin user password)
 *
 * The edge function may timeout with many sheets. Run multiple times — it's idempotent.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL/SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY/SUPABASE_ANON_KEY');
  process.exit(1);
}

if (!adminEmail || !adminPassword) {
  console.error('Missing ADMIN_EMAIL and ADMIN_PASSWORD. Sign in as admin to run backfill.');
  process.exit(1);
}

async function main() {
  const supabase = createClient(url, anonKey);

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (signInError) {
    console.error('Sign-in failed:', signInError.message);
    process.exit(1);
  }

  if (!signInData.session) {
    console.error('No session returned');
    process.exit(1);
  }

  console.log('Signed in as admin. Running backfill_complete...');

  const { data, error } = await supabase.functions.invoke('import-parsed-contacts', {
    body: { action: 'backfill_complete' },
  });

  if (error) {
    console.error('Backfill error:', error.message);
    if (error.message?.includes('timeout') || error.message?.includes('504')) {
      console.log('\nPartial run (timeout). Run again to continue — idempotent.');
    }
    process.exit(1);
  }

  console.log('Result:', JSON.stringify(data, null, 2));
  if (data?.sheets_backfilled) {
    console.log(`\nBackfilled ${data.sheets_backfilled} sheets. Saved: ${data.contacts_saved || 0}, Merged: ${data.contacts_merged || 0}`);
    console.log('Run again if you still see unsaved contacts.');
  } else {
    console.log('\nAll complete sheets already have contacts saved.');
  }
}

main();
