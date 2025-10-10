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
import { Loader2 } from "lucide-react";

interface CrewReportFormProps {
  userInfo: { firstName: string; lastName: string; email: string; role: string };
  onBack: () => void;
  onSuccess: () => void;
}

export function CrewReportForm({ userInfo, onBack, onSuccess }: CrewReportFormProps) {
  const [loading, setLoading] = useState(false);
  const [reportingType, setReportingType] = useState<"producer" | "production_company" | "both">("producer");
  const [producerName, setProducerName] = useState({ firstName: "", lastName: "", email: "" });
  const [producerAliases, setProducerAliases] = useState("");
  const [amountOwed, setAmountOwed] = useState("");
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [communicationFiles, setCommunicationFiles] = useState<File[]>([]);
  const [jobDocFiles, setJobDocFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const uploadFiles = async (files: File[], userId: string) => {
    const uploadedUrls: string[] = [];
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('submission-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      
      uploadedUrls.push(fileName);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to submit a report",
          variant: "destructive"
        });
        return;
      }

      // Upload all files
      const allFiles = [...invoiceFiles, ...communicationFiles, ...jobDocFiles];
      const documentUrls = await uploadFiles(allFiles, user.id);

      // Submit the report
      const { error } = await supabase.from('submissions').insert({
        user_id: user.id,
        submission_type: 'crew_report',
        full_name: `${userInfo.firstName} ${userInfo.lastName}`,
        email: userInfo.email,
        role_department: userInfo.role,
        form_data: {
          reporting_type: reportingType,
          producer_name: producerName,
          producer_aliases: producerAliases,
          amount_owed: amountOwed
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isValid = producerName.firstName && producerName.email && amountOwed && invoiceFiles.length > 0;

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4">Crew Member Report ⚠️</h2>
      <p className="text-sm text-destructive mb-6 font-semibold">
        Please don't lie about anything. Please don't lie about anything. Please don't lie about anything.
      </p>

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

        <FileUploadZone
          label="Job Documentation"
          description="Deal memos, contracts, timecards, call sheets, crew lists, etc."
          files={jobDocFiles}
          onFilesChange={setJobDocFiles}
          maxFiles={10}
        />
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Report
        </Button>
      </div>
    </Card>
  );
}
