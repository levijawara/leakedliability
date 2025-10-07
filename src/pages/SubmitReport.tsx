import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, FileWarning } from "lucide-react";
import { Navigation } from "@/components/Navigation";

const reportSchema = z.object({
  producerName: z.string().min(2, "Producer name must be at least 2 characters"),
  producerCompany: z.string().optional(),
  projectName: z.string().min(2, "Project name is required"),
  amountOwed: z.number().min(0.01, "Amount must be greater than 0"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  city: z.string().min(2, "City is required"),
  notes: z.string().optional(),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export default function SubmitReport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      producerName: "",
      producerCompany: "",
      projectName: "",
      amountOwed: 0,
      invoiceDate: "",
      city: "",
      notes: "",
    },
  });

  const onSubmit = async (values: ReportFormValues) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to submit a report",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Find or create producer
      let { data: producer, error: producerError } = await supabase
        .from("producers")
        .select("id")
        .eq("name", values.producerName)
        .maybeSingle();

      if (!producer) {
        const { data: newProducer, error: createError } = await supabase
          .from("producers")
          .insert({
            name: values.producerName,
            company: values.producerCompany || null,
          })
          .select()
          .single();

        if (createError) throw createError;
        producer = newProducer;
      }

      // Calculate days overdue
      const invoiceDate = new Date(values.invoiceDate);
      const today = new Date();
      const daysOverdue = Math.floor((today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));

      // Submit report
      const { error: reportError } = await supabase
        .from("payment_reports")
        .insert({
          producer_id: producer.id,
          reporter_id: user.id,
          project_name: values.projectName,
          amount_owed: values.amountOwed,
          invoice_date: values.invoiceDate,
          days_overdue: daysOverdue,
          city: values.city,
          status: "pending",
          verified: false,
        });

      if (reportError) throw reportError;

      toast({
        title: "Report submitted successfully",
        description: "Your report is pending verification. You'll be notified once it's reviewed.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error submitting report",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-3">Submit a Report</h1>
          <p className="text-muted-foreground">
            Report unpaid invoices to hold producers accountable
          </p>
        </div>

        <Card className="p-6 mb-6 border-l-4 border-status-warning bg-status-warning/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-status-warning mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold mb-1">Your identity is protected</p>
              <p className="text-muted-foreground">
                Your personal information will never be shared publicly. Only verified reports appear on the leaderboard.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Submit Your Report</h2>
          <p className="text-muted-foreground mb-6">
            Click the button below to submit your unpaid invoice report via our secure form.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.open("https://form.typeform.com/to/xuqf6PDX", "_blank")}
            className="text-lg px-8"
          >
            <FileWarning className="mr-2 h-5 w-5" />
            Open Submission Form
          </Button>
        </Card>
        </div>
      </div>
    </>
  );
}
