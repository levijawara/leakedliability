/**
 * parse-call-sheet: On-demand call sheet parser (with auth)
 * Uses shared modules for unified parsing logic
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractTextFromFile, computeContentHash } from "../_shared/pdfExtractor.ts";
import { 
  parseCallSheetText, 
  normalizeContact, 
  STANDARD_DEPARTMENTS,
  type NormalizedContact,
  type ParseResult 
} from "../_shared/callSheetParser.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions
const getSupabase = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey, { 
    auth: { persistSession: false } 
  });
};

const requireAuth = async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    throw new Error("Unauthorized - No auth token provided");
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = getSupabase();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('[PARSE_CALL_SHEET] Auth error:', error?.message || 'No user found');
    throw new Error("Unauthorized - Invalid token");
  }

  console.log('[PARSE_CALL_SHEET] User authenticated:', user.id);
  return { user, token };
};

const errorResponse = (message: string, status = 400) => {
  console.error(`[PARSE_CALL_SHEET] Error: ${message}`);
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

const successResponse = (data: unknown, status = 200) => {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
};

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const { user } = await requireAuth(req);
    const userId = user.id;

    const supabase = getSupabase();

    // Get request body
    const body = await req.json();
    const { 
      file_path, 
      file_name, 
      call_sheet_id,
      auto_insert = false,
      use_ai = true,
      include_cleanup = true,
      preview_mode = false,
      fileUrl,
      fileName,
      projectTitle,
      previewMode,
    } = body;

    // Support both naming conventions
    const actualFilePath = file_path || fileUrl;
    const actualFileName = file_name || fileName;
    const actualPreviewMode = preview_mode || previewMode;

    console.log('[PARSE_CALL_SHEET] Request:', {
      file_path: actualFilePath,
      file_name: actualFileName,
      call_sheet_id,
      auto_insert,
      use_ai,
      preview_mode: actualPreviewMode,
    });

    if (!actualFilePath && !call_sheet_id) {
      return errorResponse("Either file_path or call_sheet_id is required");
    }

    let pdfBytes: Uint8Array;
    let targetFileName: string;
    let callSheetRecord: Record<string, unknown> | null = null;

    // If call_sheet_id provided, fetch from database
    if (call_sheet_id) {
      console.log('[PARSE_CALL_SHEET] Fetching call sheet record:', call_sheet_id);
      
      const { data: sheet, error: sheetError } = await supabase
        .from('call_sheets')
        .select('*')
        .eq('id', call_sheet_id)
        .eq('user_id', userId)
        .single();

      if (sheetError || !sheet) {
        return errorResponse(`Call sheet not found: ${sheetError?.message || 'Not found'}`, 404);
      }

      callSheetRecord = sheet;
      targetFileName = sheet.file_name;

      // Download from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('call_sheets')
        .download(sheet.file_path);

      if (downloadError || !fileData) {
        return errorResponse(`Failed to download: ${downloadError?.message}`);
      }

      pdfBytes = new Uint8Array(await fileData.arrayBuffer());
    } 
    // If file_path is a URL (signed URL from client)
    else if (actualFilePath.startsWith('http')) {
      console.log('[PARSE_CALL_SHEET] Downloading from URL...');
      const response = await fetch(actualFilePath);
      if (!response.ok) {
        return errorResponse(`Failed to fetch file: ${response.status}`);
      }
      pdfBytes = new Uint8Array(await response.arrayBuffer());
      targetFileName = actualFileName || 'call_sheet.pdf';
    }
    // Otherwise, download from storage path
    else {
      console.log('[PARSE_CALL_SHEET] Downloading from storage path:', actualFilePath);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('call_sheets')
        .download(actualFilePath);

      if (downloadError || !fileData) {
        return errorResponse(`Failed to download: ${downloadError?.message}`);
      }

      pdfBytes = new Uint8Array(await fileData.arrayBuffer());
      targetFileName = actualFileName || actualFilePath.split('/').pop() || 'call_sheet.pdf';
    }

    console.log(`[PARSE_CALL_SHEET] File loaded: ${pdfBytes.length} bytes, name: ${targetFileName}`);

    // Compute content hash for deduplication
    const contentHash = await computeContentHash(pdfBytes);
    console.log('[PARSE_CALL_SHEET] Content hash:', contentHash.substring(0, 16) + '...');

    // Check for duplicate by content hash
    if (!actualPreviewMode) {
      const { data: existing } = await supabase
        .from('call_sheets')
        .select('id, file_name')
        .eq('user_id', userId)
        .eq('content_hash', contentHash)
        .neq('id', call_sheet_id || '')
        .limit(1);

      if (existing && existing.length > 0) {
        console.log('[PARSE_CALL_SHEET] Duplicate found:', existing[0].id);
        return successResponse({
          success: true,
          duplicate: true,
          existing_id: existing[0].id,
          existing_name: existing[0].file_name,
          message: 'This call sheet has already been uploaded',
        });
      }
    }

    // Extract text from file using shared module
    console.log('[PARSE_CALL_SHEET] Extracting text from file...');
    const fileBlob = new Blob([pdfBytes]);
    const extraction = await extractTextFromFile(fileBlob, targetFileName);
    const rawText = extraction.text;
    const pageCount = extraction.pageCount;

    if (!extraction.hasText) {
      return errorResponse('File has no extractable text (may be scanned/image-based)');
    }

    console.log(`[PARSE_CALL_SHEET] Extracted ${rawText.length} chars from ${pageCount} pages`);

    // Parse using shared module
    console.log('[PARSE_CALL_SHEET] Parsing contacts...');
    const parseResult = await parseCallSheetText(rawText, {
      useAI: use_ai,
      includeCleanup: include_cleanup,
    });

    const contacts = parseResult.contacts;
    console.log(`[PARSE_CALL_SHEET] Parsed ${contacts.length} contacts via ${parseResult.parsing_method}`);

    // If preview mode, return without saving
    if (actualPreviewMode) {
      return successResponse({
        success: true,
        preview: true,
        contacts: contacts.map(c => ({
          name: c.name,
          roles: c.roles,
          departments: c.departments,
          phones: c.phones,
          emails: c.emails,
          ig_handle: c.ig_handle,
          confidence: c.confidence,
          needs_review: c.needs_review,
        })),
        parsing_method: parseResult.parsing_method,
        pages_processed: pageCount,
        errors: parseResult.errors,
        shoot_date: null,
        project_title: projectTitle || null,
      });
    }

    // Update call sheet record if exists
    if (call_sheet_id || callSheetRecord) {
      const updateId = call_sheet_id || (callSheetRecord as { id: string }).id;
      
      const parsedContactsForStorage = contacts.map(c => ({
        name: c.name,
        role: c.roles[0] || '',
        department: c.departments[0] || '',
        phone: c.phones[0] || null,
        email: c.emails[0] || null,
        instagram_handle: c.ig_handle,
        confidence: c.confidence,
      }));

      await supabase
        .from('call_sheets')
        .update({
          status: 'parsed',
          parsed_date: new Date().toISOString(),
          parsed_contacts: parsedContactsForStorage,
          contacts_extracted: contacts.length,
          content_hash: contentHash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updateId);

      console.log('[PARSE_CALL_SHEET] Updated call sheet record:', updateId);
    }

    // Auto-insert contacts if requested
    if (auto_insert && contacts.length > 0) {
      console.log('[PARSE_CALL_SHEET] Auto-inserting contacts...');
      
      const contactsToInsert = contacts.map(c => ({
        user_id: userId,
        name: c.name,
        roles: c.roles,
        departments: c.departments,
        phones: c.phones,
        emails: c.emails,
        ig_handle: c.ig_handle,
        confidence: c.confidence,
        source_files: [actualFilePath],
        needs_review: c.needs_review,
      }));

      const { error: insertError } = await supabase
        .from('crew_contacts')
        .insert(contactsToInsert);

      if (insertError) {
        console.error('[PARSE_CALL_SHEET] Insert error:', insertError);
      } else {
        console.log(`[PARSE_CALL_SHEET] Inserted ${contactsToInsert.length} contacts`);
      }
    }

    return successResponse({
      success: true,
      contacts: contacts.map(c => ({
        name: c.name,
        roles: c.roles,
        departments: c.departments,
        phones: c.phones,
        emails: c.emails,
        ig_handle: c.ig_handle,
        confidence: c.confidence,
        needs_review: c.needs_review,
      })),
      parsing_method: parseResult.parsing_method,
      pages_processed: pageCount,
      content_hash: contentHash,
      errors: parseResult.errors,
      auto_inserted: auto_insert ? contacts.length : 0,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PARSE_CALL_SHEET] Fatal error:', message);
    
    if (message.includes('Unauthorized')) {
      return errorResponse(message, 401);
    }
    
    return errorResponse(message, 500);
  }
});
