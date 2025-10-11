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
import { Switch } from "@/components/ui/switch";
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
  const [isPermanent, setIsPermanent] = useState(true);
  const [isTemporary, setIsTemporary] = useState(false);

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

  const handleTogglePermanent = (checked: boolean) => {
    setIsPermanent(checked);
    if (checked) setIsTemporary(false);
  };

  const handleToggleTemporary = (checked: boolean) => {
    setIsTemporary(checked);
    if (checked) setIsPermanent(false);
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

    if (!isPermanent && !isTemporary) {
      toast({
        title: "Association Type Required",
        description: "Please select an association type",
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
          association_type: isPermanent ? "permanent" : "temporary",
        });

      if (error) throw error;

      toast({
        title: "Association Created",
        description: isPermanent 
          ? "Your account is now permanently linked to this producer"
          : "Temporary association created for submissions",
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
          <DialogTitle>Associate with Existing Producer?</DialogTitle>
          <DialogDescription>
            If your name appears on the leaderboard under a different name or company, you can link your account now.
          </DialogDescription>
        </DialogHeader>

        {loadingProducers ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Toggle Options */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-start space-x-3">
                <Switch
                  id="permanent"
                  checked={isPermanent}
                  onCheckedChange={handleTogglePermanent}
                />
                <div className="space-y-1 flex-1">
                  <Label htmlFor="permanent" className="text-sm font-medium cursor-pointer">
                    My legal name isn't listed, but I associate with one of the names on the leaderboard
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    This will permanently link your account to the selected producer
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Switch
                  id="temporary"
                  checked={isTemporary}
                  onCheckedChange={handleToggleTemporary}
                />
                <div className="space-y-1 flex-1">
                  <Label htmlFor="temporary" className="text-sm font-medium cursor-pointer">
                    I'm submitting forms on SOMEONE ELSE'S behalf
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    This allows temporary submissions without permanent linking
                  </p>
                </div>
              </div>
            </div>

            {/* Producer Selection */}
            {(isPermanent || isTemporary) && (
              <div className="space-y-2">
                <Label htmlFor="producer">Select Producer</Label>
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
              </div>
            )}
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
            disabled={loading || loadingProducers || !selectedProducerId || (!isPermanent && !isTemporary)}
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
