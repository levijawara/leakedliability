import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, Phone, AlertTriangle, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fuzzyNameMatch, normalizeEmail, normalizePhone } from "@/lib/duplicateDetection";

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

interface ParsedContactsTableProps {
  contacts: ParsedContact[];
  excludedIndices: Set<number>;
  onToggleExclude: (index: number) => void;
  onEditContact: (contact: ParsedContact, index: number) => void;
  existingContacts: ExistingContact[];
  onShiftSelect?: (fromIndex: number, toIndex: number) => void;
}

// Check if a parsed contact has a potential duplicate in existing contacts
function hasPotentialDuplicate(
  parsed: ParsedContact,
  existingContacts: ExistingContact[]
): boolean {
  const parsedPhonesNorm = parsed.phones.map(normalizePhone);
  const parsedEmailsNorm = parsed.emails.map(normalizeEmail);

  for (const existing of existingContacts) {
    let matchCount = 0;
    let hasPhoneOrEmailMatch = false;

    // Name match
    if (fuzzyNameMatch(parsed.name, existing.name)) {
      matchCount++;
    }

    // Role match
    const existingRolesLower = (existing.roles || []).map(r => r.toLowerCase());
    if (parsed.roles.some(r => existingRolesLower.includes(r.toLowerCase()))) {
      matchCount++;
    }

    // Phone match
    const existingPhonesNorm = (existing.phones || []).map(normalizePhone);
    if (parsedPhonesNorm.some(p => existingPhonesNorm.includes(p))) {
      matchCount++;
      hasPhoneOrEmailMatch = true;
    }

    // Email match
    const existingEmailsNorm = (existing.emails || []).map(normalizeEmail);
    if (parsedEmailsNorm.some(e => existingEmailsNorm.includes(e))) {
      matchCount++;
      hasPhoneOrEmailMatch = true;
    }

    // IG match
    const existingIg = existing.ig_handle?.toLowerCase().replace('@', '');
    const parsedIg = parsed.ig_handle?.toLowerCase().replace('@', '');
    if (existingIg && parsedIg && existingIg === parsedIg) {
      matchCount++;
      hasPhoneOrEmailMatch = true;
    }

    // 2+ matches = potential duplicate
    if (matchCount >= 2) {
      const isSingleWordName = parsed.name.trim().split(/\s+/).length === 1;
      if (isSingleWordName && !hasPhoneOrEmailMatch) {
        continue;
      }
      return true;
    }
  }

  return false;
}

export function ParsedContactsTable({
  contacts,
  excludedIndices,
  onToggleExclude,
  onEditContact,
  existingContacts,
}: ParsedContactsTableProps) {
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const handleCheckboxChange = (index: number, event?: React.MouseEvent) => {
    // Handle shift+click for range selection
    if (event?.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      
      // Get the target state based on the clicked checkbox
      const targetExcluded = !excludedIndices.has(index);
      
      for (let i = start; i <= end; i++) {
        const isCurrentlyExcluded = excludedIndices.has(i);
        if (isCurrentlyExcluded !== targetExcluded) {
          onToggleExclude(i);
        }
      }
    } else {
      onToggleExclude(index);
    }
    
    setLastClickedIndex(index);
  };

  if (contacts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No contacts parsed from this call sheet.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden max-w-5xl mx-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px] px-2">
              <span className="sr-only">Include</span>
            </TableHead>
            <TableHead className="w-[40px] px-2">#</TableHead>
            <TableHead className="px-2">Name</TableHead>
            <TableHead className="px-2">Role</TableHead>
            <TableHead className="px-2">
              <div className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                <span>Email</span>
              </div>
            </TableHead>
            <TableHead className="px-2">
              <div className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                <span>Phone</span>
              </div>
            </TableHead>
            <TableHead className="w-[60px] px-2">Status</TableHead>
            <TableHead className="w-[40px] px-2"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact, index) => {
            const isExcluded = excludedIndices.has(index);
            const isDuplicate = hasPotentialDuplicate(contact, existingContacts);

            return (
              <TableRow
                key={index}
                className={cn(
                  "transition-colors",
                  isExcluded && "bg-muted/50 opacity-60"
                )}
              >
                <TableCell className="px-2 py-2">
                  <Checkbox
                    checked={!isExcluded}
                    onCheckedChange={() => handleCheckboxChange(index)}
                    onClick={(e) => handleCheckboxChange(index, e as unknown as React.MouseEvent)}
                    aria-label={`Include ${contact.name}`}
                  />
                </TableCell>
                <TableCell className="px-2 py-2 font-mono text-muted-foreground text-xs">
                  {index + 1}
                </TableCell>
                <TableCell className="px-2 py-2">
                  <span className={cn(
                    "font-medium text-sm",
                    isExcluded && "line-through text-muted-foreground"
                  )}>
                    {contact.name}
                  </span>
                </TableCell>
                <TableCell className="px-2 py-2">
                  <div className="flex flex-wrap gap-1">
                    {contact.roles.slice(0, 2).map((role, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className={cn("text-xs py-0", isExcluded && "opacity-50")}
                      >
                        {role}
                      </Badge>
                    ))}
                    {contact.roles.length > 2 && (
                      <Badge variant="outline" className="text-xs py-0">
                        +{contact.roles.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2 text-sm">
                  {contact.emails.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {contact.emails.slice(0, 2).map((email, i) => (
                        <span key={i} className={cn(
                          "text-muted-foreground truncate max-w-[180px]",
                          isExcluded && "opacity-50"
                        )}>
                          {email}
                        </span>
                      ))}
                      {contact.emails.length > 2 && (
                        <span className="text-xs text-muted-foreground/70">
                          +{contact.emails.length - 2} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </TableCell>
                <TableCell className="px-2 py-2 text-sm font-mono">
                  {contact.phones.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {contact.phones.slice(0, 2).map((phone, i) => (
                        <span key={i} className={cn(
                          "text-muted-foreground",
                          isExcluded && "opacity-50"
                        )}>
                          {phone}
                        </span>
                      ))}
                      {contact.phones.length > 2 && (
                        <span className="text-xs text-muted-foreground/70">
                          +{contact.phones.length - 2} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </TableCell>
                <TableCell className="px-2 py-2">
                  {isDuplicate && !isExcluded && (
                    <Badge variant="outline" className="text-xs py-0 border-destructive/50 text-destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Dup?
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="px-2 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEditContact(contact, index)}
                    title="Edit contact details"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
