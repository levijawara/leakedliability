import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllContacts } from "@/lib/callsheets/fetchAllContacts";
import { toast } from "sonner";
import { findDuplicates } from "@/lib/callsheets/duplicateFinder";
import { MergeContactsModal } from "./MergeContactsModal";
import type { CrewContact, DuplicateMatch } from "@/types/callSheet";
import { Users, CheckCircle2, SkipForward, Merge } from "lucide-react";

interface DuplicateFinderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function DuplicateFinderModal({
  open,
  onOpenChange,
  onComplete,
}: DuplicateFinderModalProps) {
  const [loading, setLoading] = useState(true);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [resolvedCount, setResolvedCount] = useState(0);

  useEffect(() => {
    if (open) {
      findAllDuplicates();
    }
  }, [open]);

  const findAllDuplicates = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        return;
      }

      // Use paginated fetch to get ALL contacts (bypasses 1000 row limit)
      const contacts = await fetchAllContacts(user.id);
      const matches = findDuplicates(contacts);
      setDuplicates(matches);
      setCurrentIndex(0);
      setResolvedCount(0);
    } catch (error: any) {
      toast.error(error.message || "Failed to find duplicates");
    } finally {
      setLoading(false);
    }
  };

  const currentMatch = duplicates[currentIndex];
  const progress = duplicates.length > 0 ? ((currentIndex + 1) / duplicates.length) * 100 : 0;

  const handleSkip = () => {
    if (currentIndex < duplicates.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleMergeComplete = () => {
    setResolvedCount((prev) => prev + 1);
    setMergeModalOpen(false);
    
    if (currentIndex < duplicates.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    toast.success(`Duplicate review complete! ${resolvedCount} merged.`);
    onComplete();
    onOpenChange(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return "text-destructive";
    if (score >= 0.7) return "text-warning";
    return "text-muted-foreground";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Duplicate Finder
            </DialogTitle>
            <DialogDescription>
              Review potential duplicate contacts and merge them if needed.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <p className="text-sm text-muted-foreground">Scanning for duplicates...</p>
            </div>
          ) : duplicates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-lg font-medium">No duplicates found!</p>
              <p className="text-sm text-muted-foreground">Your contact list looks clean.</p>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Reviewing {currentIndex + 1} of {duplicates.length}</span>
                  <span>{resolvedCount} merged</span>
                </div>
                <Progress value={progress} />
              </div>

              {currentMatch && (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-4 p-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={getScoreColor(currentMatch.matchScore)}>
                        {Math.round(currentMatch.matchScore * 100)}% match
                      </Badge>
                      <div className="flex flex-wrap gap-1">
                        {currentMatch.matchReasons.map((reason, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border bg-card">
                        <h4 className="font-medium mb-2">{currentMatch.contact1.name}</h4>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {currentMatch.contact1.emails?.[0] && (
                            <p>{currentMatch.contact1.emails[0]}</p>
                          )}
                          {currentMatch.contact1.phones?.[0] && (
                            <p>{currentMatch.contact1.phones[0]}</p>
                          )}
                          {currentMatch.contact1.roles?.[0] && (
                            <p>{currentMatch.contact1.roles[0]}</p>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-lg border bg-card">
                        <h4 className="font-medium mb-2">{currentMatch.contact2.name}</h4>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {currentMatch.contact2.emails?.[0] && (
                            <p>{currentMatch.contact2.emails[0]}</p>
                          )}
                          {currentMatch.contact2.phones?.[0] && (
                            <p>{currentMatch.contact2.phones[0]}</p>
                          )}
                          {currentMatch.contact2.roles?.[0] && (
                            <p>{currentMatch.contact2.roles[0]}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={handleSkip}>
                        <SkipForward className="h-4 w-4 mr-2" />
                        Skip
                      </Button>
                      <Button onClick={() => setMergeModalOpen(true)}>
                        <Merge className="h-4 w-4 mr-2" />
                        Merge
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {currentMatch && (
        <MergeContactsModal
          open={mergeModalOpen}
          onOpenChange={setMergeModalOpen}
          contactA={currentMatch.contact1}
          contactB={currentMatch.contact2}
          onMergeComplete={handleMergeComplete}
        />
      )}
    </>
  );
}
