import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize phone to digits only for comparison
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

// Normalize email to lowercase
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Fuzzy name match: last name exact + first name prefix (3+ chars)
function fuzzyNameMatch(name1: string, name2: string): boolean {
  const normalize = (n: string) => n.toLowerCase().trim().replace(/[^a-z\s]/g, '');
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  
  const parts1 = n1.split(/\s+/).filter(Boolean);
  const parts2 = n2.split(/\s+/).filter(Boolean);
  
  if (parts1.length < 2 || parts2.length < 2) {
    // Single-word names: exact match
    return n1 === n2;
  }
  
  // Last name must match exactly
  const lastName1 = parts1[parts1.length - 1];
  const lastName2 = parts2[parts2.length - 1];
  if (lastName1 !== lastName2) return false;
  
  // First name: prefix match (at least 3 chars)
  const firstName1 = parts1[0];
  const firstName2 = parts2[0];
  const minLen = Math.min(firstName1.length, firstName2.length);
  
  if (minLen < 3) {
    return firstName1 === firstName2;
  }
  
  return firstName1.substring(0, 3) === firstName2.substring(0, 3);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to bypass RLS for admin contact lookup
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { name, phones, emails } = await req.json();
    
    if (!name) {
      return new Response(
        JSON.stringify({ seedSuggestion: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-seed-ig-suggestion] Lookup for:', { name, phones, emails });

    // Get admin user IDs
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) {
      console.error('[get-seed-ig-suggestion] Failed to fetch admin roles:', rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('[get-seed-ig-suggestion] No admin users found');
      return new Response(
        JSON.stringify({ seedSuggestion: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminUserIds = adminRoles.map(r => r.user_id);
    console.log('[get-seed-ig-suggestion] Admin user IDs:', adminUserIds);

    // Query admin contacts with IG handles
    const { data: adminContacts, error: contactsError } = await supabase
      .from('crew_contacts')
      .select('name, emails, phones, ig_handle')
      .in('user_id', adminUserIds)
      .not('ig_handle', 'is', null);

    if (contactsError) {
      console.error('[get-seed-ig-suggestion] Failed to fetch admin contacts:', contactsError);
      throw contactsError;
    }

    if (!adminContacts || adminContacts.length === 0) {
      console.log('[get-seed-ig-suggestion] No admin contacts with IG handles found');
      return new Response(
        JSON.stringify({ seedSuggestion: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-seed-ig-suggestion] Found', adminContacts.length, 'admin contacts with IG handles');

    // Normalize input arrays
    const normalizedPhones = (phones || []).map(normalizePhone).filter((p: string) => p.length >= 7);
    const normalizedEmails = (emails || []).map(normalizeEmail).filter((e: string) => e.includes('@'));

    // Find a match
    for (const contact of adminContacts) {
      // Check email match (highest confidence)
      if (normalizedEmails.length > 0 && contact.emails) {
        for (const adminEmail of contact.emails) {
          const normalizedAdminEmail = normalizeEmail(adminEmail);
          if (normalizedEmails.includes(normalizedAdminEmail)) {
            console.log('[get-seed-ig-suggestion] Email match found:', contact.ig_handle);
            return new Response(
              JSON.stringify({ seedSuggestion: contact.ig_handle, confidence: 'high' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      // Check phone match (high confidence)
      if (normalizedPhones.length > 0 && contact.phones) {
        for (const adminPhone of contact.phones) {
          const normalizedAdminPhone = normalizePhone(adminPhone);
          if (normalizedPhones.includes(normalizedAdminPhone)) {
            console.log('[get-seed-ig-suggestion] Phone match found:', contact.ig_handle);
            return new Response(
              JSON.stringify({ seedSuggestion: contact.ig_handle, confidence: 'high' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    }

    // Check name match (medium confidence) - separate loop for priority
    for (const contact of adminContacts) {
      if (fuzzyNameMatch(name, contact.name)) {
        console.log('[get-seed-ig-suggestion] Name match found:', contact.ig_handle);
        return new Response(
          JSON.stringify({ seedSuggestion: contact.ig_handle, confidence: 'medium' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('[get-seed-ig-suggestion] No match found');
    return new Response(
      JSON.stringify({ seedSuggestion: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-seed-ig-suggestion] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
