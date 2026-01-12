import { useState, useEffect } from "react";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Save, 
  Download,
  Loader2,
  Users,
  AlertCircle,
  Phone,
  Mail,
  Copy,
  ChevronDown,
  ChevronUp,
  Merge,
  Plus,
  X,
  AtSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  id: string;
  name: string;
  roles: string[];
  departments: string[];
  phones: string[];
  emails: string[];
  ig_handle: string | null;
}

interface DuplicateMatch {
  existingId: string;
  existingName: string;
  existingRoles: string[];
  existingDepartments: string[];
  existingPhones: string[];
  existingEmails: string[];
  existingIgHandle: string | null;
  matchedFields: ('name' | 'role' | 'phone' | 'email' | 'ig')[];
  matchScore: number;
  hasOverlap: boolean;
}

interface ContactWithDuplicate extends ParsedContact {
  originalIndex: number;
  potentialDuplicate: DuplicateMatch | null;
  decision: 'pending' | 'merge' | 'add_new' | 'skip';
}

interface ParseTiming {
  total_elapsed_ms: number;
  total_elapsed_formatted: string;
  model_used: string;
}

interface ActionLogEntry {
  action: string;
  timestamp: string;
  duration_ms?: number;
}

interface ParseSummaryPanelProps {
  callSheetId: string;
  fileName: string;
  parsedContacts: ParsedContact[];
  parsedDate: string | null;
  onComplete: () => void;
  userId: string;
  parseTiming?: ParseTiming | null;
  parseActionLog?: ActionLogEntry[] | null;
}

// Normalize phone number for matching (digits only)
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Normalize email for matching (lowercase, trimmed)
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Fuzzy name matching (from Extra Credit)
function fuzzyNameMatch(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  // Exact match (case-insensitive)
  if (n1 === n2) return true;
  
  // Split into parts
  const parts1 = n1.split(/\s+/);
  const parts2 = n2.split(/\s+/);
  
  // Single word names: check if one is prefix of other
  if (parts1.length < 2 || parts2.length < 2) {
    return n1.startsWith(n2) || n2.startsWith(n1);
  }
  
  // Compare last names (must match exactly)
  const last1 = parts1[parts1.length - 1];
  const last2 = parts2[parts2.length - 1];
  if (last1 !== last2) return false;
  
  // Compare first names (allow prefix matching: Josh ↔ Joshua)
  const first1 = parts1[0];
  const first2 = parts2[0];
  return first1.startsWith(first2) || first2.startsWith(first1);
}

// 2-of-5 matching algorithm (from Extra Credit)
function findPotentialMatch(
  parsed: { name: string; roles: string[]; phones: string[]; emails: string[]; igHandle: string | null },
  existingContacts: ExistingContact[]
): DuplicateMatch | null {
  let bestMatch: DuplicateMatch | null = null;
  
  // Pre-normalize parsed arrays once for consistent comparison
  const parsedPhonesNorm = parsed.phones.map(normalizePhone);
  const parsedEmailsNorm = parsed.emails.map(normalizeEmail);
  
  for (const existing of existingContacts) {
    const matchedFields: DuplicateMatch['matchedFields'] = [];
    let hasPhoneOrEmailMatch = false;
    
    // Debug for specific names (e.g., "Levi")
    const isDebugTarget = parsed.name.toLowerCase().includes('levi') || 
                          existing.name.toLowerCase().includes('levi');
    
    // Field 1: Name (fuzzy OR exact match)
    const exactNameMatch = parsed.name.toLowerCase().trim() === existing.name.toLowerCase().trim();
    if (fuzzyNameMatch(parsed.name, existing.name) || exactNameMatch) {
      matchedFields.push('name');
    }
    
    // Field 2: Role (any overlap)
    const existingRolesLower = (existing.roles || []).map(r => r.toLowerCase());
    if (parsed.roles.some(r => existingRolesLower.includes(r.toLowerCase()))) {
      matchedFields.push('role');
    }
    
    // Field 3: Phone (exact match, normalized)
    const existingPhonesNorm = (existing.phones || []).map(normalizePhone);
    const phoneMatch = parsedPhonesNorm.some(p => existingPhonesNorm.includes(p));
    if (phoneMatch) {
      matchedFields.push('phone');
      hasPhoneOrEmailMatch = true;
    }
    
    // Field 4: Email (case-insensitive)
    const existingEmailsNorm = (existing.emails || []).map(normalizeEmail);
    const emailMatch = parsedEmailsNorm.some(e => existingEmailsNorm.includes(e));
    if (emailMatch) {
      matchedFields.push('email');
      hasPhoneOrEmailMatch = true;
    }
    
    // Field 5: IG Handle (exact match, case-insensitive)
    const existingIg = existing.ig_handle?.toLowerCase().replace('@', '');
    const parsedIg = parsed.igHandle?.toLowerCase().replace('@', '');
    if (existingIg && parsedIg && existingIg === parsedIg) {
      matchedFields.push('ig');
      hasPhoneOrEmailMatch = true;
    }
    
    // Debug logging for target names
    if (isDebugTarget && matchedFields.length > 0) {
      console.log(`[DEBUG] "${parsed.name}" vs "${existing.name}" matched fields:`, matchedFields);
    }
    
    // Require 2+ matched fields
    if (matchedFields.length >= 2) {
      // Single-word name protection (Refinement #24)
      const isSingleWordName = parsed.name.trim().split(/\s+/).length === 1;
      if (isSingleWordName && !hasPhoneOrEmailMatch) {
        continue; // Skip - single-word name needs stronger evidence
      }
      
      // Check for data overlap (use already normalized arrays)
      const roleOverlap = parsed.roles.some(r => 
        existingRolesLower.includes(r.toLowerCase())
      );
      const phoneOverlap = parsedPhonesNorm.some(p => existingPhonesNorm.includes(p));
      const emailOverlap = parsedEmailsNorm.some(e => existingEmailsNorm.includes(e));
      const hasOverlap = roleOverlap || phoneOverlap || emailOverlap;
      
      const result: DuplicateMatch = {
        existingId: existing.id,
        existingName: existing.name,
        existingRoles: existing.roles || [],
        existingDepartments: existing.departments || [],
        existingPhones: existing.phones || [],
        existingEmails: existing.emails || [],
        existingIgHandle: existing.ig_handle,
        matchedFields,
        matchScore: matchedFields.length,
        hasOverlap
      };
      
      // Keep the best match (most fields matched)
      if (!bestMatch || result.matchScore > bestMatch.matchScore) {
        bestMatch = result;
      }
    }
  }
  
  return bestMatch;
}

export function ParseSummaryPanel({
  callSheetId,
  fileName,
  parsedContacts,
  parsedDate,
  onComplete,
  userId,
  parseTiming,
  parseActionLog
}: ParseSummaryPanelProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, Partial<ParsedContact>>>({});
  const [existingContacts, setExistingContacts] = useState<ExistingContact[]>([]);
  const [contactsWithDuplicates, setContactsWithDuplicates] = useState<ContactWithDuplicate[]>([]);
  const [duplicateCheckComplete, setDuplicateCheckComplete] = useState(false);
  const [expandedDuplicates, setExpandedDuplicates] = useState<Set<number>>(new Set());
  const [selectedNewContacts, setSelectedNewContacts] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  // Calculate stats
  const highConfidence = parsedContacts.filter(c => c.confidence >= 0.85).length;
  const lowConfidence = parsedContacts.filter(c => c.confidence >= 0.6 && c.confidence < 0.85).length;
  const missingPhone = parsedContacts.filter(c => !c.phones || c.phones.length === 0).length;
  const missingEmail = parsedContacts.filter(c => !c.emails || c.emails.length === 0).length;
  
  // Split contacts into duplicates and new contacts
  const duplicateContacts = contactsWithDuplicates.filter(c => c.potentialDuplicate);
  const newContacts = contactsWithDuplicates.filter(c => !c.potentialDuplicate);
  const duplicatesDetected = duplicateContacts.length;

  // Pending duplicates need decisions
  const pendingDuplicates = duplicateContacts.filter(c => c.decision === 'pending');
  
  // Calculate total contacts to save
  const duplicatesToSave = duplicateContacts.filter(c => c.decision !== 'skip' && c.decision !== 'pending');
  const newToSave = newContacts.filter((_, idx) => {
    const globalIdx = contactsWithDuplicates.indexOf(newContacts[idx]);
    return selectedNewContacts.has(globalIdx);
  });
  const totalToSave = duplicatesToSave.length + newToSave.length;

  useEffect(() => {
    async function initializePanel() {
      try {
        // Check admin status first (needed for dedup query scope)
        let userIsAdmin = false;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.rpc('has_role', {
            _user_id: user.id,
            _role: 'admin'
          });
          userIsAdmin = !!data;
          setIsAdmin(userIsAdmin);
        }

        // Build dedup query: admin can see seed contacts, regular users only see their own
        let dedupQuery = supabase
          .from('crew_contacts')
          .select('id, name, phones, emails, roles, departments, ig_handle');

        // User-scoped dedup: each user only sees their own contacts
        dedupQuery = dedupQuery.eq('user_id', userId);

        // Fetch existing contacts for duplicate detection (up to 10,000)
        const { data: existingContactsRaw, error } = await dedupQuery.limit(10000);
        
        if (error) {
          console.error('[ParseSummaryPanel] Failed to fetch existing contacts:', error);
        } else {
          const existing = (existingContactsRaw || []).map(c => ({
            id: c.id,
            name: c.name,
            roles: c.roles || [],
            departments: c.departments || [],
            phones: c.phones || [],
            emails: c.emails || [],
            ig_handle: c.ig_handle
          })) as ExistingContact[];
          
          setExistingContacts(existing);
          
          // Warn if exactly 1000 rows (may be truncated)
          if (existing.length === 1000) {
            console.warn('[ParseSummaryPanel] Exactly 1000 contacts returned - may be truncated');
          }

          console.log(`[ParseSummaryPanel] Running duplicate detection against ${existing.length} existing contacts for userId: ${userId}`);
          
          // Run duplicate detection for each parsed contact
          const contactsWithDups: ContactWithDuplicate[] = parsedContacts.map((contact, index) => {
            const searchParams = {
              name: contact.name,
              roles: contact.roles || [],
              phones: contact.phones || [],
              emails: contact.emails || [],
              igHandle: contact.ig_handle
            };
            
            // Debug log for specific names
            if (contact.name.toLowerCase().includes('levi')) {
              console.log(`[ParseSummaryPanel] Checking "${contact.name}":`, searchParams);
            }
            
            const match = findPotentialMatch(searchParams, existing);
            
            // Debug log match result for specific names
            if (contact.name.toLowerCase().includes('levi')) {
              console.log(`[ParseSummaryPanel] Match result for "${contact.name}":`, match ? {
                existingName: match.existingName,
                matchedFields: match.matchedFields,
                matchScore: match.matchScore
              } : 'NO MATCH');
            }
            
            return {
              ...contact,
              originalIndex: index,
              potentialDuplicate: match,
              decision: 'pending' as const
            };
          });
          
          // Summary log
          const duplicateCount = contactsWithDups.filter(c => c.potentialDuplicate).length;
          console.log(`[ParseSummaryPanel] Duplicate detection complete: ${duplicateCount}/${contactsWithDups.length} duplicates found`);
          
          setContactsWithDuplicates(contactsWithDups);
          setDuplicateCheckComplete(true);
          
          // Initialize all new contacts as selected by default
          const newContactIndices = contactsWithDups
            .map((c, idx) => (!c.potentialDuplicate ? idx : -1))
            .filter(idx => idx !== -1);
          setSelectedNewContacts(new Set(newContactIndices));
        }
      } catch (err) {
        console.error('[ParseSummaryPanel] Initialization error:', err);
      } finally {
        setLoading(false);
      }
    }
    
    initializePanel();
  }, [userId, parsedContacts]);

  const setDecision = (index: number, decision: 'merge' | 'add_new' | 'skip') => {
    setContactsWithDuplicates(prev => prev.map((c, i) => 
      i === index ? { ...c, decision } : c
    ));
  };

  const toggleExpanded = (index: number) => {
    setExpandedDuplicates(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const mergeAllDuplicates = () => {
    setContactsWithDuplicates(prev => prev.map(c => 
      c.potentialDuplicate ? { ...c, decision: 'merge' } : c
    ));
    toast({
      title: "All duplicates set to merge",
      description: `${duplicatesDetected} contacts will be merged with existing records.`
    });
  };

  const addAllDuplicates = () => {
    setContactsWithDuplicates(prev => prev.map(c => 
      c.potentialDuplicate ? { ...c, decision: 'add_new' } : c
    ));
    toast({
      title: "All duplicates set to add as new",
      description: `${duplicatesDetected} contacts will be added as new records.`
    });
  };

  const skipAllDuplicates = () => {
    setContactsWithDuplicates(prev => prev.map(c => 
      c.potentialDuplicate ? { ...c, decision: 'skip' } : c
    ));
    toast({
      title: "All duplicates skipped",
      description: `${duplicatesDetected} contacts will be skipped.`
    });
  };

  const toggleNewContactSelection = (globalIndex: number) => {
    setSelectedNewContacts(prev => {
      const next = new Set(prev);
      if (next.has(globalIndex)) {
        next.delete(globalIndex);
      } else {
        next.add(globalIndex);
      }
      return next;
    });
  };

  const toggleSelectAllNew = (checked: boolean) => {
    if (checked) {
      const newIndices = newContacts.map(c => contactsWithDuplicates.indexOf(c));
      setSelectedNewContacts(new Set(newIndices));
    } else {
      setSelectedNewContacts(new Set());
    }
  };

  const handleOverride = (index: number, field: keyof ParsedContact, value: string) => {
    setOverrides(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: field === 'name' ? value : value.split(',').map(s => s.trim()).filter(Boolean)
      }
    }));
  };

  const saveContacts = async () => {
    // Check for pending duplicates
    if (pendingDuplicates.length > 0) {
      toast({
        title: "Resolve duplicates first",
        description: `${pendingDuplicates.length} potential duplicates need a decision (Merge, Add New, or Skip).`,
        variant: "destructive"
      });
      return;
    }

    // Filter contacts based on decisions and checkbox selections
    const contactsToProcess = contactsWithDuplicates.filter((c, idx) => {
      if (c.potentialDuplicate) {
        // Duplicates: respect decision (merge or add_new, not skip or pending)
        return c.decision !== 'skip' && c.decision !== 'pending';
      } else {
        // New contacts: respect checkbox selection
        return selectedNewContacts.has(idx);
      }
    });
    
    if (contactsToProcess.length === 0) {
      toast({
        title: "No contacts to save",
        description: "No contacts selected.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    let merged = 0;
    let created = 0;
    let attributed = 0;
    let skippedAlreadyLinked = 0;
    
    // Bug #4: Track individual failures
    let failed = 0;
    const errors: string[] = [];

    try {
      // Fetch contacts already linked to THIS call sheet to prevent duplicates
      const { data: alreadyLinked } = await supabase
        .from('contact_call_sheets')
        .select('crew_contacts(name)')
        .eq('call_sheet_id', callSheetId);

      const alreadyLinkedNames = new Set(
        (alreadyLinked || [])
          .map(link => (link.crew_contacts as any)?.name?.toLowerCase())
          .filter(Boolean)
      );
      
      console.log(`[ParseSummaryPanel] Already linked to call sheet: ${alreadyLinkedNames.size} contacts`);

      for (const contact of contactsToProcess) {
        // Skip if this person is already linked to this call sheet
        if (alreadyLinkedNames.has(contact.name.toLowerCase())) {
          console.log(`[ParseSummaryPanel] Skipping ${contact.name} - already linked`);
          skippedAlreadyLinked++;
          continue;
        }
        
        // Bug #4: Wrap each contact in try/catch to continue on failure
        try {
          const override = overrides[contact.originalIndex] || {};
          const finalContact = {
            ...contact,
            ...override
          };

          let contactId: string;

          if (contact.decision === 'merge' && contact.potentialDuplicate) {
            // Merge with existing contact
            const existing = existingContacts.find(e => e.id === contact.potentialDuplicate!.existingId);
            if (!existing) {
              throw new Error('Existing contact not found for merge');
            }

            contactId = existing.id;

            const mergedRoles = [...new Set([...existing.roles, ...(finalContact.roles || [])])];
            const mergedDepartments = [...new Set([...existing.departments, ...(finalContact.departments || [])])];
            const mergedEmails = [...new Set([...existing.emails, ...(finalContact.emails || [])])];
            const mergedPhones = [...new Set([...existing.phones, ...(finalContact.phones || [])])];

            const { error: updateError } = await supabase
              .from('crew_contacts')
              .update({
                roles: mergedRoles,
                departments: mergedDepartments,
                emails: mergedEmails,
                phones: mergedPhones,
                ig_handle: finalContact.ig_handle || existing.ig_handle
              })
              .eq('id', contactId);

            // Bug #4: Check for update errors
            if (updateError) {
              throw new Error(`Merge failed: ${updateError.message}`);
            }

            merged++;
          } else {
            // Create new contact
            const { data: newContact, error: insertError } = await supabase
              .from('crew_contacts')
              .insert({
                user_id: userId,
                name: finalContact.name,
                roles: finalContact.roles,
                departments: finalContact.departments,
                phones: finalContact.phones,
                emails: finalContact.emails,
                ig_handle: finalContact.ig_handle,
                confidence: finalContact.confidence,
                source_files: [fileName],
                needs_review: finalContact.confidence < 0.8
              })
              .select('id')
              .single();

            if (insertError) {
              throw new Error(`Insert failed: ${insertError.message}`);
            }

            contactId = newContact.id;
            created++;
          }

          // Create attribution link
          const { error: linkError } = await supabase
            .from('contact_call_sheets')
            .upsert({
              contact_id: contactId,
              call_sheet_id: callSheetId
            }, { onConflict: 'contact_id,call_sheet_id' });

          if (!linkError) attributed++;
        } catch (contactError: any) {
          // Bug #4: Log and track per-contact failures, continue with others
          console.error(`[ParseSummaryPanel] Error processing "${contact.name}":`, contactError);
          errors.push(`"${contact.name}": ${contactError.message}`);
          failed++;
          continue;
        }
      }

      // Bug #4: Show partial success if some failed
      if (failed > 0) {
        toast({
          title: "Partial success",
          description: `Merged ${merged}, created ${created}, ${failed} failed. See console for details.`,
          variant: "destructive"
        });
        console.error('[ParseSummaryPanel] Failed operations:', errors);
      } else {
        toast({
          title: "Contacts saved",
          description: `Merged ${merged}, created ${created} contacts. ${attributed} attributions added.`
        });
      }

      // Bug #5: Refresh existingContacts after merges to prevent stale duplicate detection
      if (merged > 0) {
        try {
          const { data: refreshedContacts } = await supabase
            .from('crew_contacts')
            .select('id, name, phones, emails, roles, departments, ig_handle')
            .eq('user_id', userId)
            .limit(10000);
          
          if (refreshedContacts) {
            const updated = refreshedContacts.map(c => ({
              id: c.id,
              name: c.name,
              roles: c.roles || [],
              departments: c.departments || [],
              phones: c.phones || [],
              emails: c.emails || [],
              ig_handle: c.ig_handle
            })) as ExistingContact[];
            
            setExistingContacts(updated);
            console.log('[ParseSummaryPanel] Refreshed existingContacts after merge');
          }
        } catch (err) {
          console.warn('[ParseSummaryPanel] Failed to refresh existingContacts:', err);
          // Non-fatal - continue anyway
        }
      }

      // Only call onComplete if at least some succeeded
      if (merged > 0 || created > 0) {
        onComplete();
      }
    } catch (error: any) {
      console.error('[ParseSummaryPanel] Save error:', error);
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const exportReport = (format: 'json' | 'csv') => {
    const contacts = contactsWithDuplicates.filter(c => c.decision !== 'skip');
    
    if (format === 'json') {
      // Build enhanced report matching user's sample format
      const report = {
        source_file: fileName,
        parsed_at: parsedDate || new Date().toISOString(),
        timing: parseTiming || {
          total_elapsed_ms: 0,
          total_elapsed_formatted: "N/A",
          model_used: "google/gemini-2.5-flash"
        },
        action_log: parseActionLog || [],
        summary: {
          total: parsedContacts.length,
          high_confidence: highConfidence,
          low_confidence: lowConfidence,
          needs_review: parsedContacts.filter(c => c.confidence < 0.8).length,
          missing_phone: missingPhone,
          missing_email: missingEmail
        },
        warnings: [] as string[],
        unmapped_data: {
          emails: [] as string[],
          phones: [] as string[]
        },
        contacts: contacts.map(c => ({
          name: c.name,
          roles: c.roles,
          departments: c.departments,
          phones: c.phones,
          emails: c.emails,
          ig_handle: c.ig_handle,
          confidence: c.confidence,
          needs_review: c.confidence < 0.8,
          is_duplicate: !!c.potentialDuplicate
        }))
      };
      
      // Use readable filename with timestamp
      const safeName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const downloadName = `${safeName}_parse_report_${timestamp}.json`;
      
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['Name', 'Roles', 'Departments', 'Phones', 'Emails', 'IG Handle', 'Confidence', 'Duplicate Match'];
      const rows = contacts.map(c => [
        c.name,
        c.roles.join('; '),
        c.departments.join('; '),
        c.phones.join('; '),
        c.emails.join('; '),
        c.ig_handle || '',
        c.confidence.toString(),
        c.potentialDuplicate ? `${c.potentialDuplicate.existingName} (${c.potentialDuplicate.matchedFields.join('+')})` : ''
      ]);
      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parse-report-${callSheetId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.85) {
      return <Badge className="bg-green-500 text-xs">High</Badge>;
    } else if (confidence >= 0.6) {
      return <Badge variant="secondary" className="text-xs">Medium</Badge>;
    } else {
      return <Badge variant="outline" className="text-xs">Low</Badge>;
    }
  };

  const getDecisionBadge = (contact: ContactWithDuplicate) => {
    if (!contact.potentialDuplicate) return null;
    
    switch (contact.decision) {
      case 'merge':
        return <Badge className="bg-blue-500 text-xs">Will Merge</Badge>;
      case 'add_new':
        return <Badge className="bg-green-500 text-xs">Add New</Badge>;
      case 'skip':
        return <Badge variant="outline" className="text-xs">Skipped</Badge>;
      default:
        return <Badge className="bg-yellow-500 text-yellow-50 text-xs">Needs Decision</Badge>;
    }
  };

  const formatMatchedFields = (fields: DuplicateMatch['matchedFields']) => {
    const labels: Record<string, string> = {
      name: 'Name',
      role: 'Role',
      phone: 'Phone',
      email: 'Email',
      ig: 'IG Handle'
    };
    return fields.map(f => labels[f]).join(' + ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header + Compact Stats */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Parse Summary</h2>
          </div>
          {parsedDate && (
            <span className="text-xs text-muted-foreground">
              {format(new Date(parsedDate), "MMM d, yyyy")}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mb-2">{fileName}</p>
        
        {/* Compact inline stats */}
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{parsedContacts.length}</span>
            <span className="text-muted-foreground">extracted</span>
          </div>
          {duplicatesDetected > 0 && (
            <div className="flex items-center gap-1">
              <Copy className="h-3.5 w-3.5 text-yellow-500" />
              <span className="font-medium text-yellow-500">{duplicatesDetected}</span>
              <span className="text-yellow-500">duplicates</span>
            </div>
          )}
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-1">
            <span className="font-medium">{selectedNewContacts.size}</span>
            <span className="text-muted-foreground">of</span>
            <span className="font-medium">{newContacts.length}</span>
            <span className="text-muted-foreground">new selected</span>
          </div>
        </div>
      </div>

      {/* Admin Export or Non-Admin Advisory */}
      <div className="px-4 py-2 border-b">
        {isAdmin ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportReport('json')}>
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportReport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        ) : (
          <Card className="bg-muted/20 border-muted">
            <CardContent className="p-3">
              <p className="text-sm text-muted-foreground">
                Leaked Liability utilizes AI to parse and sort crew contact information. 
                AI can make mistakes. Review this summary carefully and amend any incorrect 
                details before saving.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contacts List - Split into two sections */}
      <ScrollArea className="flex-1">
        {/* DUPLICATES SECTION */}
        {duplicateContacts.length > 0 && (
          <div className="border-b">
            {/* Section Header */}
            <div className="px-4 py-2 bg-yellow-500/10 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-500">
                  {duplicateContacts.length} POTENTIAL DUPLICATE{duplicateContacts.length !== 1 ? 'S' : ''} — CHOOSE ACTION FOR EACH
                </span>
                {pendingDuplicates.length > 0 && (
                  <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">
                    {pendingDuplicates.length} pending
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Quick Actions Bar */}
            <div className="px-4 py-2 flex items-center gap-2 border-b bg-muted/30">
              <span className="text-xs text-muted-foreground">Quick Actions:</span>
              <Button variant="outline" size="sm" onClick={mergeAllDuplicates} className="text-xs h-7">
                <Merge className="h-3 w-3 mr-1" /> Merge All
              </Button>
              <Button variant="outline" size="sm" onClick={addAllDuplicates} className="text-xs h-7">
                <Plus className="h-3 w-3 mr-1" /> Add All
              </Button>
              <Button variant="ghost" size="sm" onClick={skipAllDuplicates} className="text-xs h-7">
                <X className="h-3 w-3 mr-1" /> Skip All
              </Button>
            </div>
            
            {/* Duplicate contact cards */}
            <div className="p-4 space-y-3">
              {duplicateContacts.map((contact) => {
                const globalIndex = contactsWithDuplicates.indexOf(contact);
                const override = overrides[contact.originalIndex] || {};
                const displayName = override.name !== undefined ? override.name : contact.name;
                const displayRoles = override.roles !== undefined ? override.roles : contact.roles;
                const displayDepartments = override.departments !== undefined ? override.departments : contact.departments;
                const isExpanded = expandedDuplicates.has(globalIndex);
                const isSkipped = contact.decision === 'skip';

                return (
                  <Card 
                    key={globalIndex} 
                    className={`${isSkipped ? 'opacity-50' : ''} ${contact.decision === 'pending' ? 'border-yellow-500/50' : ''}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <Input
                              value={displayName}
                              onChange={(e) => handleOverride(contact.originalIndex, 'name', e.target.value)}
                              className="h-8 font-medium"
                              placeholder="Name"
                              disabled={isSkipped}
                            />
                            <div className="flex items-center gap-1">
                              {getDecisionBadge(contact)}
                              {getConfidenceBadge(contact.confidence)}
                            </div>
                          </div>
                          
                          <Input
                            value={Array.isArray(displayRoles) ? displayRoles.join(', ') : ''}
                            onChange={(e) => handleOverride(contact.originalIndex, 'roles' as keyof ParsedContact, e.target.value)}
                            className="h-7 text-xs"
                            placeholder="Roles (comma-separated)"
                            disabled={isSkipped}
                          />
                          
                          <Input
                            value={Array.isArray(displayDepartments) ? displayDepartments.join(', ') : ''}
                            onChange={(e) => handleOverride(contact.originalIndex, 'departments' as keyof ParsedContact, e.target.value)}
                            className="h-7 text-xs"
                            placeholder="Departments (comma-separated)"
                            disabled={isSkipped}
                          />

                          <div className="flex gap-4 text-xs text-muted-foreground">
                            {contact.phones?.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {contact.phones[0]}
                              </span>
                            )}
                            {contact.emails?.length > 0 && (
                              <span className="flex items-center gap-1 truncate">
                                <Mail className="h-3 w-3" />
                                {contact.emails[0]}
                              </span>
                            )}
                            {contact.ig_handle && (
                              <span className="flex items-center gap-1 text-purple-400">
                                <AtSign className="h-3 w-3" />
                                {contact.ig_handle}
                              </span>
                            )}
                          </div>

                          {/* Duplicate Detection UI */}
                          {contact.potentialDuplicate && (
                            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(globalIndex)}>
                              <div className="mt-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/30">
                                <CollapsibleTrigger asChild>
                                  <div className="flex items-center justify-between cursor-pointer">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-yellow-500 text-yellow-50 text-xs">
                                        Potential Duplicate
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        Matched: {formatMatchedFields(contact.potentialDuplicate.matchedFields)}
                                      </span>
                                    </div>
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </CollapsibleTrigger>
                                
                                <CollapsibleContent>
                                  <Separator className="my-2" />
                                  
                                  {/* Side-by-side comparison */}
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <p className="font-medium text-muted-foreground mb-1">Existing Contact</p>
                                      <p className="font-medium">{contact.potentialDuplicate.existingName}</p>
                                      {contact.potentialDuplicate.existingRoles.length > 0 && (
                                        <p className="text-muted-foreground">{contact.potentialDuplicate.existingRoles.join(', ')}</p>
                                      )}
                                      {contact.potentialDuplicate.existingPhones.length > 0 && (
                                        <p className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {contact.potentialDuplicate.existingPhones[0]}
                                        </p>
                                      )}
                                      {contact.potentialDuplicate.existingEmails.length > 0 && (
                                        <p className="flex items-center gap-1 truncate">
                                          <Mail className="h-3 w-3" />
                                          {contact.potentialDuplicate.existingEmails[0]}
                                        </p>
                                      )}
                                      {contact.potentialDuplicate.existingIgHandle && (
                                        <p className="flex items-center gap-1 text-purple-400">
                                          <AtSign className="h-3 w-3" />
                                          {contact.potentialDuplicate.existingIgHandle}
                                        </p>
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium text-muted-foreground mb-1">Parsed Contact</p>
                                      <p className="font-medium">{contact.name}</p>
                                      {contact.roles.length > 0 && (
                                        <p className="text-muted-foreground">{contact.roles.join(', ')}</p>
                                      )}
                                      {contact.phones?.length > 0 && (
                                        <p className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {contact.phones[0]}
                                        </p>
                                      )}
                                      {contact.emails?.length > 0 && (
                                        <p className="flex items-center gap-1 truncate">
                                          <Mail className="h-3 w-3" />
                                          {contact.emails[0]}
                                        </p>
                                      )}
                                      {contact.ig_handle && (
                                        <p className="flex items-center gap-1 text-purple-400">
                                          <AtSign className="h-3 w-3" />
                                          {contact.ig_handle}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Overlap indicator */}
                                  <div className="mt-2 text-xs">
                                    {contact.potentialDuplicate.hasOverlap ? (
                                      <p className="text-green-500 flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        Some data overlaps — likely the same person
                                      </p>
                                    ) : (
                                      <p className="text-yellow-500 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        No overlapping data — could be a different person
                                      </p>
                                    )}
                                  </div>

                                  {/* Decision buttons */}
                                  <div className="flex gap-2 mt-3">
                                    <Button 
                                      size="sm" 
                                      variant={contact.decision === 'merge' ? 'default' : 'outline'}
                                      onClick={() => setDecision(globalIndex, 'merge')}
                                      className="text-xs"
                                    >
                                      <Merge className="h-3 w-3 mr-1" />
                                      Merge
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant={contact.decision === 'add_new' ? 'default' : 'outline'}
                                      onClick={() => setDecision(globalIndex, 'add_new')}
                                      className="text-xs"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add New
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant={contact.decision === 'skip' ? 'destructive' : 'ghost'}
                                      onClick={() => setDecision(globalIndex, 'skip')}
                                      className="text-xs"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Skip
                                    </Button>
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* NEW CONTACTS SECTION */}
        {newContacts.length > 0 && (
          <div>
            {/* Section Header with Select All */}
            <div className="px-4 py-2 bg-muted/30 flex items-center gap-3 border-b sticky top-0 z-10">
              <Checkbox 
                checked={selectedNewContacts.size === newContacts.length && newContacts.length > 0}
                onCheckedChange={(checked) => toggleSelectAllNew(!!checked)}
              />
              <span className="text-sm font-medium text-muted-foreground">
                {newContacts.length} NEW CONTACT{newContacts.length !== 1 ? 'S' : ''}
              </span>
              <span className="text-xs text-muted-foreground">
                ({selectedNewContacts.size} selected)
              </span>
            </div>
            
            {/* New contact rows with checkboxes */}
            <div className="divide-y">
              {newContacts.map((contact) => {
                const globalIndex = contactsWithDuplicates.indexOf(contact);
                const isSelected = selectedNewContacts.has(globalIndex);

                return (
                  <div 
                    key={globalIndex} 
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors ${!isSelected ? 'opacity-50' : ''}`}
                  >
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => toggleNewContactSelection(globalIndex)}
                    />
                    
                    {/* Contact info row */}
                    <div className="flex-1 grid grid-cols-5 gap-2 items-center text-sm">
                      <span className="font-medium truncate">{contact.name}</span>
                      <span className="text-muted-foreground truncate">{contact.roles?.[0] || '—'}</span>
                      <span className="text-muted-foreground truncate">{contact.departments?.[0] || '—'}</span>
                      <span className="text-muted-foreground truncate flex items-center gap-1">
                        {contact.phones?.[0] ? (
                          <>
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            {contact.phones[0]}
                          </>
                        ) : '—'}
                      </span>
                      <span className="text-muted-foreground truncate flex items-center gap-1">
                        {contact.emails?.[0] ? (
                          <>
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            {contact.emails[0]}
                          </>
                        ) : contact.ig_handle ? (
                          <>
                            <AtSign className="h-3 w-3 flex-shrink-0 text-purple-400" />
                            <span className="text-purple-400">{contact.ig_handle}</span>
                          </>
                        ) : '—'}
                      </span>
                    </div>
                    
                    {/* Confidence badge */}
                    <div className="flex-shrink-0">
                      {getConfidenceBadge(contact.confidence)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-center justify-between mb-2">
          {pendingDuplicates.length > 0 && (
            <span className="text-yellow-500 text-sm">
              {pendingDuplicates.length} duplicate{pendingDuplicates.length !== 1 ? 's' : ''} need{pendingDuplicates.length === 1 ? 's' : ''} a decision
            </span>
          )}
          {pendingDuplicates.length === 0 && totalToSave === 0 && (
            <span className="text-muted-foreground text-sm">
              No contacts selected
            </span>
          )}
        </div>
        <Button 
          onClick={saveContacts} 
          disabled={saving || pendingDuplicates.length > 0 || totalToSave === 0}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : pendingDuplicates.length > 0 ? (
            <>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Resolve {pendingDuplicates.length} Duplicate{pendingDuplicates.length !== 1 ? 's' : ''} First
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Add {totalToSave} Contact{totalToSave !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
