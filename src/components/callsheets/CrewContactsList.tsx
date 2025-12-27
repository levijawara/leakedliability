import { useState, useEffect, useMemo } from "react";
import { Search, Filter, Download, Users, Trash2, ChevronDown, ChevronUp, Mail, Phone, Instagram, MoreVertical, Edit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewToggle } from "./ViewToggle";
import { exportContacts } from "@/lib/callsheets/contactsExport";
import { maskEmail, maskPhone } from "@/lib/callsheets/privacy";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CrewContact, SortField, SortDirection } from "@/types/callSheet";

interface CrewContactsListProps {
  initialContacts?: CrewContact[];
  onEdit?: (contact: CrewContact) => void;
  className?: string;
}

export function CrewContactsList({
  initialContacts,
  onEdit,
  className,
}: CrewContactsListProps) {
  const [contacts, setContacts] = useState<CrewContact[]>(initialContacts || []);
  const [isLoading, setIsLoading] = useState(!initialContacts);
  const [view, setView] = useState<"grid" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  const [showSensitive, setShowSensitive] = useState(false);

  useEffect(() => {
    if (initialContacts) return;

    const fetchContacts = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
          .from("crew_contacts")
          .select("*")
          .eq("user_id", user.id)
          .order("name");

        if (error) throw error;
        setContacts((data || []) as CrewContact[]);
      } catch (error: any) {
        toast.error(error.message || "Failed to load contacts");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContacts();
  }, [initialContacts]);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    contacts.forEach((c) => c.departments?.forEach((d) => depts.add(d)));
    return Array.from(depts).sort();
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    let result = contacts;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.emails?.some((e) => e.toLowerCase().includes(query)) ||
          c.roles?.some((r) => r.toLowerCase().includes(query)) ||
          c.departments?.some((d) => d.toLowerCase().includes(query))
      );
    }

    if (departmentFilter.length > 0) {
      result = result.filter((c) =>
        c.departments?.some((d) => departmentFilter.includes(d))
      );
    }

    return [...result].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      switch (sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "departments":
          return dir * ((a.departments?.[0] || "").localeCompare(b.departments?.[0] || ""));
        case "roles":
          return dir * ((a.roles?.[0] || "").localeCompare(b.roles?.[0] || ""));
        case "created_at":
          return dir * ((a.created_at || "").localeCompare(b.created_at || ""));
        default:
          return 0;
      }
    });
  }, [contacts, searchQuery, departmentFilter, sortField, sortDirection]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("crew_contacts")
        .delete()
        .eq("user_id", user.id)
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      setContacts((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} contact(s) deleted`);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete contacts");
    }
  };

  const handleExportCSV = () => {
    const toExport = selectedIds.size > 0
      ? filteredContacts.filter((c) => selectedIds.has(c.id))
      : filteredContacts;
    const csv = exportContacts(toExport, { format: "csv", includeFields: ["name", "emails", "phones", "roles", "departments", "instagram_handle"] });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crew-contacts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Contacts exported to CSV");
  };

  const handleExportVCard = () => {
    const toExport = selectedIds.size > 0
      ? filteredContacts.filter((c) => selectedIds.has(c.id))
      : filteredContacts;
    const vcard = exportContacts(toExport, { format: "vcard", includeFields: ["name", "emails", "phones", "roles", "departments", "instagram_handle"] });
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crew-contacts-${new Date().toISOString().split("T")[0]}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Contacts exported to vCard");
  };

  const displayEmail = (email: string) => (showSensitive ? email : maskEmail(email));
  const displayPhone = (phone: string) => (showSensitive ? phone : maskPhone(phone));

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-md" />
        ))}
      </div>
    );
  }

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Department
                {departmentFilter.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {departmentFilter.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto">
              {uniqueDepartments.map((dept) => (
                <DropdownMenuCheckboxItem
                  key={dept}
                  checked={departmentFilter.includes(dept)}
                  onCheckedChange={(checked) => {
                    setDepartmentFilter((prev) =>
                      checked ? [...prev, dept] : prev.filter((d) => d !== dept)
                    );
                  }}
                >
                  {dept}
                </DropdownMenuCheckboxItem>
              ))}
              {departmentFilter.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setDepartmentFilter([])}
                  >
                    Clear filter
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                Export as CSV {selectedIds.size > 0 && `(${selectedIds.size})`}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportVCard}>
                Export as vCard {selectedIds.size > 0 && `(${selectedIds.size})`}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-2 bg-muted rounded-md">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} contact{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>
          {filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""}
          {filteredContacts.length !== contacts.length && ` (${contacts.length} total)`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSensitive(!showSensitive)}
          className="ml-auto text-xs"
        >
          {showSensitive ? "Hide" : "Show"} details
        </Button>
      </div>

      {/* Table */}
      {filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">No contacts found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {contacts.length === 0
              ? "Upload a call sheet to import contacts"
              : "Try adjusting your search or filters"}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <SortHeader field="name">Name</SortHeader>
                <SortHeader field="roles">Role</SortHeader>
                <SortHeader field="departments">Department</SortHeader>
                <TableHead>Contact</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <TableRow key={contact.id} className="group">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(contact.id)}
                      onCheckedChange={() => toggleSelect(contact.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{contact.name}</span>
                  </TableCell>
                  <TableCell>
                    {contact.roles && contact.roles.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {contact.roles.slice(0, 2).map((role, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                        {contact.roles.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{contact.roles.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.departments && contact.departments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {contact.departments.slice(0, 2).map((dept, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {dept}
                          </Badge>
                        ))}
                        {contact.departments.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{contact.departments.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {contact.emails && contact.emails.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {displayEmail(contact.emails[0])}
                        </span>
                      )}
                      {contact.phones && contact.phones.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {displayPhone(contact.phones[0])}
                        </span>
                      )}
                      {contact.instagram_handle && (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <Instagram className="h-3 w-3" />
                          {contact.instagram_handle}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit?.(contact)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={async () => {
                            try {
                              const { data: { user } } = await supabase.auth.getUser();
                              if (!user) throw new Error("Not authenticated");

                              const { error } = await supabase
                                .from("crew_contacts")
                                .delete()
                                .eq("id", contact.id)
                                .eq("user_id", user.id);

                              if (error) throw error;

                              setContacts((prev) => prev.filter((c) => c.id !== contact.id));
                              toast.success("Contact deleted");
                            } catch (error: any) {
                              toast.error(error.message || "Failed to delete contact");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
