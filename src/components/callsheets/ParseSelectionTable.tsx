import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown, User, Mail, Phone, Briefcase, Building2, Instagram } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ParsedContact } from "@/types/callSheet";

interface ParseSelectionTableProps {
  contacts: ParsedContact[];
  selectedContacts: ParsedContact[];
  onSelectionChange: (contacts: ParsedContact[]) => void;
  className?: string;
}

type SortField = "name" | "role" | "department" | "email";
type SortDirection = "asc" | "desc";

export function ParseSelectionTable({
  contacts,
  selectedContacts,
  onSelectionChange,
  className,
}: ParseSelectionTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const selectedSet = useMemo(
    () => new Set(selectedContacts.map((c) => c.name)),
    [selectedContacts]
  );

  const filteredContacts = useMemo(() => {
    let result = contacts;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.role?.toLowerCase().includes(query) ||
          c.department?.toLowerCase().includes(query)
      );
    }

    return [...result].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      switch (sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "role":
          return dir * ((a.role || "").localeCompare(b.role || ""));
        case "department":
          return dir * ((a.department || "").localeCompare(b.department || ""));
        case "email":
          return dir * ((a.email || "").localeCompare(b.email || ""));
        default:
          return 0;
      }
    });
  }, [contacts, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const toggleContact = (contact: ParsedContact) => {
    if (selectedSet.has(contact.name)) {
      onSelectionChange(selectedContacts.filter((c) => c.name !== contact.name));
    } else {
      onSelectionChange([...selectedContacts, contact]);
    }
  };

  const toggleAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredContacts);
    }
  };

  const selectNone = () => onSelectionChange([]);
  const selectAll = () => onSelectionChange(filteredContacts);

  const SortHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field &&
          (sortDirection === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          ))}
      </div>
    </TableHead>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone}>
            Deselect All
          </Button>
        </div>
      </div>

      {/* Selection info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          {selectedContacts.length} of {filteredContacts.length} selected
        </span>
        {searchQuery && filteredContacts.length !== contacts.length && (
          <span>({contacts.length} total)</span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border max-h-[500px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedContacts.length === filteredContacts.length &&
                    filteredContacts.length > 0
                  }
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <SortHeader field="name">Name</SortHeader>
              <SortHeader field="role">Role</SortHeader>
              <SortHeader field="department">Department</SortHeader>
              <TableHead>Contact Info</TableHead>
              <TableHead>Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No contacts match your search" : "No contacts found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map((contact, index) => (
                <TableRow
                  key={`${contact.name}-${index}`}
                  className={cn(
                    "cursor-pointer",
                    selectedSet.has(contact.name) && "bg-primary/5"
                  )}
                  onClick={() => toggleContact(contact)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedSet.has(contact.name)}
                      onCheckedChange={() => toggleContact(contact)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{contact.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {contact.role ? (
                      <Badge variant="outline" className="text-xs">
                        {contact.role}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.department ? (
                      <Badge variant="secondary" className="text-xs">
                        {contact.department}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {contact.email && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </span>
                      )}
                      {contact.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </span>
                      )}
                      {contact.instagram_handle && (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <Instagram className="h-3 w-3" />
                          {contact.instagram_handle}
                        </span>
                      )}
                      {!contact.email && !contact.phone && !contact.instagram_handle && (
                        <span className="text-muted-foreground text-xs">No contact info</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {contact.confidence !== undefined ? (
                      <Badge
                        variant={contact.confidence >= 0.8 ? "default" : contact.confidence >= 0.5 ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {Math.round(contact.confidence * 100)}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
