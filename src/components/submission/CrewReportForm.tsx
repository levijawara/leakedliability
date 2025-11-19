import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileUploadZone } from "./FileUploadZone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon } from "lucide-react";
import { crewReportSchema } from "@/lib/validation";
import { uploadFiles } from "@/lib/storage";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/sanitize";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface CrewReportFormProps {
  userInfo: { firstName: string; lastName: string; email: string; role: string };
  onBack: () => void;
  onSuccess: () => void;
  adminMetadata?: {
    createdByAdmin: boolean;
    adminCreatorId: string;
    reporterId: string;
  };
}

export function CrewReportForm({ userInfo, onBack, onSuccess, adminMetadata }: CrewReportFormProps) {
  const [loading, setLoading] = useState(false);

  // Check email verification status on mount
  useState(() => {
    const checkEmailVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.email_confirmed_at) {
        setEmailVerified(false);
      }
    };
    checkEmailVerification();
  });
  const [reportingType, setReportingType] = useState<"producer" | "production_company" | "both">("producer");
  const [producerName, setProducerName] = useState({ firstName: "", lastName: "", email: "" });
  const [producerAliases, setProducerAliases] = useState("");
  const [amountOwed, setAmountOwed] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>();
  const [projectName, setProjectName] = useState("");
  const [city, setCity] = useState("");
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [communicationFiles, setCommunicationFiles] = useState<File[]>([]);
  const [jobDocFiles, setJobDocFiles] = useState<File[]>([]);
  const [emailVerified, setEmailVerified] = useState(true);
  const { toast } = useToast();


  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Validate input
      const validationResult = crewReportSchema.safeParse({
        reportingType: reportingType,
        producerFirstName: producerName.firstName,
        producerLastName: producerName.lastName,
        producerCompany: reportingType === "production_company" ? producerName.firstName : undefined,
        producerEmail: producerName.email,
        producerAliases,
        amountOwed: parseFloat(amountOwed),
        invoiceDate,
        projectName,
        city,
      });

      if (!validationResult.success) {
        toast({
          title: "Missing required fields",
          description: validationResult.error.errors.map(e => e.message).join(", "),
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to submit a report",
          variant: "destructive"
        });
        return;
      }

      // Check email verification
      if (!user.email_confirmed_at) {
        toast({
          title: "Email Not Verified",
          description: "Please verify your email before submitting reports",
          variant: "destructive"
        });
        return;
      }

      // Upload all files
      const allFiles = [...invoiceFiles, ...communicationFiles, ...jobDocFiles];
      const documentUrls = await uploadFiles(allFiles);

      // Submit the report
      const { error } = await supabase.from('submissions').insert({
        user_id: adminMetadata?.reporterId || user.id,
        submission_type: 'crew_report',
        full_name: `${userInfo.firstName} ${userInfo.lastName}`,
        email: userInfo.email,
        role_department: userInfo.role,
        form_data: {
          // snake_case keys for Admin flow
          reporting_type: reportingType,
          producer_name: producerName,
          producer_aliases: sanitizeText(producerAliases),
          amount_owed: amountOwed,
          invoice_date: invoiceDate?.toISOString().split('T')[0],
          project_name: projectName,
          city: city || null,
          // camelCase keys required by backend validation trigger
          producerName: producerName,
          amountOwed: parseFloat(amountOwed),
          projectName: projectName,
          // Admin metadata
          ...(adminMetadata && {
            created_by_admin: adminMetadata.createdByAdmin,
            admin_creator_id: adminMetadata.adminCreatorId
          })
        },
        document_urls: documentUrls
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your crew member report has been submitted for review"
      });
      
      onSuccess();
    } catch (error: any) {
      console.error("[CREW_REPORT_SUBMIT] insert error", error);
      toast({
        title: "Submission failed",
        description: "Please review required fields and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isValid = producerName.firstName && producerName.email && amountOwed && invoiceDate && projectName && invoiceFiles.length > 0 && (reportingType === "production_company" || producerName.lastName);

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4">Crew Member Report ⚠️</h2>
      <p className="text-sm text-destructive mb-6 font-semibold">
        Please don't lie about anything. Please don't lie about anything. Please don't lie about anything.
      </p>

      {!emailVerified && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your email is not verified. Please verify your email before submitting reports.
            <a href="/verify-email" className="underline ml-1">Go to verification page</a>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <div>
          <Label>Are you reporting a Producer's debt, Production Company's debt, or BOTH?</Label>
          <RadioGroup value={reportingType} onValueChange={(v: any) => setReportingType(v)}>
            <div className="space-y-2 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="producer" id="producer" />
                <Label htmlFor="producer">Producer's debt</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="production_company" id="production_company" />
                <Label htmlFor="production_company">Production Company's debt</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both">BOTH</Label>
              </div>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground mt-2">
            REMINDER: You can only submit ONE invoice per report
          </p>
        </div>

        <div className="space-y-4">
          <Label>Producer/Production Company Contact Information *</Label>
          <Input
            placeholder="First name or Company name"
            value={producerName.firstName}
            onChange={(e) => setProducerName({ ...producerName, firstName: e.target.value })}
          />
          {reportingType !== "production_company" && (
            <Input
              placeholder="Last name"
              value={producerName.lastName}
              onChange={(e) => setProducerName({ ...producerName, lastName: e.target.value })}
            />
          )}
          <Input
            type="email"
            placeholder="Email address"
            value={producerName.email}
            onChange={(e) => setProducerName({ ...producerName, email: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="aliases">Known Aliases/Nicknames (Optional)</Label>
          <Textarea
            id="aliases"
            placeholder="Any other names, abandoned LLCs, stage names, etc."
            value={producerAliases}
            onChange={(e) => setProducerAliases(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="amount">Amount Owed (USD) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amountOwed}
            onChange={(e) => setAmountOwed(e.target.value)}
          />
        </div>

        <div>
          <Label>Invoice Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !invoiceDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {invoiceDate ? format(invoiceDate, "PPP") : <span>Pick invoice date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={invoiceDate}
                onSelect={setInvoiceDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="projectName">Project Name *</Label>
          <Input
            id="projectName"
            placeholder="Enter project/production name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="city">City (Optional)</Label>
          <Input
            id="city"
            placeholder="City where work was performed"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <FileUploadZone
          label="Job Documentation"
          description="Deal memos, contracts, timecards, call sheets, crew lists, etc."
          files={jobDocFiles}
          onFilesChange={setJobDocFiles}
          maxFiles={10}
        />

        <FileUploadZone
          label="Invoice/Payment Request *"
          description="Submit the SAME invoice you sent to the producer, or screenshot from payroll platform"
          files={invoiceFiles}
          onFilesChange={setInvoiceFiles}
          maxFiles={5}
        />

        <FileUploadZone
          label="Communication Documents"
          description="ANY and ALL communication regarding your payment (emails, texts, etc.)"
          files={communicationFiles}
          onFilesChange={setCommunicationFiles}
          maxFiles={10}
        />
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || loading || !emailVerified}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Report
        </Button>
      </div>
    </Card>
  );
}
