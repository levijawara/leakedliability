import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "resend";
import { renderAsync } from '@react-email/components';
import React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Hr,
  Link,
  Preview,
  Text,
} from '@react-email/components';

// Shared email styles (matching other templates)
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: 'IBM Plex Mono, monospace',
};

const container = {
  paddingLeft: '12px',
  paddingRight: '12px',
  margin: '0 auto',
  paddingTop: '40px',
  paddingBottom: '40px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  margin: '40px 0 20px',
  fontFamily: 'IBM Plex Mono, monospace',
};

const text = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  fontFamily: 'IBM Plex Mono, monospace',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  marginTop: '30px',
  fontFamily: 'IBM Plex Mono, monospace',
};

const hr = {
  borderColor: '#e1e8ed',
  margin: '32px 0',
};

const linkStyle = {
  color: '#2754C5',
  textDecoration: 'underline',
};

// Regex to detect URLs (http/https)
const URL_REGEX = /(https?:\/\/[^\s<>]+)/g;

// Function to convert text with URLs into React elements with clickable links
const renderTextWithLinks = (inputText: string): React.ReactNode[] => {
  const parts = inputText.split(URL_REGEX);
  return parts.map((part, i) => {
    // Check if this part is a URL
    if (/^https?:\/\//.test(part)) {
      return React.createElement(Link, { 
        key: i, 
        href: part, 
        style: linkStyle,
      }, part);
    }
    return part;
  });
};

interface CustomBroadcastProps {
  subject: string;
  bodyText: string;
  senderName?: string;
  footerText?: string;
  footerContactText?: string;
}

const CustomBroadcastEmail = ({
  subject,
  bodyText,
  senderName = 'The Leaked Liability Team',
  footerText = "You're receiving this email because you have an account on Leaked Liability.",
  footerContactText = 'Questions? Visit leakedliability.com/faq or reply to this email.',
}: CustomBroadcastProps) => {
  // Convert newlines to <br /> tags AND auto-link URLs
  const formattedBody = bodyText.split('\n').map((line: string, index: number, array: string[]) => (
    React.createElement(React.Fragment, { key: index },
      ...renderTextWithLinks(line),
      index < array.length - 1 && React.createElement('br')
    )
  ));

  // Also auto-link footer text
  const formattedFooter = renderTextWithLinks(footerText);
  const formattedFooterContact = renderTextWithLinks(footerContactText);

  return React.createElement(Html, null,
    React.createElement(Head),
    React.createElement(Preview, null, subject),
    React.createElement(Body, { style: main },
      React.createElement(Container, { style: container },
        React.createElement(Heading, { style: h1 }, subject),
        React.createElement(Text, { style: text }, formattedBody),
        React.createElement(Text, { style: text },
          'Best regards,',
          React.createElement('br'),
          senderName
        ),
        React.createElement(Hr, { style: hr }),
        React.createElement(Text, { style: footer },
          ...formattedFooter,
          React.createElement('br'),
          ...formattedFooterContact
        )
      )
    )
  );
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BroadcastRequest {
  subject: string;
  bodyText: string;
  recipients: string[];
  senderName?: string;
  footerText?: string;
  footerContactText?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[send-broadcast-email] Starting broadcast email send");

    // Initialize Supabase client with auth header
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      console.error("[send-broadcast-email] Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth token to validate user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from token
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error("[send-broadcast-email] Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-broadcast-email] User authenticated:", user.id);

    // Use service role client for admin check
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin status
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("[send-broadcast-email] Admin check failed:", roleError);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-broadcast-email] Admin status verified");

    // Parse request body
    const { 
      subject, 
      bodyText, 
      recipients, 
      senderName,
      footerText,
      footerContactText 
    }: BroadcastRequest = await req.json();

    // Validate required fields
    if (!subject?.trim()) {
      return new Response(
        JSON.stringify({ error: "Subject is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!bodyText?.trim()) {
      return new Response(
        JSON.stringify({ error: "Body text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipients?.length) {
      return new Response(
        JSON.stringify({ error: "At least one recipient is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-broadcast-email] Sending to ${recipients.length} recipients`);

    // Initialize Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[send-broadcast-email] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Render the email template
    const html = await renderAsync(
      React.createElement(CustomBroadcastEmail, {
        subject,
        bodyText,
        senderName,
        footerText,
        footerContactText,
      })
    );

    // Track results
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Send emails with delay to avoid rate limits
    for (const recipient of recipients) {
      try {
        const { error: sendError } = await resend.emails.send({
          from: "Leaked Liability <notifications@leakedliability.com>",
          to: [recipient],
          subject: subject,
          html,
        });

        if (sendError) {
          console.error(`[send-broadcast-email] Failed to send to ${recipient}:`, sendError);
          errors.push(`${recipient}: ${sendError.message || 'Send failed'}`);
          failedCount++;
        } else {
          console.log(`[send-broadcast-email] Sent to ${recipient}`);
          successCount++;
        }

        // Log to email_logs table
        await supabase.from("email_logs").insert({
          email_type: "custom_broadcast",
          recipient_email: recipient,
          subject: subject,
          status: sendError ? "failed" : "sent",
          error_message: sendError?.message || null,
          sent_at: sendError ? null : new Date().toISOString(),
          metadata: {
            admin_id: user.id,
            sender_name: senderName,
            total_recipients: recipients.length,
          },
        });

        // Delay between sends (550ms) to respect Resend's 2 requests/second rate limit
        await new Promise(resolve => setTimeout(resolve, 550));
      } catch (err: any) {
        console.error(`[send-broadcast-email] Error sending to ${recipient}:`, err);
        errors.push(`${recipient}: ${err.message || 'Unknown error'}`);
        failedCount++;
      }
    }

    console.log(`[send-broadcast-email] Complete: ${successCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: successCount,
        failed: failedCount,
        errors: errors.slice(0, 10), // Only return first 10 errors
        total: recipients.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-broadcast-email] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
