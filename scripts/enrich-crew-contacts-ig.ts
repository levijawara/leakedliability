#!/usr/bin/env tsx
/**
 * Crew Contacts Instagram Enrichment Script
 * 
 * This script enriches existing crew_contacts records with Instagram handles
 * from crew_contacts_MASTER_with_ig.json.
 * 
 * Usage:
 *   DRY_RUN=true tsx scripts/enrich-crew-contacts-ig.ts
 *   tsx scripts/enrich-crew-contacts-ig.ts
 * 
 * Environment variables required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (needed to bypass RLS)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Database table & columns
const TABLE_NAME = 'crew_contacts';
const COLUMN_ID = 'id';                    // Primary key (UUID)
const COLUMN_PHONES = 'phones';            // Phone array (string[])
const COLUMN_EMAILS = 'emails';            // Email array (string[])
const COLUMN_IG_HANDLE = 'ig_handle';      // Instagram handle (string | null)
const COLUMN_NAME = 'name';                // Contact name (for logging)

// JSON file paths (tried in order)
const JSON_FILE_PATHS = [
  '/Users/glendaleexpress/Desktop/crew_contacts_MASTER_with_ig.json', // User-specified path
  join(process.cwd(), '../crew_contacts_MASTER_with_ig.json'),        // Parent directory
  join(process.cwd(), 'data/crew_contacts_MASTER_with_ig.json'),      // ./data/ directory
  join(process.cwd(), 'crew_contacts_MASTER_with_ig.json'),           // Current directory
];

// Dry run mode (set via DRY_RUN env var)
const DRY_RUN = process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1';

// ============================================================================
// TYPES
// ============================================================================

interface JsonContact {
  Name: string;
  Email: string;      // May contain multiple emails separated by ; or ,
  Phone: number | string;
  Roles: string;
  Departments: string;
  Instagram: string;  // May be empty
  Project: string;
  Favorite: string;
}

interface MatchResult {
  id: string;
  name: string;
  old_ig_handle: string | null;
  new_ig_handle: string;
  match_method: 'phone' | 'email';
}

interface Stats {
  total_json_contacts: number;
  skipped_no_ig: number;
  matches_found: number;
  matches_phone: number;
  matches_email: number;
  updates_performed: number;
  skipped_existing_ig: number;
  no_matches: number;
}

// ============================================================================
// NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Normalizes Instagram handle from JSON
 * @param ig - Instagram handle from JSON
 * @returns Normalized handle or null if empty
 */
function normalizeInstagram(ig: string | null | undefined): string | null {
  if (!ig) return null;
  const trimmed = ig.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Normalizes phone number for matching
 * Rules:
 * - Convert to string
 * - Strip all non-digits
 * - If 11 digits and starts with 1, treat as 10 digits (drop leading 1)
 * - Returns normalized 10-digit string or null if invalid
 */
function normalizePhone(phone: number | string | null | undefined): string | null {
  if (!phone) return null;
  
  // Convert to string
  const phoneStr = String(phone);
  
  // Strip all non-digits
  const digits = phoneStr.replace(/\D/g, '');
  
  // Handle 11-digit numbers starting with 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1); // Drop leading 1
  }
  
  // Must be exactly 10 digits
  if (digits.length === 10) {
    return digits;
  }
  
  return null;
}

/**
 * Normalizes email addresses for matching
 * Rules:
 * - Split on ; or ,
 * - Trim whitespace
 * - Lowercase
 * - Filter out empty strings
 */
function normalizeEmails(email: string | null | undefined): string[] {
  if (!email) return [];
  
  return email
    .split(/[;,]/)
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);
}

/**
 * Normalizes phone numbers in a database array for matching
 */
function normalizeDbPhones(phones: string[] | null | undefined): string[] {
  if (!phones) return [];
  
  return phones
    .map(p => normalizePhone(p))
    .filter((p): p is string => p !== null);
}

/**
 * Normalizes emails in a database array for matching
 */
function normalizeDbEmails(emails: string[] | null | undefined): string[] {
  if (!emails) return [];
  
  return emails.map(e => e.trim().toLowerCase());
}

// ============================================================================
// MATCHING LOGIC
// ============================================================================

/**
 * Index of contacts by normalized phone for fast lookup
 */
interface ContactIndex {
  byPhone: Map<string, any[]>;  // normalized phone -> contacts[]
  byEmail: Map<string, any[]>;  // normalized email -> contacts[]
  all: any[];                    // all contacts
}

/**
 * Builds an index of all contacts for fast matching
 */
async function buildContactIndex(supabase: any): Promise<ContactIndex> {
  console.log('Loading all contacts from database...');
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(`${COLUMN_ID}, ${COLUMN_NAME}, ${COLUMN_PHONES}, ${COLUMN_EMAILS}, ${COLUMN_IG_HANDLE}`);
  
  if (error) {
    console.error('[ERROR] Failed to fetch contacts:', error);
    throw error;
  }
  
  if (!data) {
    console.log('⚠️  No contacts found in database');
    return { byPhone: new Map(), byEmail: new Map(), all: [] };
  }
  
  console.log(`✅ Loaded ${data.length} contacts from database`);
  console.log('Building search index...');
  
  const byPhone = new Map<string, any[]>();
  const byEmail = new Map<string, any[]>();
  
  // Build indexes
  for (const contact of data) {
    // Index by phone
    const dbPhones = normalizeDbPhones(contact[COLUMN_PHONES]);
    for (const phone of dbPhones) {
      if (!byPhone.has(phone)) {
        byPhone.set(phone, []);
      }
      byPhone.get(phone)!.push(contact);
    }
    
    // Index by email
    const dbEmails = normalizeDbEmails(contact[COLUMN_EMAILS]);
    for (const email of dbEmails) {
      if (!byEmail.has(email)) {
        byEmail.set(email, []);
      }
      byEmail.get(email)!.push(contact);
    }
  }
  
  console.log(`✅ Index built: ${byPhone.size} unique phones, ${byEmail.size} unique emails`);
  console.log('');
  
  return { byPhone, byEmail, all: data };
}

/**
 * Finds matching contacts by phone using the index
 */
function findContactsByPhone(
  index: ContactIndex,
  normalizedPhone: string
): any[] {
  return index.byPhone.get(normalizedPhone) || [];
}

/**
 * Finds matching contacts by email using the index
 */
function findContactsByEmail(
  index: ContactIndex,
  normalizedEmails: string[]
): any[] {
  const matches = new Set<any>();
  
  for (const email of normalizedEmails) {
    const contacts = index.byEmail.get(email) || [];
    for (const contact of contacts) {
      matches.add(contact);
    }
  }
  
  return Array.from(matches);
}

/**
 * Checks if a contact's IG handle is empty/null (safe to update)
 */
function canUpdateIgHandle(igHandle: string | null | undefined): boolean {
  if (!igHandle) return true;
  const trimmed = igHandle.trim();
  return trimmed === '';
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('Crew Contacts Instagram Enrichment');
  console.log('========================================');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '✅ LIVE RUN (changes will be committed)'}`);
  console.log('');

  // Load environment variables
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('[ERROR] SUPABASE_URL or VITE_SUPABASE_URL environment variable is required');
    process.exit(1);
  }

  if (!supabaseServiceKey) {
    console.error('[ERROR] SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    console.error('       (Service role key is needed to bypass RLS for updates)');
    process.exit(1);
  }

  // Initialize Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Load JSON file
  let jsonContacts: JsonContact[];
  let jsonPath: string | null = null;
  
  // Try each path until we find the file
  for (const path of JSON_FILE_PATHS) {
    try {
      readFileSync(path, 'utf-8'); // Test if file exists
      jsonPath = path;
      break;
    } catch {
      // Continue to next path
    }
  }
  
  if (!jsonPath) {
    console.error('[ERROR] Failed to find JSON file. Tried:');
    JSON_FILE_PATHS.forEach(path => console.error(`        - ${path}`));
    console.error('');
    console.error('Please ensure crew_contacts_MASTER_with_ig.json exists in one of these locations.');
    process.exit(1);
  }
  
  try {
    const jsonContent = readFileSync(jsonPath, 'utf-8');
    jsonContacts = JSON.parse(jsonContent);
    console.log(`✅ Loaded ${jsonContacts.length} contacts from JSON file:`);
    console.log(`   ${jsonPath}`);
  } catch (error: any) {
    console.error(`[ERROR] Failed to load/parse JSON file:`, error.message);
    console.error(`        File path: ${jsonPath}`);
    process.exit(1);
  }

  // Build contact index for fast matching
  const contactIndex = await buildContactIndex(supabase);

  // Initialize stats
  const stats: Stats = {
    total_json_contacts: jsonContacts.length,
    skipped_no_ig: 0,
    matches_found: 0,
    matches_phone: 0,
    matches_email: 0,
    updates_performed: 0,
    skipped_existing_ig: 0,
    no_matches: 0,
  };

  const updateExamples: MatchResult[] = [];

  console.log('Processing contacts...');
  console.log('');

  // Process each JSON contact
  for (let i = 0; i < jsonContacts.length; i++) {
    const jsonContact = jsonContacts[i];
    
    // Normalize Instagram handle
    const igHandle = normalizeInstagram(jsonContact.Instagram);
    
    // Skip if no Instagram handle
    if (!igHandle) {
      stats.skipped_no_ig++;
      continue;
    }

    // Normalize phone and emails for matching
    const normalizedPhone = normalizePhone(jsonContact.Phone);
    const normalizedEmails = normalizeEmails(jsonContact.Email);

    // Try to find matching contact
    let matchingContacts: any[] = [];
    let matchMethod: 'phone' | 'email' | null = null;

    // Primary: Match by phone
    if (normalizedPhone) {
      matchingContacts = findContactsByPhone(contactIndex, normalizedPhone);
      if (matchingContacts.length > 0) {
        matchMethod = 'phone';
        stats.matches_phone++;
      }
    }

    // Fallback: Match by email (if no phone match)
    if (matchingContacts.length === 0 && normalizedEmails.length > 0) {
      matchingContacts = findContactsByEmail(contactIndex, normalizedEmails);
      if (matchingContacts.length > 0) {
        matchMethod = 'email';
        stats.matches_email++;
      }
    }

    // Process matches (deduplicate by contact ID in case contact matches both phone and email)
    if (matchingContacts.length > 0) {
      // Deduplicate contacts by ID
      const uniqueContacts = new Map<string, any>();
      for (const contact of matchingContacts) {
        uniqueContacts.set(contact[COLUMN_ID], contact);
      }
      
      const deduplicatedContacts = Array.from(uniqueContacts.values());
      stats.matches_found += deduplicatedContacts.length;

      for (const contact of deduplicatedContacts) {
        // Check if we can update (IG handle is empty/null)
        if (canUpdateIgHandle(contact[COLUMN_IG_HANDLE])) {
          // Update the contact
          if (!DRY_RUN) {
            const { error } = await supabase
              .from(TABLE_NAME)
              .update({ [COLUMN_IG_HANDLE]: igHandle })
              .eq(COLUMN_ID, contact[COLUMN_ID]);

            if (error) {
              console.error(`[ERROR] Failed to update contact ${contact[COLUMN_ID]}:`, error);
              continue;
            }
          }

          stats.updates_performed++;

          // Save example for logging
          if (updateExamples.length < 10) {
            updateExamples.push({
              id: contact[COLUMN_ID],
              name: contact[COLUMN_NAME] || 'Unknown',
              old_ig_handle: contact[COLUMN_IG_HANDLE] || null,
              new_ig_handle: igHandle,
              match_method: matchMethod!,
            });
          }
        } else {
          stats.skipped_existing_ig++;
        }
      }
    } else {
      stats.no_matches++;
    }

    // Progress indicator
    if ((i + 1) % 100 === 0) {
      console.log(`  Processed ${i + 1}/${jsonContacts.length} contacts...`);
    }
  }

  // Print summary
  console.log('');
  console.log('========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Total JSON contacts processed: ${stats.total_json_contacts}`);
  console.log(`  └─ Skipped (no IG handle): ${stats.skipped_no_ig}`);
  console.log(`  └─ Had IG handles: ${stats.total_json_contacts - stats.skipped_no_ig}`);
  console.log('');
  console.log(`Matches found: ${stats.matches_found}`);
  console.log(`  └─ Matched by phone: ${stats.matches_phone}`);
  console.log(`  └─ Matched by email: ${stats.matches_email}`);
  console.log('');
  console.log(`Updates performed: ${stats.updates_performed}`);
  console.log(`  └─ Skipped (existing IG handle): ${stats.skipped_existing_ig}`);
  console.log(`  └─ No match found: ${stats.no_matches}`);
  console.log('');

  // Print example updates
  if (updateExamples.length > 0) {
    console.log('========================================');
    console.log('EXAMPLE UPDATES (first 10)');
    console.log('========================================');
    updateExamples.forEach((example, idx) => {
      console.log(`${idx + 1}. ${example.name} (ID: ${example.id.substring(0, 8)}...)`);
      console.log(`   Match method: ${example.match_method}`);
      console.log(`   Old IG: ${example.old_ig_handle || '(empty)'} → New IG: ${example.new_ig_handle}`);
      console.log('');
    });
  }

  if (DRY_RUN) {
    console.log('========================================');
    console.log('🔍 DRY RUN MODE - No changes were made');
    console.log('Run without DRY_RUN=true to apply changes');
    console.log('========================================');
  } else {
    console.log('========================================');
    console.log('✅ Script completed successfully');
    console.log('========================================');
  }
}

// Run the script
main().catch((error) => {
  console.error('[FATAL ERROR]', error);
  process.exit(1);
});
