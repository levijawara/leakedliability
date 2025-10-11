import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface ProducerAssociationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function ProducerAssociationModal({ isOpen, onClose, userId }: ProducerAssociationModalProps) {
  const { toast } = useToast();
  const [producers, setProducers] = useState<any[]>([]);
  const [selectedProducerId, setSelectedProducerId] = useState<string>("");
  const [associationType, setAssociationType] = useState<'permanent' | 'temporary'>('permanent');
  const [loading, setLoading] = useState(false);
  const [isPermanent, setIsPermanent] = useState(true);
  const [isTemporary, setIsTemporary] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProducers();
    }
  }, [isOpen]);

  const loadProducers = async () => {
    const { data, error } = await supabase
      .from('producers')
      .select('id, name, company')
      .order('name');

    if (error) {
      console.error('Error loading producers:', error);
      return;
    }

    setProducers(data || []);
  };

  const handleTogglePermanent = (checked: boolean) => {
    setIsPermanent(checked);
    if (checked) {
      setIsTemporary(false);
      setAssociationType('permanent');
    }
  };

  const handleToggleTemporary = (checked: boolean) => {
    setIsTemporary(checked);
    if (checked) {
      setIsPermanent(false);
      setAssociationType('temporary');
    }
  };

  const handleConfirm = async () => {
    if (!selectedProducerId) {
      toast({
        title: "Selection Required",
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
        .from('producer_account_links')
        .insert({
          user_id: userId,
          producer_id: selectedProducerId,
          association_type: associationType,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Producer association created successfully",
      });

      onClose();
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
  };

  const formatProducerName = (producer: any) => {
    if (producer.company) {
      return `${producer.name} (${producer.company})`;
    }
    return producer.name;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Associate with Existing Producer?</DialogTitle>
          <DialogDescription>
            If your legal name doesn't match a name on the leaderboard, or you're submitting on behalf of someone else, you can associate your account with an existing producer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Toggle Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg">
              <Label htmlFor="permanent" className="flex-1 text-sm">
                My legal name isn't listed, but I associate with one of the names on the leaderboard.
              </Label>
              <Switch
                id="permanent"
                checked={isPermanent}
                onCheckedChange={handleTogglePermanent}
              />
            </div>

            <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg">
              <Label htmlFor="temporary" className="flex-1 text-sm">
                I'm attempting to submit Payment Documentations 🧾, Report Explanations ☮️, or Report Disputes ⁉️ on SOMEONE ELSE'S behalf.
              </Label>
              <Switch
                id="temporary"
                checked={isTemporary}
                onCheckedChange={handleToggleTemporary}
              />
            </div>
          </div>

          {/* Producer Selection */}
          <div>
            <Label htmlFor="producer">Select Producer</Label>
            <Select value={selectedProducerId} onValueChange={setSelectedProducerId}>
              <SelectTrigger id="producer">
                <SelectValue placeholder="Choose from leaderboard" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {producers.map((producer) => (
                  <SelectItem key={producer.id} value={producer.id}>
                    {formatProducerName(producer)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="flex-1"
            disabled={loading}
          >
            Skip
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1"
            disabled={loading || !selectedProducerId || (!isPermanent && !isTemporary)}
          >
            {loading ? "Confirming..." : "Confirm Association"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
