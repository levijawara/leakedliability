import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { ExportOptionsModal } from "./ExportOptionsModal";
import type { CrewContact } from "@/pages/CrewContacts";

interface ExportButtonProps {
  filteredContacts: CrewContact[];
  allContacts: CrewContact[];
  hasActiveFilters: boolean;
}

export function ExportButton({ filteredContacts, allContacts, hasActiveFilters }: ExportButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = () => {
    // If no filters are active, both exports would be identical
    // Still show the modal so users understand what they're exporting
    setModalOpen(true);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={allContacts.length === 0}
      >
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>

      <ExportOptionsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        filteredContacts={filteredContacts}
        allContacts={allContacts}
        hasActiveFilters={hasActiveFilters}
      />
    </>
  );
}
