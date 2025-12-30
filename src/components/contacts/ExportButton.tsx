import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CrewContact } from "@/pages/CrewContacts";

interface ExportButtonProps {
  contacts: CrewContact[];
}

export function ExportButton({ contacts }: ExportButtonProps) {
  const { toast } = useToast();

  const handleExport = () => {
    if (contacts.length === 0) {
      toast({
        title: "No contacts to export",
        description: "Add some contacts first",
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
      link.download = `crew-contacts-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export complete",
        description: `Exported ${contacts.length} contacts to CSV`,
      });
    } catch (error: any) {
      console.error('[ExportButton] Export error:', error);
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={contacts.length === 0}
    >
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
}