import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface FAFOEntryCardProps {
  entry: {
    id: string;
    created_at: string;
    hold_that_l_image_path: string;
    proof_image_path: string;
    holdThatLUrl: string;
    proofUrl: string;
  };
  isAdmin: boolean;
  onDelete: (id: string) => void;
}

export function FAFOEntryCard({ entry, isAdmin, onDelete }: FAFOEntryCardProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this FAFO entry? This cannot be undone.")) {
      return;
    }

    setDeleting(true);

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('fafo_entries')
        .delete()
        .eq('id', entry.id);

      if (dbError) throw dbError;

      // Delete files from storage
      const { data: files } = await supabase.storage
        .from('fafo-results')
        .list(entry.id);

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${entry.id}/${f.name}`);
        await supabase.storage
          .from('fafo-results')
          .remove(filePaths);
      }

      toast({
        title: "Entry Deleted",
        description: "FAFO entry removed successfully",
      });

      onDelete(entry.id);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="relative overflow-hidden border border-muted shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] duration-300">
      {/* Admin Delete Button */}
      {isAdmin && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-4 right-4 z-10 opacity-0 hover:opacity-100 transition-opacity"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      <div className="p-6">
        {/* Images Container */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-4">
          {/* #HoldThatL Image */}
          <div className="w-full md:w-1/2 aspect-[4/5] overflow-hidden rounded-md bg-black">
            <img
              src={entry.holdThatLUrl}
              alt="Hold That L Generator Image"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Vertical Divider (desktop only) */}
          <div className="hidden md:block w-px bg-border" />

          {/* Proof Image */}
          <div className="w-full md:w-1/2 aspect-[4/5] overflow-hidden rounded-md bg-black">
            <img
              src={entry.proofUrl}
              alt="Payment Proof Screenshot"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Date Stamp */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Recovered: {format(new Date(entry.created_at), 'MM/dd/yyyy')}
          </p>
        </div>
      </div>
    </Card>
  );
}
