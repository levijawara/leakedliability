import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";
import { requireInternalSecretOrJwt } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateTranscriptRequest {
  report_id: string; // DB ID
  report_display_id: string; // Report ID display string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: require JWT or internal secret
  const auth = await requireInternalSecretOrJwt(req, corsHeaders);
  if (!auth.authorized) return auth.response!;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { report_id, report_display_id }: GenerateTranscriptRequest = await req.json();

    if (!report_id || !report_display_id) {
      throw new Error('Missing required fields: report_id, report_display_id');
    }

    console.log(`[generate-arena-transcript] Generating JSON transcript for report ${report_display_id} (DB ID: ${report_id})`);

    // Load report details
    const { data: report } = await supabase
      .from('payment_reports')
      .select('report_id, current_liable_name, current_liable_email, project_name, amount_owed, created_at')
      .eq('id', report_id)
      .single();

    if (!report) {
      throw new Error('Report not found');
    }

    // Load all messages
    const { data: messages } = await supabase
      .from('liability_arena_messages')
      .select('*')
      .eq('report_id', report_id)
      .order('created_at', { ascending: true });

    // Load all participants
    const { data: participants } = await supabase
      .from('liability_arena_participants')
      .select('*')
      .eq('report_id', report_id)
      .order('joined_at', { ascending: true });

    // Load redirect history
    const { data: redirects } = await supabase
      .from('liability_arena_redirects')
      .select('*')
      .eq('report_id', report_id)
      .order('created_at', { ascending: true });

    console.log(`[generate-arena-transcript] Loaded data: ${messages?.length || 0} messages, ${participants?.length || 0} participants, ${redirects?.length || 0} redirects`);

    // Build transcript.json - sequential message array
    const transcript = (messages || []).map((msg: any) => ({
      message_id: msg.id,
      author: msg.is_admin ? 'LL™ Admin' : msg.participant_name,
      author_type: msg.is_admin ? 'admin' : 'participant',
      author_email: msg.participant_email,
      timestamp: msg.created_at,
      content: msg.message_text,
    }));

    // Build participants.json
    const participantsData = (participants || []).map((p: any) => ({
      participant_id: p.id,
      participant_name: p.participant_name,
      participant_email: p.participant_email,
      is_admin: p.is_admin,
      joined_at: p.joined_at,
      last_seen_at: p.last_seen_at,
    }));

    // Build redirects.json
    const redirectsData = (redirects || []).map((r: any) => ({
      redirect_id: r.id,
      from_participant_name: r.from_participant_name,
      from_participant_email: r.from_participant_email,
      to_name: r.to_name,
      to_email: r.to_email,
      created_at: r.created_at,
    }));

    // Build metadata object
    const metadata = {
      report_id: report_display_id,
      report_db_id: report_id,
      final_liable_name: report.current_liable_name,
      final_liable_email: report.current_liable_email,
      project_name: report.project_name,
      amount_owed: report.amount_owed,
      report_created_at: report.created_at,
      transcript_generated_at: new Date().toISOString(),
      total_messages: transcript.length,
      total_participants: participantsData.length,
      total_redirects: redirectsData.length,
    };

    // Create JSON files as strings
    const transcriptJson = JSON.stringify(transcript, null, 2);
    const participantsJson = JSON.stringify(participantsData, null, 2);
    const redirectsJson = JSON.stringify(redirectsData, null, 2);
    const metadataJson = JSON.stringify(metadata, null, 2);

    // Create ZIP file using JSZip
    // Using esm.sh for Deno compatibility
    const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
    const zip = new JSZip();
    
    zip.file('transcript.json', transcriptJson);
    zip.file('participants.json', participantsJson);
    if (redirectsData.length > 0) {
      zip.file('redirects.json', redirectsJson);
    }
    zip.file('metadata.json', metadataJson);

    // Generate ZIP as Uint8Array (Deno-compatible)
    const zipBuffer = await zip.generateAsync({ 
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Upload to Supabase Storage
    const fileName = `arena-transcript-${report_display_id}-${Date.now()}.zip`;
    const filePath = `arena-transcripts/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('submission-documents')
      .upload(filePath, zipBuffer, {
        contentType: 'application/zip',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload ZIP: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('submission-documents')
      .getPublicUrl(filePath);

    const transcriptUrl = urlData.publicUrl;

    // Update payment_reports with document URL
    const { data: currentReport } = await supabase
      .from('payment_reports')
      .select('document_urls')
      .eq('id', report_id)
      .single();

    const existingUrls = currentReport?.document_urls || [];
    const updatedUrls = [...existingUrls, transcriptUrl];

    const { error: updateError } = await supabase
      .from('payment_reports')
      .update({ 
        document_urls: updatedUrls,
        arena_transcript_pdf_url: transcriptUrl, // Keep for backward compatibility
      })
      .eq('id', report_id);

    if (updateError) {
      throw new Error(`Failed to update report: ${updateError.message}`);
    }

    console.log(`[generate-arena-transcript] JSON transcript ZIP created and uploaded: ${transcriptUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        transcript_url: transcriptUrl,
        zip_file: fileName,
        data_summary: {
          messages: transcript.length,
          participants: participantsData.length,
          redirects: redirectsData.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('[generate-arena-transcript] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

