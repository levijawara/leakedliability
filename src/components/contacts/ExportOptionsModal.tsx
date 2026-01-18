import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Filter, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CrewContact } from "@/pages/CrewContacts";

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredContacts: CrewContact[];
  allContacts: CrewContact[];
  hasActiveFilters: boolean;
}

export function ExportOptionsModal({
  isOpen,
  onClose,
  filteredContacts,
  allContacts,
  hasActiveFilters,
}: ExportOptionsModalProps) {
  const { toast } = useToast();

  const exportContacts = (contacts: CrewContact[], exportType: 'filtered' | 'all') => {
    if (contacts.length === 0) {
      toast({
        title: "No contacts to export",
        description: exportType === 'filtered' 
          ? "No contacts match your current filters" 
          : "Add some contacts first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Build CSV content
      const headers = [
        "Name",
        "Email",
        "Phone",
        "Roles",
        "Departments",
        "Instagram",
        "Project",
        "Favorite"
      ];

      const rows = contacts.map(contact => [
        contact.name,
        contact.emails?.join("; ") || "",
        contact.phones?.join("; ") || "",
        contact.roles?.join("; ") || "",
        contact.departments?.join("; ") || "",
        contact.ig_handle || "",
        contact.project_title || "",
        contact.is_favorite ? "Yes" : "No"
      ]);

      // Escape CSV values
      const escapeCSV = (value: string) => {
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const csvContent = [
        headers.map(escapeCSV).join(","),
        ...rows.map(row => row.map(escapeCSV).join(","))
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const suffix = exportType === 'filtered' ? '-filtered' : '';
      link.download = `crew-contacts${suffix}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export complete",
        description: `Exported ${contacts.length} contacts to CSV`,
      });

      onClose();
    } catch (error: any) {
      console.error('[ExportOptionsModal] Export error:', error);
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportFiltered = () => {
    exportContacts(filteredContacts, 'filtered');
  };

  const handleExportAll = () => {
    exportContacts(allContacts, 'all');
  };

  const filteredCount = filteredContacts.length;
  const allCount = allContacts.length;
  const countsMatch = filteredCount === allCount;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Contacts</DialogTitle>
          <DialogDescription>
            Choose which contacts to include in your CSV export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Filtered Export Option */}
          <button
            onClick={handleExportFiltered}
            disabled={!hasActiveFilters || filteredCount === 0}
            className="w-full p-4 rounded-lg border-2 text-left transition-colors hover:border-primary hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-transparent"
          >
            <div className="flex items-start gap-3">
              <Filter className="h-5 w-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Export filtered view</span>
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {filteredCount.toLocaleString()} contacts
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {hasActiveFilters 
                    ? "Includes only contacts matching your current filters & search"
                    : "No filters applied — same as exporting all"
                  }
                </p>
              </div>
            </div>
          </button>

          {/* All Contacts Export Option */}
          <button
            onClick={handleExportAll}
            disabled={allCount === 0}
            className="w-full p-4 rounded-lg border-2 text-left transition-colors hover:border-primary hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Export all contacts</span>
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {allCount.toLocaleString()} contacts
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  All contacts in your workspace
                </p>
              </div>
            </div>
          </button>

          {countsMatch && hasActiveFilters && (
            <p className="text-xs text-muted-foreground text-center">
              Your filters match all contacts — both options will produce the same result.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
