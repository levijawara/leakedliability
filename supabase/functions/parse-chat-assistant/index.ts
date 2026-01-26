import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedContact {
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
  confidence: number;
}

interface ExistingContact {
  name: string;
  emails: string[];
  phones: string[];
}

interface RequestPayload {
  call_sheet_id: string;
  original_file_name: string;
  parsed_contacts: ParsedContact[];
  excluded_indices: number[];
  existing_contacts: ExistingContact[];
  user_message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const payload: RequestPayload = await req.json();
    const { 
      original_file_name, 
      parsed_contacts, 
      excluded_indices, 
      existing_contacts, 
      user_message 
    } = payload;

    // Build context for the AI
    const includedCount = parsed_contacts.length - excluded_indices.length;
    const excludedCount = excluded_indices.length;
    
    const contactSummary = parsed_contacts.map((c, i) => {
      const isExcluded = excluded_indices.includes(i);
      return `${i + 1}. ${c.name} (${c.roles.join(', ') || 'no role'}) ${isExcluded ? '[EXCLUDED]' : ''}`;
    }).join('\n');

    const existingSummary = existing_contacts.length > 0
      ? `User's existing contacts (for duplicate detection):\n${existing_contacts.map(c => `- ${c.name}`).join('\n')}`
      : 'User has no existing contacts yet.';

    const systemPrompt = `You are LL Chat, an assistant helping finalize contacts from a parsed call sheet.

FILE: ${original_file_name}
TOTAL CONTACTS: ${parsed_contacts.length}
INCLUDED: ${includedCount}
EXCLUDED: ${excludedCount}

PARSED CONTACTS:
${contactSummary}

${existingSummary}

All contacts are INCLUDED by default. Help users EXCLUDE contacts they don't want before bulk saving.

You can perform these actions by including them in your response:
- To exclude contacts: Include JSON like {"action": "exclude", "indices": [0, 5]} with 0-based indices
- To include (re-add) contacts: Include JSON like {"action": "include", "indices": [3]}
- To trigger save all: Include JSON like {"action": "save_all"}

When the user says things like:
- "Exclude Blake" → Find Blake's index and return exclude action
- "Exclude the stylists" → Find all contacts with stylist roles and exclude them
- "Save everyone" → Return save_all action
- "Who's a duplicate?" → List contacts that might match existing ones

Be direct. Be efficient. Slightly sarcastic. You have other call sheets to process.

IMPORTANT: Always respond with a brief message AND any action JSON on separate lines. The action JSON must be valid JSON on its own line.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: user_message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[parse-chat-assistant] AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Parse actions from response
    const actions: Array<{ type: string; indices?: number[] }> = [];
    const lines = content.split('\n');
    let textResponse = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const actionData = JSON.parse(trimmed);
          if (actionData.action === 'exclude' && Array.isArray(actionData.indices)) {
            actions.push({ type: 'exclude', indices: actionData.indices });
          } else if (actionData.action === 'include' && Array.isArray(actionData.indices)) {
            actions.push({ type: 'include', indices: actionData.indices });
          } else if (actionData.action === 'save_all') {
            actions.push({ type: 'save_all' });
          }
        } catch {
          // Not valid JSON, treat as text
          textResponse += line + '\n';
        }
      } else {
        textResponse += line + '\n';
      }
    }

    return new Response(
      JSON.stringify({
        response: textResponse.trim() || 'Done.',
        actions,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[parse-chat-assistant] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        response: 'Something went wrong. Try again.',
        actions: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
