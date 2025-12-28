import { useState, useEffect, useMemo } from "react";
import { Search, Filter, Download, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CrewContactCard } from "./CrewContactCard";
import { ViewToggle } from "./ViewToggle";
import { SortToggle } from "./SortToggle";
import { exportContacts } from "@/lib/callsheets/contactsExport";
import { fetchAllContacts } from "@/lib/callsheets/fetchAllContacts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CrewContact, SortField, SortDirection, FilterConfig } from "@/types/callSheet";

interface CrewContactsGridProps {
  initialContacts?: CrewContact[];
  className?: string;
}

export function CrewContactsGrid({
  initialContacts,
  className,
}: CrewContactsGridProps) {
  const [contacts, setContacts] = useState<CrewContact[]>(initialContacts || []);
  const [isLoading, setIsLoading] = useState(!initialContacts);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filters, setFilters] = useState<FilterConfig>({
    searchQuery: "",
    departments: [],
    roles: [],
    hasEmail: null,
    hasPhone: null,
    hasInstagram: null,
  });

  // Fetch contacts if not provided (paginated to bypass 1000 row limit)
  useEffect(() => {
    if (initialContacts) return;

    const loadContacts = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const allContacts = await fetchAllContacts(user.id);
        setContacts(allContacts);
      } catch (error: any) {
        toast.error(error.message || "Failed to load contacts");
      } finally {
        setIsLoading(false);
      }
    };

    loadContacts();
  }, [initialContacts]);

  // Extract unique departments and roles for filter options
  const { uniqueDepartments, uniqueRoles } = useMemo(() => {
    const depts = new Set<string>();
    const roles = new Set<string>();
    contacts.forEach((c) => {
      c.departments?.forEach((d) => depts.add(d));
      c.roles?.forEach((r) => roles.add(r));
    });
    return {
      uniqueDepartments: Array.from(depts).sort(),
      uniqueRoles: Array.from(roles).sort(),
    };
  }, [contacts]);

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    let result = contacts;

    // Text search
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

    // Department filter
    if (filters.departments.length > 0) {
      result = result.filter((c) =>
        c.departments?.some((d) => filters.departments.includes(d))
      );
    }

    // Role filter
    if (filters.roles.length > 0) {
      result = result.filter((c) =>
        c.roles?.some((r) => filters.roles.includes(r))
      );
    }

    // Has email filter
    if (filters.hasEmail === true) {
      result = result.filter((c) => c.emails && c.emails.length > 0);
    } else if (filters.hasEmail === false) {
      result = result.filter((c) => !c.emails || c.emails.length === 0);
    }

    // Has phone filter
    if (filters.hasPhone === true) {
      result = result.filter((c) => c.phones && c.phones.length > 0);
    } else if (filters.hasPhone === false) {
      result = result.filter((c) => !c.phones || c.phones.length === 0);
    }

    // Has Instagram filter
    if (filters.hasInstagram === true) {
      result = result.filter((c) => c.instagram_handle);
    } else if (filters.hasInstagram === false) {
      result = result.filter((c) => !c.instagram_handle);
    }

    // Sort
    return [...result].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      if (sortField === "name") return dir * a.name.localeCompare(b.name);
      if (sortField === "departments") return dir * ((a.departments?.[0] || "").localeCompare(b.departments?.[0] || ""));
      if (sortField === "roles") return dir * ((a.roles?.[0] || "").localeCompare(b.roles?.[0] || ""));
      return 0;
    });
  }, [contacts, searchQuery, filters, sortField, sortDirection]);

  const handleUpdateContact = (updatedContact: CrewContact) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === updatedContact.id ? updatedContact : c))
    );
  };

  const handleDeleteContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleExportCSV = () => {
    const result = exportContacts(filteredContacts, { format: "csv", includeFields: ["name", "emails", "phones", "roles", "departments", "instagram_handle"] });
    const blob = new Blob([result.content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Contacts exported to CSV");
  };

  const handleExportVCard = () => {
    const result = exportContacts(filteredContacts, { format: "vcard", includeFields: ["name", "emails", "phones", "roles", "departments", "instagram_handle"] });
    const blob = new Blob([result.content], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Contacts exported to vCard");
  };

  const toggleDepartmentFilter = (dept: string) => {
    setFilters((prev) => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter((d) => d !== dept)
        : [...prev.departments, dept],
    }));
  };

  const toggleRoleFilter = (role: string) => {
    setFilters((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: "",
      departments: [],
      roles: [],
      hasEmail: null,
      hasPhone: null,
      hasInstagram: null,
    });
    setSearchQuery("");
  };

  const activeFilterCount =
    filters.departments.length +
    filters.roles.length +
    (filters.hasEmail !== null ? 1 : 0) +
    (filters.hasPhone !== null ? 1 : 0) +
    (filters.hasInstagram !== null ? 1 : 0);

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-[200px] rounded-lg" />
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
                Filter
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Departments</DropdownMenuLabel>
              {uniqueDepartments.slice(0, 10).map((dept) => (
                <DropdownMenuCheckboxItem
                  key={dept}
                  checked={filters.departments.includes(dept)}
                  onCheckedChange={() => toggleDepartmentFilter(dept)}
                >
                  {dept}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Roles</DropdownMenuLabel>
              {uniqueRoles.slice(0, 10).map((role) => (
                <DropdownMenuCheckboxItem
                  key={role}
                  checked={filters.roles.includes(role)}
                  onCheckedChange={() => toggleRoleFilter(role)}
                >
                  {role}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Contact Info</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={filters.hasEmail === true}
                onCheckedChange={() =>
                  setFilters((prev) => ({
                    ...prev,
                    hasEmail: prev.hasEmail === true ? null : true,
                  }))
                }
              >
                Has Email
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.hasPhone === true}
                onCheckedChange={() =>
                  setFilters((prev) => ({
                    ...prev,
                    hasPhone: prev.hasPhone === true ? null : true,
                  }))
                }
              >
                Has Phone
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.hasInstagram === true}
                onCheckedChange={() =>
                  setFilters((prev) => ({
                    ...prev,
                    hasInstagram: prev.hasInstagram === true ? null : true,
                  }))
                }
              >
                Has Instagram
              </DropdownMenuCheckboxItem>
              {activeFilterCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={clearFilters}
                  >
                    Clear all filters
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <SortToggle
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={(field, dir) => {
              setSortField(field);
              setSortDirection(dir);
            }}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportVCard}>
                Export as vCard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>
          {filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""}
          {filteredContacts.length !== contacts.length && ` (${contacts.length} total)`}
        </span>
      </div>

      {/* Contacts Grid */}
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
        <div
          className={cn(
            view === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-3"
          )}
        >
          {filteredContacts.map((contact) => (
            <CrewContactCard
              key={contact.id}
              contact={contact}
              onUpdate={handleUpdateContact}
              onDelete={handleDeleteContact}
            />
          ))}
        </div>
      )}
    </div>
  );
}
