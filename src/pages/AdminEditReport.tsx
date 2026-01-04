import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CalendarIcon, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { mapDatabaseError } from "@/lib/errors";

export default function AdminEditReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [originalReport, setOriginalReport] = useState<any>(null);
  const [producers, setProducers] = useState<any[]>([]);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [producerOpen, setProducerOpen] = useState(false);
  
  // Form state
  const [selectedProducerId, setSelectedProducerId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [amountOwed, setAmountOwed] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>();
  const [paymentDate, setPaymentDate] = useState<Date>();
  const [daysOverdue, setDaysOverdue] = useState("");
  const [city, setCity] = useState("");
  const [reporterType, setReporterType] = useState("");
  const [status, setStatus] = useState("");
  const [verified, setVerified] = useState(false);
  const [producerEmail, setProducerEmail] = useState("");

  useEffect(() => {
    checkAdminAndLoadData();
  }, [id]);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: hasAdminRole } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (!hasAdminRole) {
        toast({
          title: "Access Denied",
          description: "You must be an admin to access this page",
          variant: "destructive"
        });
        navigate("/admin");
        return;
      }

      setIsAdmin(true);
      await loadReportData();
      await loadProducers();
    } catch (error: any) {
      console.error("Auth check error:", error);
      toast({
        title: "Error",
        description: mapDatabaseError(error),
        variant: "destructive"
      });
      navigate("/admin");
    }
  };

  const loadReportData = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_reports')
        .select(`
          *,
          producer:producers(id, name, company),
          profiles(legal_first_name, legal_last_name)
        `)
        .eq('id', id)
        .single();
      
      // Load document URLs if they exist
      if (data?.document_urls && data.document_urls.length > 0) {
        // Documents will be displayed in the UI
      }

      if (error) throw error;

      setOriginalReport(data);
      setSelectedProducerId(data.producer_id);
      setProjectName(data.project_name || "");
      setAmountOwed(data.amount_owed?.toString() || "");
      setInvoiceDate(data.invoice_date ? new Date(data.invoice_date) : undefined);
      setPaymentDate(data.payment_date ? new Date(data.payment_date) : undefined);
      setDaysOverdue(data.days_overdue?.toString() || "0");
      setCity(data.city || "");
      setReporterType(data.reporter_type || "crew");
      setStatus(data.status || "pending");
      setVerified(data.verified || false);
      setProducerEmail(data.producer_email || "");
    } catch (error: any) {
      console.error("Load report error:", error);
      toast({
        title: "Error Loading Report",
        description: mapDatabaseError(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProducers = async () => {
    try {
      const { data, error } = await supabase
        .from('producers')
        .select('id, name, company')
        .order('name');

      if (error) throw error;
      setProducers(data || []);
    } catch (error: any) {
      console.error("Load producers error:", error);
    }
  };

  const getChanges = () => {
    const changes: Array<{ field: string; old: any; new: any; critical?: boolean; calculated?: boolean }> = [];

    if (selectedProducerId !== originalReport.producer_id) {
      const oldProducer = producers.find(p => p.id === originalReport.producer_id);
      const newProducer = producers.find(p => p.id === selectedProducerId);
      changes.push({
        field: "Producer",
        old: oldProducer ? `${oldProducer.name} ${oldProducer.company ? `(${oldProducer.company})` : ''}` : "Unknown",
        new: newProducer ? `${newProducer.name} ${newProducer.company ? `(${newProducer.company})` : ''}` : "Unknown",
        critical: true
      });
    }

    if (projectName !== (originalReport.project_name || "")) {
      changes.push({ field: "Project Name", old: originalReport.project_name || "", new: projectName });
    }

    if (parseFloat(amountOwed) !== originalReport.amount_owed) {
      changes.push({
        field: "Amount Owed",
        old: `$${originalReport.amount_owed?.toFixed(2) || "0.00"}`,
        new: `$${parseFloat(amountOwed).toFixed(2)}`
      });
    }

    const oldInvoiceDate = originalReport.invoice_date ? format(new Date(originalReport.invoice_date), "yyyy-MM-dd") : "";
    const newInvoiceDate = invoiceDate ? format(invoiceDate, "yyyy-MM-dd") : "";
    if (oldInvoiceDate !== newInvoiceDate) {
      changes.push({ field: "Invoice Date", old: oldInvoiceDate || "Not set", new: newInvoiceDate || "Not set" });
    }

    const oldPaymentDate = originalReport.payment_date ? format(new Date(originalReport.payment_date), "yyyy-MM-dd") : "";
    const newPaymentDate = paymentDate ? format(paymentDate, "yyyy-MM-dd") : "";
    if (oldPaymentDate !== newPaymentDate) {
      changes.push({ field: "Payment Date", old: oldPaymentDate || "Not set", new: newPaymentDate || "Not set" });
    }

    if (parseInt(daysOverdue) !== originalReport.days_overdue) {
      changes.push({
        field: "Days Overdue",
        old: originalReport.days_overdue?.toString() || "0",
        new: daysOverdue,
        calculated: true
      });
    }

    if (city !== (originalReport.city || "")) {
      changes.push({ field: "City", old: originalReport.city || "Not set", new: city || "Not set" });
    }

    if (reporterType !== (originalReport.reporter_type || "")) {
      changes.push({ field: "Reporter Type", old: originalReport.reporter_type || "crew", new: reporterType });
    }

    if (status !== (originalReport.status || "")) {
      changes.push({ field: "Status", old: originalReport.status || "pending", new: status });
    }

    if (verified !== originalReport.verified) {
      changes.push({ field: "Verified", old: originalReport.verified ? "Yes" : "No", new: verified ? "Yes" : "No" });
    }

    if (producerEmail !== (originalReport.producer_email || "")) {
      changes.push({ field: "Producer Email", old: originalReport.producer_email || "Not set", new: producerEmail || "Not set" });
    }

    return changes;
  };

  const handleSaveClick = () => {
    // Validation
    if (!selectedProducerId) {
      toast({
        title: "Validation Error",
        description: "Please select a producer",
        variant: "destructive"
      });
      return;
    }

    if (!projectName.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name is required",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(amountOwed);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Amount must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    if (!invoiceDate) {
      toast({
        title: "Validation Error",
        description: "Invoice date is required",
        variant: "destructive"
      });
      return;
    }

    if (invoiceDate > new Date()) {
      toast({
        title: "Validation Error",
        description: "Invoice date cannot be in the future",
        variant: "destructive"
      });
      return;
    }

    if (status === 'paid' && !paymentDate) {
      toast({
        title: "Validation Error",
        description: "Payment date is required when status is 'paid'",
        variant: "destructive"
      });
      return;
    }

    if (paymentDate && invoiceDate && paymentDate < invoiceDate) {
      toast({
        title: "Validation Error",
        description: "Payment date cannot be before invoice date",
        variant: "destructive"
      });
      return;
    }

    const changes = getChanges();
    if (changes.length === 0) {
      toast({
        title: "No Changes",
        description: "No fields have been modified",
      });
      return;
    }

    setShowDiffModal(true);
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    setShowDiffModal(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Calculate days overdue if invoice date changed
      const calculatedDaysOverdue = invoiceDate 
        ? Math.floor((new Date().getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
        : parseInt(daysOverdue);

      // Update payment report
      const { error: updateError } = await supabase
        .from('payment_reports')
        .update({
          producer_id: selectedProducerId,
          project_name: projectName.trim(),
          amount_owed: parseFloat(amountOwed),
          invoice_date: invoiceDate ? format(invoiceDate, "yyyy-MM-dd") : null,
          payment_date: paymentDate ? format(paymentDate, "yyyy-MM-dd") : null,
          days_overdue: calculatedDaysOverdue,
          city: city.trim() || null,
          reporter_type: reporterType as any,
          status: status as any,
          verified: verified,
          producer_email: producerEmail.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Trigger PSCS recalculation for affected producers
      const affectedProducerIds = new Set([selectedProducerId]);
      if (selectedProducerId !== originalReport.producer_id) {
        affectedProducerIds.add(originalReport.producer_id);
      }

      for (const producerId of affectedProducerIds) {
        const { error: calcError } = await supabase.rpc('calculate_pscs_score', {
          producer_uuid: producerId
        });
        if (calcError) console.error("PSCS calculation error:", calcError);
      }

      // Log the change to audit logs
      await supabase.from('audit_logs').insert({
        user_id: user!.id,
        event_type: 'edit_payment_report',
        payload: {
          report_id: id,
          changes: getChanges(),
          reason: 'Admin manual correction'
        }
      });

      toast({
        title: "Report Updated",
        description: "Payment report has been successfully updated and PSCS scores recalculated",
      });

      navigate("/admin");
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error Saving Changes",
        description: mapDatabaseError(error),
        variant: "destructive"
      });
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!originalReport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Report Not Found</CardTitle>
            <CardDescription>The payment report you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/admin")} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const changes = getChanges();

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background pt-20 md:pt-24 py-8">
      <div className="container max-w-5xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit Payment Report</CardTitle>
            <CardDescription>
              Report ID: {originalReport.report_id || id} | Reporter: {originalReport.profiles?.legal_first_name} {originalReport.profiles?.legal_last_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Producer & Project Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Producer *</Label>
                  <Popover open={producerOpen} onOpenChange={setProducerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedProducerId
                          ? producers.find(p => p.id === selectedProducerId)?.name
                          : "Select producer..."}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search producers..." />
                        <CommandList>
                          <CommandEmpty>No producer found.</CommandEmpty>
                          <CommandGroup>
                            {producers.map((producer) => (
                              <CommandItem
                                key={producer.id}
                                value={producer.name}
                                onSelect={() => {
                                  setSelectedProducerId(producer.id);
                                  setProducerOpen(false);
                                }}
                              >
                                {producer.name}
                                {producer.company && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({producer.company})
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amountOwed">Amount Owed ($) *</Label>
                  <Input
                    id="amountOwed"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountOwed}
                    onChange={(e) => setAmountOwed(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter city"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="producerEmail">Producer Email</Label>
                  <Input
                    id="producerEmail"
                    type="email"
                    value={producerEmail}
                    onChange={(e) => setProducerEmail(e.target.value)}
                    placeholder="producer@example.com"
                  />
                </div>
              </div>

              {/* Right Column: Payment & Timeline Info */}
              <div className="space-y-4">
                <div className="space-y-2">
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
                        {invoiceDate ? format(invoiceDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={invoiceDate}
                        onSelect={setInvoiceDate}
                        fromYear={1990}
                        toYear={new Date().getFullYear()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !paymentDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {paymentDate ? format(paymentDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={paymentDate}
                        onSelect={setPaymentDate}
                        fromYear={1990}
                        toYear={new Date().getFullYear()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daysOverdue">Days Overdue</Label>
                  <Input
                    id="daysOverdue"
                    type="number"
                    min="0"
                    value={daysOverdue}
                    onChange={(e) => setDaysOverdue(e.target.value)}
                    placeholder="Auto-calculated from invoice date"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be auto-calculated from invoice date if not manually set
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reporterType">Reporter Type</Label>
                  <Select value={reporterType} onValueChange={setReporterType}>
                    <SelectTrigger id="reporterType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crew">Crew</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="disputed">Disputed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="verified"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="verified" className="cursor-pointer">
                    Verified
                  </Label>
                </div>
              </div>

            </div>

            {/* Documents Section (for arena transcripts) */}
            {originalReport?.document_urls && originalReport.document_urls.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-base font-semibold">Documents:</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        // Get signed URLs for all documents
                        const paths = originalReport.document_urls.map((url: string) => {
                          // Extract path from full URL
                          const urlObj = new URL(url);
                          return urlObj.pathname.split('/storage/v1/object/public/submission-documents/')[1] || url.split('/').pop() || '';
                        }).filter(Boolean);
                        
                        if (paths.length === 0) {
                          toast({
                            title: "Error",
                            description: "No valid document paths found",
                            variant: "destructive",
                          });
                          return;
                        }

                        const { data: signedUrls } = await supabase.storage
                          .from('submission-documents')
                          .createSignedUrls(paths, 3600);
                        
                        if (signedUrls) {
                          // Download all as ZIP using JSZip
                          const JSZip = (await import('jszip')).default;
                          const zip = new JSZip();
                          
                          for (let i = 0; i < signedUrls.length; i++) {
                            const response = await fetch(signedUrls[i].signedUrl);
                            const blob = await response.blob();
                            const fileName = originalReport.document_urls[i].split('/').pop() || `document_${i + 1}`;
                            zip.file(fileName, blob);
                          }
                          
                          const content = await zip.generateAsync({ type: 'blob' });
                          const link = document.createElement('a');
                          link.href = URL.createObjectURL(content);
                          link.download = `report_${originalReport.report_id || id}_documents.zip`;
                          link.click();
                          URL.revokeObjectURL(link.href);
                          
                          toast({
                            title: "Success",
                            description: "Documents downloaded successfully",
                          });
                        }
                      } catch (error: any) {
                        console.error('Error downloading documents:', error);
                        toast({
                          title: "Error",
                          description: "Failed to download documents",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Download All as ZIP
                  </Button>
                </div>
                <ul className="space-y-2">
                  {originalReport.document_urls.map((url: string, idx: number) => {
                    const fileName = url.split('/').pop() || `Document ${idx + 1}`;
                    const isArenaTranscript = fileName.includes('arena-transcript');
                    return (
                      <li key={idx}>
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary hover:underline flex items-center gap-2"
                        >
                          {isArenaTranscript ? (
                            <>
                              <span className="font-semibold">Arena Transcript</span>
                              <span className="text-xs text-muted-foreground">({fileName})</span>
                            </>
                          ) : (
                            <>Document {idx + 1}</>
                          )}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                onClick={handleSaveClick}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/admin")}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Diff Modal */}
      <AlertDialog open={showDiffModal} onOpenChange={setShowDiffModal}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Changes to Official Payment Record
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              <div className="space-y-4">
                <p className="font-semibold">You are about to modify the following fields:</p>
                
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted px-4 py-2 font-mono text-xs font-semibold">
                    CHANGES
                  </div>
                  <div className="divide-y">
                    {changes.map((change, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "px-4 py-3 grid grid-cols-[120px_1fr_1fr] gap-4 text-xs",
                          change.critical && "bg-destructive/5",
                          change.calculated && "bg-yellow-500/5"
                        )}
                      >
                        <div className={cn(
                          "font-semibold",
                          change.critical && "text-destructive",
                          change.calculated && "text-yellow-600"
                        )}>
                          {change.field}:
                        </div>
                        <div className="text-muted-foreground line-through">
                          {change.old}
                        </div>
                        <div className="font-medium text-foreground">
                          → {change.new}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                  <p className="font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    THIS WILL:
                  </p>
                  <ul className="text-xs space-y-1 ml-6 list-disc">
                    <li>Recalculate PSCS score for affected producer(s)</li>
                    <li>Update leaderboard rankings</li>
                    <li>Trigger producer stats refresh</li>
                    <li>Create audit log entry</li>
                    {changes.some(c => c.critical) && (
                      <li className="text-destructive font-semibold">
                        Transfer this report to a different producer
                      </li>
                    )}
                  </ul>
                </div>

                <p className="font-semibold text-foreground">
                  Are you absolutely sure you want to proceed?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSave}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Yes, Save Changes"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    <Footer />
    </>
  );
}
