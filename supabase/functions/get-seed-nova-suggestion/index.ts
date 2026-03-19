import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normalize name for comparison (matches nova_master_identities.normalized_name format)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
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
    const { name } = await req.json();
    
    if (!name) {
      return new Response(
        JSON.stringify({ seedSuggestion: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-seed-nova-suggestion] Lookup for:', { name });

    const normalizedInputName = normalizeName(name);

    // PRIORITY 1: Exact normalized name match (HIGH confidence)
    const { data: exactMatch, error: exactError } = await supabase
      .from('nova_master_identities')
      .select('profile_url, full_name, normalized_name, username, roles')
      .eq('normalized_name', normalizedInputName)
      .limit(1)
      .maybeSingle();

    if (exactError) {
      console.error('[get-seed-nova-suggestion] Exact match query error:', exactError);
    }

    if (exactMatch) {
      console.log('[get-seed-nova-suggestion] Exact name match found:', exactMatch.username);
      return new Response(
        JSON.stringify({ 
          seedSuggestion: exactMatch.profile_url, 
          confidence: 'high',
          matchReason: 'exact_name',
          matchedName: exactMatch.full_name,
          username: exactMatch.username,
          roles: exactMatch.roles || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PRIORITY 2: Fuzzy match - last name exact + first name prefix (3+ chars) (MEDIUM confidence)
    const inputParts = normalizedInputName.split(' ').filter(Boolean);
    if (inputParts.length >= 2) {
      const inputLastName = inputParts[inputParts.length - 1];
      const inputFirstName = inputParts[0];
      
      // Query by last name using ILIKE for efficiency
      const { data: fuzzyMatches, error: fuzzyError } = await supabase
        .from('nova_master_identities')
        .select('profile_url, full_name, normalized_name, username, roles')
        .ilike('normalized_name', `%${inputLastName}`)
        .limit(50);

      if (fuzzyError) {
        console.error('[get-seed-nova-suggestion] Fuzzy match query error:', fuzzyError);
      }

      if (fuzzyMatches && fuzzyMatches.length > 0) {
        for (const identity of fuzzyMatches) {
          const identityParts = identity.normalized_name.split(' ').filter(Boolean);
          if (identityParts.length >= 2) {
            const identityLastName = identityParts[identityParts.length - 1];
            const identityFirstName = identityParts[0];
            
            // Last name must match exactly
            if (inputLastName === identityLastName) {
              // First name prefix match (at least 3 chars)
              const minLen = Math.min(inputFirstName.length, identityFirstName.length);
              if (minLen >= 3 && inputFirstName.substring(0, 3) === identityFirstName.substring(0, 3)) {
                console.log('[get-seed-nova-suggestion] Fuzzy name match found:', identity.username);
                return new Response(
                  JSON.stringify({ 
                    seedSuggestion: identity.profile_url, 
                    confidence: 'medium',
                    matchReason: 'fuzzy_name',
                    matchedName: identity.full_name,
                    username: identity.username,
                    roles: identity.roles || []
                  }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            }
          }
        }
      }
    }

    console.log('[get-seed-nova-suggestion] No match found');
    return new Response(
      JSON.stringify({ seedSuggestion: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-seed-nova-suggestion] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
