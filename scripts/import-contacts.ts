/**
 * Script to import legacy contacts via edge function
 * Run with: npx tsx scripts/import-contacts.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://blpbeopmdfahiosglomx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscGJlb3BtZGZhaGlvc2dsb214Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjQ0MDksImV4cCI6MjA3NTM0MDQwOX0.ItjgY5Nf68sDE6UJwB6IYH7YWp13C-9JaZ20mSEyx78';
const USER_ID = '8cbf9f5c-6e68-4df9-aa52-1a176b16f7b7'; // Admin user
const BATCH_SIZE = 100;

async function importContacts() {
  // Read the JSON file
  const jsonPath = path.resolve(__dirname, '../tmp/combined_contacts_raw.json');
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const contacts = JSON.parse(jsonContent);

  console.log(`Total contacts to import: ${contacts.length}`);

  const totalBatches = Math.ceil(contacts.length / BATCH_SIZE);
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const batch = contacts.slice(i, i + BATCH_SIZE);

    console.log(`Processing batch ${batchNumber}/${totalBatches}...`);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/import-legacy-contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          contacts: batch,
          user_id: USER_ID,
          batch_number: batchNumber,
          total_batches: totalBatches,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Batch ${batchNumber} failed:`, error);
        continue;
      }

      const result = await response.json();
      totalInserted += result.stats.inserted;
      totalUpdated += result.stats.updated;
      totalSkipped += result.stats.skipped;
      totalErrors += result.stats.errors;

      console.log(`  Inserted: ${result.stats.inserted}, Updated: ${result.stats.updated}, Skipped: ${result.stats.skipped}`);

      if (result.errors?.length > 0) {
        console.log(`  Errors:`, result.errors);
      }
    } catch (err) {
      console.error(`Batch ${batchNumber} error:`, err);
    }
  }

  console.log('\n=== IMPORT COMPLETE ===');
  console.log(`Total Inserted: ${totalInserted}`);
  console.log(`Total Updated: ${totalUpdated}`);
  console.log(`Total Skipped: ${totalSkipped}`);
  console.log(`Total Errors: ${totalErrors}`);
}

importContacts().catch(console.error);
