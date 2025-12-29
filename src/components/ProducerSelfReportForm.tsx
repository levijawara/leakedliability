import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const selfReportSchema = z.object({
  projectTitle: z.string().min(2, "Project title must be at least 2 characters"),
  amountOwed: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Amount must be a positive number"
  ),
  reason: z.string().optional(),
  evidenceUrl: z.string().url().optional().or(z.literal("")),
});

type SelfReportFormValues = z.infer<typeof selfReportSchema>;

export default function ProducerSelfReportForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const form = useForm<SelfReportFormValues>({
    resolver: zodResolver(selfReportSchema),
    defaultValues: {
      projectTitle: "",
      amountOwed: "",
      reason: "",
      evidenceUrl: "",
    },
  });

  const onSubmit = async (values: SelfReportFormValues) => {
    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to submit a self-report",
          variant: "destructive",
        });
        return;
      }

      // Get producer_id from producer_account_links
      const { data: linkData, error: linkError } = await supabase
        .from("producer_account_links")
        .select("producer_id")
        .eq("user_id", user.id)
        .single();

      if (linkError || !linkData?.producer_id) {
        toast({
          title: "Producer Account Required",
          description: "You must have a linked producer account to submit self-reports",
          variant: "destructive",
        });
        return;
      }

      // Insert self-report and retrieve share_link
      const { data, error: insertError } = await supabase
        .from("producer_self_reports")
        .insert([{
          producer_id: linkData.producer_id,
          project_title: values.projectTitle,
          amount_owed: parseFloat(values.amountOwed),
          reason: values.reason || null,
          evidence_url: values.evidenceUrl || null,
        }])
        .select('share_link')
        .single();

      if (insertError) {
        console.error("Self-report error:", insertError);
        toast({
          title: "Submission Failed",
          description: "Unable to submit self-report. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Display share link
      if (data?.share_link) {
        setShareLink(data.share_link);
        setCopied(false);
        toast({
          title: "Self-Report Submitted",
          description: "Copy your confirmation link below to share with collaborators.",
        });
      }

      form.reset();
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="projectTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Title</FormLabel>
              <FormControl>
                <Input placeholder="Project name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amountOwed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount Owed (USD)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Explain the circumstances or reason for delayed payment"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="evidenceUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Evidence URL (Optional)</FormLabel>
              <FormControl>
                <Input 
                  type="url" 
                  placeholder="https://example.com/evidence"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Self-Report
        </Button>
      </form>

      {shareLink && (
        <Card className="mt-4 p-4 bg-muted/30 border-primary/20">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            Crew/Vendor Confirmation Link
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Share this link with at least three collaborators who can confirm this debt. 
            After 3 confirmations, your report will be eligible for verification.
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              readOnly
              value={shareLink}
              className="text-xs font-mono bg-background"
            />
            <Button 
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(shareLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </Button>
          </div>
        </Card>
      )}
    </Form>
  );
}
