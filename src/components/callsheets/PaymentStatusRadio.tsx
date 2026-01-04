import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type PaymentStatus = 'unanswered' | 'waiting' | 'paid' | 'unpaid_needs_proof' | 'free_labor';

interface PaymentStatusRadioProps {
  linkId: string;
  currentStatus: PaymentStatus;
  isLocked: boolean;
  onStatusChange: (newStatus: PaymentStatus, locked: boolean) => void;
  compact?: boolean;
}

export function PaymentStatusRadio({
  linkId,
  currentStatus,
  isLocked,
  onStatusChange,
  compact = false
}: PaymentStatusRadioProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [showConfirmPaid, setShowConfirmPaid] = useState(false);
  const [showWaiting, setShowWaiting] = useState(false);
  const [showProveIt, setShowProveIt] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [saving, setSaving] = useState(false);

  const updatePaymentStatus = async (status: PaymentStatus, locked: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_call_sheets')
        .update({ 
          payment_status: status,
          payment_status_locked: locked
        })
        .eq('id', linkId);
        
      if (error) throw error;
      onStatusChange(status, locked);
      return true;
    } catch (error: any) {
      console.error('[PaymentStatusRadio] Save error:', error);
      toast({
        title: "Failed to save",
        description: "Your selection couldn't be saved. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleRadioChange = (value: string) => {
    if (saving) return;
    
    switch (value) {
      case 'paid':
        setShowConfirmPaid(true);
        break;
      case 'waiting':
        setShowWaiting(true);
        break;
      case 'never':
        setShowProveIt(true);
        break;
    }
  };

  // Handle "Yup!" -> Confirm
  const handleConfirmPaid = async () => {
    const success = await updatePaymentStatus('paid', true);
    if (success) {
      setShowConfirmPaid(false);
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 1500);
    }
  };

  // Handle "Still waiting..."
  const handleConfirmWaiting = async () => {
    await updatePaymentStatus('waiting', false);
    setShowWaiting(false);
  };

  // Handle "Never." -> "(Never invoiced / Free labor)"
  const handleFreeLabor = async () => {
    const success = await updatePaymentStatus('free_labor', true);
    if (success) {
      setShowProveIt(false);
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 1500);
    }
  };

  // Handle "Never." -> "Yes" (route to submit)
  const handleYesProof = async () => {
    await updatePaymentStatus('unpaid_needs_proof', false);
    setShowProveIt(false);
    navigate('/submit');
  };

  // Don't render if locked or showing thank you
  if (isLocked) return null;
  
  if (showThankYou) {
    return (
      <div className="payment-thank-you-fade text-xs text-muted-foreground italic">
        Thank you!
      </div>
    );
  }

  // Map status to radio value
  const getRadioValue = () => {
    if (currentStatus === 'waiting') return 'waiting';
    // Only show selection for "waiting" - all others stay unselected
    return '';
  };

  return (
    <>
      <div className={cn("flex items-center gap-2", compact ? "flex-col items-start gap-1" : "")}>
        <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">PAID?</Label>
        <RadioGroup 
          value={getRadioValue()}
          onValueChange={handleRadioChange}
          className={cn("flex gap-2", compact ? "flex-wrap gap-1" : "")}
          disabled={saving}
        >
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="paid" id={`paid-${linkId}`} className="h-3 w-3" />
            <Label htmlFor={`paid-${linkId}`} className="text-xs cursor-pointer">Yup!</Label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="waiting" id={`waiting-${linkId}`} className="h-3 w-3" />
            <Label htmlFor={`waiting-${linkId}`} className="text-xs cursor-pointer">Still waiting...</Label>
          </div>
          <div className="flex items-center space-x-1">
            <RadioGroupItem value="never" id={`never-${linkId}`} className="h-3 w-3" />
            <Label htmlFor={`never-${linkId}`} className="text-xs cursor-pointer">Never.</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Confirm Paid Modal */}
      <Dialog open={showConfirmPaid} onOpenChange={setShowConfirmPaid}>
        <DialogContent className="max-w-xs sm:max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-center">100%?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button variant="outline" size="sm" onClick={() => setShowConfirmPaid(false)} disabled={saving}>
              Go back
            </Button>
            <Button size="sm" onClick={handleConfirmPaid} disabled={saving}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waiting Modal */}
      <Dialog open={showWaiting} onOpenChange={(open) => {
        if (!open) handleConfirmWaiting();
      }}>
        <DialogContent className="max-w-xs sm:max-w-sm p-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute right-2 top-2 h-6 w-6 p-0"
            onClick={() => handleConfirmWaiting()}
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogHeader>
            <DialogDescription className="text-center text-sm pt-4">
              Be sure to keep us updated. We're here to help! ❤️
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Prove It Modal */}
      <Dialog open={showProveIt} onOpenChange={(open) => {
        if (!open) setShowProveIt(false);
      }}>
        <DialogContent className="max-w-xs sm:max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-center">
              Can you <span className="font-bold">PROVE</span> it?
            </DialogTitle>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button size="sm" onClick={handleYesProof} disabled={saving} className="w-full">
              Yes
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowProveIt(false)} disabled={saving} className="w-full">
              No
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleFreeLabor} 
              disabled={saving}
              className="w-full text-muted-foreground text-xs"
            >
              (Never invoiced / Free labor)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
