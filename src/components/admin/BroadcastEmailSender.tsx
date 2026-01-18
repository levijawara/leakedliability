import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Eye, AlertCircle, CheckCircle2, Mail } from "lucide-react";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ParsedRecipients {
  valid: string[];
  invalid: string[];
  duplicatesRemoved: number;
}

export function BroadcastEmailSender() {
  const { toast } = useToast();
  
  // Form state
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [recipientsText, setRecipientsText] = useState("");
  const [senderName, setSenderName] = useState("The Leaked Liability Team");
  const [footerText, setFooterText] = useState("You're receiving this email because you have an account on Leaked Liability.");
  const [footerContactText, setFooterContactText] = useState("Questions? Visit leakedliability.com/faq or reply to this email.");
  
  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);

  // Parse recipients from text input
  const parsedRecipients = useMemo((): ParsedRecipients => {
    if (!recipientsText.trim()) {
      return { valid: [], invalid: [], duplicatesRemoved: 0 };
    }

    // Split by newlines, commas, semicolons, or spaces
    const rawEmails = recipientsText
      .split(/[\n,;\s]+/)
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0);

    const uniqueEmails = [...new Set(rawEmails)];
    const duplicatesRemoved = rawEmails.length - uniqueEmails.length;

    const valid: string[] = [];
    const invalid: string[] = [];

    for (const email of uniqueEmails) {
      if (EMAIL_REGEX.test(email)) {
        valid.push(email);
      } else {
        invalid.push(email);
      }
    }

    return { valid, invalid, duplicatesRemoved };
  }, [recipientsText]);

  const canPreview = subject.trim() && bodyText.trim() && parsedRecipients.valid.length > 0;
  const canSend = canPreview && confirmed;

  const handleSend = async () => {
    if (!canSend) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-broadcast-email", {
        body: {
          subject: subject.trim(),
          bodyText: bodyText.trim(),
          recipients: parsedRecipients.valid,
          senderName: senderName.trim(),
          footerText: footerText.trim(),
          footerContactText: footerContactText.trim(),
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Broadcast Complete",
        description: `Successfully sent to ${data.success}/${data.total} recipients${data.failed > 0 ? `. ${data.failed} failed.` : '.'}`,
        variant: data.failed > 0 ? "default" : "default",
      });

      // Reset form on success
      if (data.success > 0) {
        setShowPreview(false);
        setConfirmed(false);
        // Keep subject and body for potential resend, but clear recipients
        setRecipientsText("");
      }
    } catch (error: any) {
      console.error("[BroadcastEmailSender] Send error:", error);
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send broadcast email",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="broadcast-subject">Subject</Label>
        <Input
          id="broadcast-subject"
          placeholder="Enter email subject..."
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
        />
      </div>

      {/* Body */}
      <div className="space-y-2">
        <Label htmlFor="broadcast-body">
          Email Body <span className="text-muted-foreground">(plain text, line breaks preserved)</span>
        </Label>
        <Textarea
          id="broadcast-body"
          placeholder="Enter your email message..."
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          rows={8}
          className="font-mono text-sm"
        />
      </div>

      {/* Sender Name */}
      <div className="space-y-2">
        <Label htmlFor="broadcast-sender">Sender Name</Label>
        <Input
          id="broadcast-sender"
          placeholder="The Leaked Liability Team"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          maxLength={100}
        />
      </div>

      {/* Footer Text */}
      <div className="space-y-2">
        <Label htmlFor="broadcast-footer">Footer Text</Label>
        <Input
          id="broadcast-footer"
          placeholder="You're receiving this email because..."
          value={footerText}
          onChange={(e) => setFooterText(e.target.value)}
          maxLength={200}
        />
      </div>

      {/* Footer Contact Text */}
      <div className="space-y-2">
        <Label htmlFor="broadcast-footer-contact">Footer Contact Text</Label>
        <Input
          id="broadcast-footer-contact"
          placeholder="Questions? Visit..."
          value={footerContactText}
          onChange={(e) => setFooterContactText(e.target.value)}
          maxLength={200}
        />
      </div>

      {/* Recipients */}
      <div className="space-y-2">
        <Label htmlFor="broadcast-recipients">
          Recipients <span className="text-muted-foreground">(one per line, or comma/semicolon separated)</span>
        </Label>
        <Textarea
          id="broadcast-recipients"
          placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
          value={recipientsText}
          onChange={(e) => setRecipientsText(e.target.value)}
          rows={6}
          className="font-mono text-sm"
        />
        
        {/* Recipient stats */}
        <div className="flex flex-wrap gap-4 text-sm">
          {parsedRecipients.valid.length > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {parsedRecipients.valid.length} valid email{parsedRecipients.valid.length !== 1 ? 's' : ''}
            </span>
          )}
          {parsedRecipients.duplicatesRemoved > 0 && (
            <span className="text-muted-foreground">
              ({parsedRecipients.duplicatesRemoved} duplicate{parsedRecipients.duplicatesRemoved !== 1 ? 's' : ''} removed)
            </span>
          )}
          {parsedRecipients.invalid.length > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-4 w-4" />
              {parsedRecipients.invalid.length} invalid
            </span>
          )}
        </div>

        {/* Show invalid emails */}
        {parsedRecipients.invalid.length > 0 && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Invalid emails: {parsedRecipients.invalid.slice(0, 5).join(', ')}
              {parsedRecipients.invalid.length > 5 && ` and ${parsedRecipients.invalid.length - 5} more`}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setShowPreview(true)}
          disabled={!canPreview}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview Email
        </Button>
      </div>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={(open) => { setShowPreview(open); if (!open) setConfirmed(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Preview
            </DialogTitle>
            <DialogDescription>
              Review your email before sending to {parsedRecipients.valid.length} recipient{parsedRecipients.valid.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          {/* Email Preview */}
          <Card className="bg-[#f6f9fc]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-mono text-gray-900">{subject}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 font-mono text-sm text-gray-800">
              <div className="whitespace-pre-wrap">{bodyText}</div>
              <div>
                Best regards,<br />
                {senderName}
              </div>
              <hr className="border-gray-300" />
              <div className="text-xs text-gray-500">
                {footerText}<br />
                {footerContactText}
              </div>
            </CardContent>
          </Card>

          {/* Confirmation */}
          <div className="flex items-center space-x-2 pt-4">
            <Checkbox
              id="confirm-send"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <Label htmlFor="confirm-send" className="text-sm font-medium leading-none cursor-pointer">
              I confirm this email is ready to send to {parsedRecipients.valid.length} recipient{parsedRecipients.valid.length !== 1 ? 's' : ''}
            </Label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setShowPreview(false); setConfirmed(false); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!canSend || sending}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to {parsedRecipients.valid.length} Recipient{parsedRecipients.valid.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
