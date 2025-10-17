import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone } from "./FileUploadZone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon } from "lucide-react";
import { vendorReportSchema } from "@/lib/validation";
import { uploadFiles } from "@/lib/storage";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface VendorReportFormProps {
  userInfo: {
    vendorCompany: string;
    vendorDBA: string;
    vendorWebsite: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    vendorType: string;
    vendorTypeOther: string;
  };
  onBack: () => void;
  onSuccess: () => void;
}

const netTermsOptions = [
  "Net 0",
  "Net 7",
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Net 90",
  "Other"
];

const bookingMethodOptions = [
  "House Account",
  "Credit Card",
  "Third-Party Broker",
  "Other"
];

export function VendorReportForm({ userInfo, onBack, onSuccess }: VendorReportFormProps) {
  const [loading, setLoading] = useState(false);
  const [reportingType, setReportingType] = useState<"producer" | "production_company" | "both">("producer");
  const [producerName, setProducerName] = useState({ firstName: "", lastName: "", email: "" });
  const [producerAliases, setProducerAliases] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>();
  const [amountOwed, setAmountOwed] = useState("");
  const [projectName, setProjectName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState("");
  const [netTerms, setNetTerms] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [depositAmount, setDepositAmount] = useState("");
  const [deliveryStartDate, setDeliveryStartDate] = useState<Date>();
  const [deliveryEndDate, setDeliveryEndDate] = useState<Date>();
  const [city, setCity] = useState("");
  const [bookingMethod, setBookingMethod] = useState("");
  
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [poFiles, setPoFiles] = useState<File[]>([]);
  const [contractFiles, setContractFiles] = useState<File[]>([]);
  const [communicationFiles, setCommunicationFiles] = useState<File[]>([]);
  const [deliveryProofFiles, setDeliveryProofFiles] = useState<File[]>([]);
  
  const { toast } = useToast();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const validationResult = vendorReportSchema.safeParse({
        reportingType,
        vendorCompany: userInfo.vendorCompany,
        vendorDBA: userInfo.vendorDBA,
        vendorWebsite: userInfo.vendorWebsite,
        contactName: userInfo.contactName,
        contactEmail: userInfo.contactEmail,
        contactPhone: userInfo.contactPhone,
        vendorType: userInfo.vendorType,
        vendorTypeOther: userInfo.vendorTypeOther,
        producerFirstName: producerName.firstName,
        producerLastName: producerName.lastName,
        producerEmail: producerName.email,
        producerAliases,
        invoiceNumber,
        invoiceDate,
        amountOwed: parseFloat(amountOwed),
        projectName,
        serviceDescription,
        purchaseOrderNumber,
        netTerms,
        dueDate,
        depositAmount: depositAmount ? parseFloat(depositAmount) : undefined,
        deliveryStartDate,
        deliveryEndDate,
        city,
        bookingMethod,
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

      // Upload all files
      const allFiles = [...invoiceFiles, ...poFiles, ...contractFiles, ...communicationFiles, ...deliveryProofFiles];
      const documentUrls = await uploadFiles(allFiles);

      // Submit the report
      const { error } = await supabase.from('submissions').insert({
        user_id: user.id,
        submission_type: 'vendor_report',
        full_name: userInfo.contactName,
        email: userInfo.contactEmail,
        role_department: userInfo.vendorType === "Other" ? userInfo.vendorTypeOther : userInfo.vendorType,
        form_data: {
          vendor_company: userInfo.vendorCompany,
          vendor_dba: userInfo.vendorDBA,
          vendor_website: userInfo.vendorWebsite,
          contact_name: userInfo.contactName,
          contact_email: userInfo.contactEmail,
          contact_phone: userInfo.contactPhone,
          vendor_type: userInfo.vendorType,
          vendor_type_other: userInfo.vendorTypeOther,
          reporting_type: reportingType,
          producer_name: producerName,
          producer_aliases: producerAliases,
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate?.toISOString().split('T')[0],
          amount_owed: amountOwed,
          project_name: projectName,
          service_description: serviceDescription,
          purchase_order_number: purchaseOrderNumber,
          net_terms: netTerms,
          due_date: dueDate?.toISOString().split('T')[0],
          deposit_amount: depositAmount,
          delivery_start_date: deliveryStartDate?.toISOString().split('T')[0],
          delivery_end_date: deliveryEndDate?.toISOString().split('T')[0],
          city: city || null,
          booking_method: bookingMethod,
          // Backend validation keys
          vendorCompany: userInfo.vendorCompany,
          invoiceNumber: invoiceNumber,
          amountOwed: parseFloat(amountOwed),
          projectName: projectName
        },
        document_urls: documentUrls
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your vendor report has been submitted for review"
      });
      
      onSuccess();
    } catch (error: any) {
      console.error("[VENDOR_REPORT_SUBMIT] insert error", error);
      toast({
        title: "Submission failed",
        description: "Please review required fields and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const hasMinimumDocuments = invoiceFiles.length > 0 && (poFiles.length > 0 || contractFiles.length > 0 || communicationFiles.length > 0);
  const isValid = producerName.firstName && producerName.email && invoiceNumber && invoiceDate && amountOwed && 
    projectName && serviceDescription && hasMinimumDocuments && 
    (reportingType === "production_company" || producerName.lastName);

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4">Vendor Report ⚠️</h2>
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
          <Label htmlFor="invoiceNumber">Invoice Number *</Label>
          <Input
            id="invoiceNumber"
            placeholder="INV-12345"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
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
          <Label htmlFor="projectName">Project Name *</Label>
          <Input
            id="projectName"
            placeholder="Enter project/production name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="serviceDescription">Service/Product Description *</Label>
          <Textarea
            id="serviceDescription"
            placeholder="Describe what you provided (e.g., 'Camera package rental for 10 days', 'Location for 3-day shoot')"
            value={serviceDescription}
            onChange={(e) => setServiceDescription(e.target.value)}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {serviceDescription.length}/500 characters
          </p>
        </div>

        <div>
          <Label htmlFor="poNumber">PO/RO Number (Optional but Recommended)</Label>
          <Input
            id="poNumber"
            placeholder="Purchase Order or Rental Order number"
            value={purchaseOrderNumber}
            onChange={(e) => setPurchaseOrderNumber(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="netTerms">Net Payment Terms (Optional)</Label>
          <Select value={netTerms} onValueChange={setNetTerms}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment terms" />
            </SelectTrigger>
            <SelectContent>
              {netTermsOptions.map((term) => (
                <SelectItem key={term} value={term}>
                  {term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Due Date (Optional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, "PPP") : <span>Pick due date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="depositAmount">Deposit Amount Paid (Optional)</Label>
          <Input
            id="depositAmount"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Delivery/Rental Start Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !deliveryStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliveryStartDate ? format(deliveryStartDate, "PPP") : <span>Start date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deliveryStartDate}
                  onSelect={setDeliveryStartDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Delivery/Rental End Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !deliveryEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deliveryEndDate ? format(deliveryEndDate, "PPP") : <span>End date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deliveryEndDate}
                  onSelect={setDeliveryEndDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div>
          <Label htmlFor="city">City Where Service Provided (Optional)</Label>
          <Input
            id="city"
            placeholder="City location"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="bookingMethod">Booking Method (Optional)</Label>
          <Select value={bookingMethod} onValueChange={setBookingMethod}>
            <SelectTrigger>
              <SelectValue placeholder="How was this booked?" />
            </SelectTrigger>
            <SelectContent>
              {bookingMethodOptions.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <FileUploadZone
          label="Invoice (REQUIRED) *"
          description="Upload your invoice as sent to the producer"
          files={invoiceFiles}
          onFilesChange={setInvoiceFiles}
          maxFiles={5}
        />

        <FileUploadZone
          label="PO/Booking Confirmation"
          description="Purchase order, rental order, or booking confirmation"
          files={poFiles}
          onFilesChange={setPoFiles}
          maxFiles={3}
        />

        <FileUploadZone
          label="Contract/Agreement"
          description="Service agreement, rental terms, or contract"
          files={contractFiles}
          onFilesChange={setContractFiles}
          maxFiles={3}
        />

        <FileUploadZone
          label="Communication Records"
          description="Emails, texts, or other communication about payment"
          files={communicationFiles}
          onFilesChange={setCommunicationFiles}
          maxFiles={10}
        />

        <FileUploadZone
          label="Delivery/Completion Proof"
          description="Proof of delivery, return receipts, or service completion"
          files={deliveryProofFiles}
          onFilesChange={setDeliveryProofFiles}
          maxFiles={5}
        />

        <p className="text-sm text-muted-foreground border-l-4 border-status-warning pl-4 py-2">
          <strong>Minimum documentation required:</strong> Invoice + at least one of (PO, Contract, or Communication Records)
        </p>
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Vendor Report
        </Button>
      </div>
    </Card>
  );
}
