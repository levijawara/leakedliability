import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Producer {
  id: string;
  name: string;
  company: string | null;
}

interface ProducerAssociationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function ProducerAssociationModal({ isOpen, onClose, userId }: ProducerAssociationModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingProducers, setLoadingProducers] = useState(true);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [selectedProducerId, setSelectedProducerId] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      loadProducers();
    }
  }, [isOpen]);

  const loadProducers = async () => {
    setLoadingProducers(true);
    try {
      const { data, error } = await supabase
        .from("producers")
        .select("id, name, company")
        .order("name");

      if (error) throw error;
      setProducers(data || []);
    } catch (error: any) {
      console.error("Error loading producers:", error);
      toast({
        title: "Error",
        description: "Failed to load producer list",
        variant: "destructive",
      });
    } finally {
      setLoadingProducers(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedProducerId) {
      toast({
        title: "No Selection",
        description: "Please select a producer from the list",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("producer_account_links")
        .insert({
          user_id: userId,
          producer_id: selectedProducerId,
          association_type: "permanent", // Only permanent links are allowed
        });

      if (error) throw error;

      toast({
        title: "Permanent Link Created",
        description: "Your account is now permanently and irreversibly linked to this producer. This link cannot be changed or removed.",
      });

      onClose();
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
    navigate("/");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Permanently Link Your Account to a Producer</DialogTitle>
          <DialogDescription>
            If your name appears on the leaderboard under a different name or company, you can permanently link your account to that producer profile.
          </DialogDescription>
        </DialogHeader>

        {loadingProducers ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Important Warning */}
            <div className="p-4 border-2 border-destructive/50 rounded-lg bg-destructive/5">
              <div className="flex items-start gap-2">
                <div className="text-destructive font-bold text-lg leading-none">⚠️</div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-destructive">
                    This Link Is Permanent and Irreversible
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Once created, this link cannot be changed or removed</li>
                    <li>The only way to break the link is by deleting your entire user account</li>
                    <li>All historical data tied to this producer will remain on the leaderboard</li>
                    <li>This action is final - make sure you're linking to the correct producer</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Producer Selection */}
            <div className="space-y-2">
              <Label htmlFor="producer">Select Producer to Link</Label>
              <Select value={selectedProducerId} onValueChange={setSelectedProducerId}>
                <SelectTrigger id="producer">
                  <SelectValue placeholder="Choose from leaderboard..." />
                </SelectTrigger>
                <SelectContent>
                  {producers.map((producer) => (
                    <SelectItem key={producer.id} value={producer.id}>
                      {producer.name}
                      {producer.company && ` (${producer.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                My legal name isn't listed, but I associate with one of the names on the leaderboard
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={loading}
          >
            Skip
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || loadingProducers || !selectedProducerId}
            variant="destructive"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              "Confirm Association"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
