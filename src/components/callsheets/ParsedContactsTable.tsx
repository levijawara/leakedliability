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
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <span className="sr-only">Include</span>
            </TableHead>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-[60px]">
              <Mail className="h-4 w-4" />
            </TableHead>
            <TableHead className="w-[60px]">
              <Phone className="h-4 w-4" />
            </TableHead>
            <TableHead className="w-[80px]">Status</TableHead>
            <TableHead className="w-[60px]"></TableHead>
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
                <TableCell>
                  <Checkbox
                    checked={!isExcluded}
                    onCheckedChange={() => handleCheckboxChange(index)}
                    onClick={(e) => handleCheckboxChange(index, e as unknown as React.MouseEvent)}
                    aria-label={`Include ${contact.name}`}
                  />
                </TableCell>
                <TableCell className="font-mono text-muted-foreground text-sm">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "font-medium",
                    isExcluded && "line-through text-muted-foreground"
                  )}>
                    {contact.name}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {contact.roles.slice(0, 2).map((role, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className={cn("text-xs", isExcluded && "opacity-50")}
                      >
                        {role}
                      </Badge>
                    ))}
                    {contact.roles.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{contact.roles.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {contact.emails.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {contact.emails.length}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {contact.phones.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {contact.phones.length}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {isDuplicate && !isExcluded && (
                    <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Dup?
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEditContact(contact, index)}
                    title="Edit contact details"
                  >
                    <Edit2 className="h-4 w-4" />
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
