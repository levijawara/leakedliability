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

interface ReviewStats {
  missingEmails: number;
  missingPhones: number;
  lowConfidence: number;
  potentialDupes: string[];
}

interface RequestPayload {
  call_sheet_id: string;
  original_file_name: string;
  parsed_contacts: ParsedContact[];
  excluded_indices: number[];
  existing_contacts: ExistingContact[];
  user_message: string;
  review_stats?: ReviewStats;
  pdf_visible?: boolean;
  active_filter?: string | null;
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
      user_message,
      review_stats,
      pdf_visible,
      active_filter,
    } = payload;

    // Build context for the AI
    const includedCount = parsed_contacts.length - excluded_indices.length;
    const excludedCount = excluded_indices.length;
    
    const contactSummary = parsed_contacts.map((c, i) => {
      const isExcluded = excluded_indices.includes(i);
      const missingInfo = [];
      if (c.emails.length === 0) missingInfo.push('no email');
      if (c.phones.length === 0) missingInfo.push('no phone');
      const infoStr = missingInfo.length > 0 ? ` (${missingInfo.join(', ')})` : '';
      return `${i}. ${c.name} [${c.roles.join(', ') || 'no role'}]${infoStr}${isExcluded ? ' [EXCLUDED]' : ''}`;
    }).join('\n');

    const existingSummary = existing_contacts.length > 0
      ? `User's existing contacts (for duplicate detection):\n${existing_contacts.slice(0, 20).map(c => `- ${c.name}`).join('\n')}${existing_contacts.length > 20 ? `\n... and ${existing_contacts.length - 20} more` : ''}`
      : 'User has no existing contacts yet.';

    // Build review status section
    let statusSection = '';
    if (review_stats) {
      statusSection = `
REVIEW STATUS:
- Missing email: ${review_stats.missingEmails} contacts
- Missing phone: ${review_stats.missingPhones} contacts
- Low confidence (<80%): ${review_stats.lowConfidence} contacts
- Potential duplicates: ${review_stats.potentialDupes.length > 0 ? review_stats.potentialDupes.join(', ') : 'None detected'}
- PDF viewer: ${pdf_visible ? 'visible' : 'hidden'}
- Active filter: ${active_filter || 'none'}
`;
    }

    const systemPrompt = `You are LL Chat, an assistant helping finalize contacts from a parsed call sheet.

FILE: ${original_file_name}
TOTAL CONTACTS: ${parsed_contacts.length}
INCLUDED: ${includedCount}
EXCLUDED: ${excludedCount}
${statusSection}
PARSED CONTACTS (index. name [roles] notes):
${contactSummary}

${existingSummary}

All contacts are INCLUDED by default. Help users review, filter, and finalize before saving.

## AVAILABLE ACTIONS
Return JSON on its own line to execute actions:

### Contact Management
- Exclude contacts: {"action": "exclude", "indices": [0, 5]}
- Include contacts: {"action": "include", "indices": [3]}

### Saving (SEPARATED from navigation)
- Save all included: {"action": "save_all"} — saves and STAYS on page
- Save and prompt for navigation: {"action": "save_and_go"} — saves, then asks if user wants to navigate
- Navigate to IG matching: {"action": "go_to_ig_matching"} — only use when user explicitly asks to leave

### Page Controls
- Toggle PDF viewer: {"action": "toggle_pdf"}
- Jump to contact row: {"action": "jump_to_contact", "index": 5}
- Filter table view: {"action": "filter_view", "filter": "missing_email"} 
  Valid filters: "excluded", "included", "missing_email", "missing_phone", "duplicates", "low_confidence", null (clear)

## CRITICAL RULES
1. "Save everyone" or "Save all" = save_all (stays on page, does NOT navigate)
2. "Save and go to IG matching" = save_and_go (saves, then confirms before navigating)
3. "Take me to IG matching" or "I'm done" = go_to_ig_matching (explicit navigation request)
4. NEVER auto-navigate. Navigation requires explicit user intent.
5. When user asks "what's missing?" — describe the review_stats and offer to filter

## EXAMPLES
User: "Exclude the stylists"
→ Find contacts with stylist roles, return exclude action

User: "Show me people without emails"
→ Return filter_view with "missing_email"

User: "Save everyone"
→ Return save_all (NO navigation)

User: "I'm done, take me to IG matching"
→ Return go_to_ig_matching

User: "Save and go to IG matching"
→ Return save_and_go

User: "What's left to review?"
→ Summarize the review stats, suggest filters

Be direct. Be efficient. Slightly sarcastic. You have other call sheets to process.`;

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
        max_tokens: 600,
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
    const actions: Array<{ 
      type: string; 
      indices?: number[]; 
      index?: number;
      filter?: string | null;
    }> = [];
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
          } else if (actionData.action === 'save_and_go') {
            actions.push({ type: 'save_and_go' });
          } else if (actionData.action === 'go_to_ig_matching') {
            actions.push({ type: 'go_to_ig_matching' });
          } else if (actionData.action === 'toggle_pdf') {
            actions.push({ type: 'toggle_pdf' });
          } else if (actionData.action === 'jump_to_contact' && typeof actionData.index === 'number') {
            actions.push({ type: 'jump_to_contact', index: actionData.index });
          } else if (actionData.action === 'filter_view') {
            actions.push({ type: 'filter_view', filter: actionData.filter ?? null });
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
