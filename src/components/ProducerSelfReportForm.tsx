import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

const selfReportSchema = z.object({
  projectTitle: z.string().min(3, "Project title must be at least 3 characters"),
  amountOwed: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Must be a valid positive amount"
  ),
  reason: z.string().optional(),
  evidenceUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type SelfReportFormData = z.infer<typeof selfReportSchema>;

export default function ProducerSelfReportForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<SelfReportFormData>({
    resolver: zodResolver(selfReportSchema),
    defaultValues: {
      projectTitle: "",
      amountOwed: "",
      reason: "",
      evidenceUrl: "",
    },
  });

  const onSubmit = async (values: SelfReportFormData) => {
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

      if (linkError || !linkData) {
        toast({
          title: "No Producer Account",
          description: "You must have a linked producer account to submit self-reports",
          variant: "destructive",
        });
        return;
      }

      // Insert self-report
      const { error } = await supabase
        .from("producer_self_reports")
        .insert([{
          producer_id: linkData.producer_id,
          project_title: values.projectTitle,
          amount_owed: parseFloat(values.amountOwed),
          reason: values.reason || null,
          evidence_url: values.evidenceUrl || null,
        }]);

      if (error) {
        console.error("Self-report submission error:", error);
        toast({
          title: "Submission Failed",
          description: "An error occurred while submitting your self-report",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Self-Report Submitted",
          description: "Your self-report has been submitted. Awaiting verification from crew/vendors.",
        });
        form.reset();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
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
                <Input placeholder="e.g., Feature Film XYZ" {...field} />
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
              <FormLabel>Amount Owed ($)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  {...field} 
                />
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
                  placeholder="Explain why this debt exists and your plan to resolve it..."
                  rows={3}
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Providing context shows transparency and good faith
              </FormDescription>
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
                  placeholder="https://..." 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Link to payment plan, correspondence, or other supporting documents
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Self-Report"
          )}
        </Button>
      </form>
    </Form>
  );
}
