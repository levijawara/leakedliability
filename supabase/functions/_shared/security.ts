import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Creates a Supabase client with service role key for admin operations
 */
export const getSupabase = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey, { 
    auth: { persistSession: false } 
  });
};

/**
 * Creates a Supabase client using the user's JWT token for RLS-scoped operations
 */
export const getSupabaseWithAuth = (token: string) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` }
    },
    auth: { persistSession: false }
  });
};

/**
 * Extracts and validates the user from the Authorization header
 * Throws if unauthorized
 */
export const requireAuth = async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    throw new Error("Unauthorized - No auth token provided");
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = getSupabase();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('[AUTH] Error:', error?.message || 'No user found');
    throw new Error("Unauthorized - Invalid token");
  }

  console.log('[AUTH] User authenticated:', user.id);
  return { user, token };
};

/**
 * Sanitizes string input by removing potentially dangerous characters
 */
export const sanitize = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const cleaned = value.replace(/[<>$;]/g, "").trim();
  return cleaned || null;
};

/**
 * In-memory rate limiter
 * Note: In production with multiple instances, use Redis or database-backed rate limiting
 */
const rateMap = new Map<string, { count: number; time: number }>();

export const rateLimit = (ip: string, limit = 10, windowMs = 60_000): boolean => {
  const now = Date.now();
  const rec = rateMap.get(ip) || { count: 0, time: now };

  if (now - rec.time > windowMs) {
    rateMap.set(ip, { count: 1, time: now });
    console.log(`[RATE_LIMIT] IP ${ip.substring(0, 8)}... - Request 1/${limit}`);
    return true;
  }

  if (rec.count >= limit) {
    console.warn(`[RATE_LIMIT] IP ${ip.substring(0, 8)}... - LIMIT EXCEEDED (${rec.count}/${limit})`);
    throw new Error("Rate limit exceeded - Please wait before trying again");
  }

  rec.count++;
  rateMap.set(ip, rec);
  console.log(`[RATE_LIMIT] IP ${ip.substring(0, 8)}... - Request ${rec.count}/${limit}`);

  return true;
};

/**
 * Standard CORS headers for edge functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Helper to create error responses with CORS headers
 */
export const errorResponse = (message: string, status = 400) => {
  console.error(`[ERROR] ${message}`);
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

/**
 * Helper to create success responses with CORS headers
 */
export const successResponse = (data: unknown, status = 200) => {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

/**
 * Validates that a user owns a specific call sheet
 */
export const validateCallSheetOwnership = async (
  supabase: ReturnType<typeof getSupabase>,
  callSheetId: string,
  userId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('call_sheets')
    .select('id')
    .eq('id', callSheetId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.warn(`[OWNERSHIP] Call sheet ${callSheetId} not owned by user ${userId}`);
    return false;
  }
  
  return true;
};

/**
 * Validates that a user owns a specific contact
 */
export const validateContactOwnership = async (
  supabase: ReturnType<typeof getSupabase>,
  contactId: string,
  userId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('crew_contacts')
    .select('id')
    .eq('id', contactId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.warn(`[OWNERSHIP] Contact ${contactId} not owned by user ${userId}`);
    return false;
  }
  
  return true;
};

/**
 * Checks if user has admin role
 */
export const isAdmin = async (
  supabase: ReturnType<typeof getSupabase>,
  userId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .rpc('has_role', { _user_id: userId, _role: 'admin' });

  if (error) {
    console.error('[ADMIN_CHECK] Error:', error.message);
    return false;
  }
  
  return data === true;
};
