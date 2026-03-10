import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize phone to digits only for comparison (last 10)
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

// Normalize email to lowercase
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Normalize name for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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

    // Query the ig_master_identities table (all 833+ records)
    const { data: masterIdentities, error: identitiesError } = await supabase
      .from('ig_master_identities')
      .select('instagram, raw_name, normalized_name, phones, emails, roles')
      .not('instagram', 'is', null);

    if (identitiesError) {
      console.error('[get-seed-ig-suggestion] Failed to fetch master identities:', identitiesError);
      throw identitiesError;
    }

    if (!masterIdentities || masterIdentities.length === 0) {
      console.log('[get-seed-ig-suggestion] No master identities found');
      return new Response(
        JSON.stringify({ seedSuggestion: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-seed-ig-suggestion] Searching', masterIdentities.length, 'master identities');

    // Normalize input arrays
    const normalizedInputPhones = (phones || [])
      .map((p: string) => normalizePhone(p))
      .filter((p: string) => p.length >= 7);
    const normalizedInputEmails = (emails || [])
      .map((e: string) => normalizeEmail(e))
      .filter((e: string) => e.includes('@'));
    const normalizedInputName = normalizeName(name);

    // PRIORITY 1: Phone match (HIGH confidence)
    if (normalizedInputPhones.length > 0) {
      for (const identity of masterIdentities) {
        if (identity.phones && Array.isArray(identity.phones)) {
          for (const identityPhone of identity.phones) {
            const normalizedIdentityPhone = normalizePhone(identityPhone);
            if (normalizedIdentityPhone.length >= 7 && normalizedInputPhones.includes(normalizedIdentityPhone)) {
              console.log('[get-seed-ig-suggestion] Phone match found:', identity.instagram);
              return new Response(
                JSON.stringify({ 
                  seedSuggestion: identity.instagram, 
                  confidence: 'high',
                  matchReason: 'phone',
                  matchedName: identity.raw_name
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }
      }
    }

    // PRIORITY 2: Email match (HIGH confidence)
    if (normalizedInputEmails.length > 0) {
      for (const identity of masterIdentities) {
        if (identity.emails && Array.isArray(identity.emails)) {
          for (const identityEmail of identity.emails) {
            const normalizedIdentityEmail = normalizeEmail(identityEmail);
            if (normalizedInputEmails.includes(normalizedIdentityEmail)) {
              console.log('[get-seed-ig-suggestion] Email match found:', identity.instagram);
              return new Response(
                JSON.stringify({ 
                  seedSuggestion: identity.instagram, 
                  confidence: 'high',
                  matchReason: 'email',
                  matchedName: identity.raw_name
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }
      }
    }

    // PRIORITY 3: Name match (MEDIUM confidence) - exact normalized name comparison
    for (const identity of masterIdentities) {
      if (identity.normalized_name === normalizedInputName) {
        console.log('[get-seed-ig-suggestion] Exact name match found:', identity.instagram);
        return new Response(
          JSON.stringify({ 
            seedSuggestion: identity.instagram, 
            confidence: 'medium',
            matchReason: 'name',
            matchedName: identity.raw_name
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // PRIORITY 4: Fuzzy name match - last name exact + first name prefix (3+ chars)
    const inputParts = normalizedInputName.split(' ').filter(Boolean);
    if (inputParts.length >= 2) {
      const inputLastName = inputParts[inputParts.length - 1];
      const inputFirstName = inputParts[0];
      
      for (const identity of masterIdentities) {
        const identityParts = identity.normalized_name.split(' ').filter(Boolean);
        if (identityParts.length >= 2) {
          const identityLastName = identityParts[identityParts.length - 1];
          const identityFirstName = identityParts[0];
          
          // Last name must match exactly
          if (inputLastName === identityLastName) {
            // First name prefix match (at least 3 chars)
            const minLen = Math.min(inputFirstName.length, identityFirstName.length);
            if (minLen >= 3 && inputFirstName.substring(0, 3) === identityFirstName.substring(0, 3)) {
              console.log('[get-seed-ig-suggestion] Fuzzy name match found:', identity.instagram);
              return new Response(
                JSON.stringify({ 
                  seedSuggestion: identity.instagram, 
                  confidence: 'medium',
                  matchReason: 'name',
                  matchedName: identity.raw_name
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }
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
