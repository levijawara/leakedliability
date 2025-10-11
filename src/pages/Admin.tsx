import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Power, PowerOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getSignedUrls } from "@/lib/storage";
import JSZip from "jszip";

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [paymentReports, setPaymentReports] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [documentSignedUrls, setDocumentSignedUrls] = useState<string[]>([]);
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has admin role via secure function
      const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });

      if (error || !data) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    // Load site settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("*")
      .single();
    
    if (settings) {
      setMaintenanceMode(settings.maintenance_mode);
      setMaintenanceMessage(settings.maintenance_message || "");
      setSettingsId(settings.id);
    }

    // Load all submissions
    const { data: subs } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });
    
    setSubmissions(subs || []);

    // Load all payment reports
    const { data: reports } = await supabase
      .from("payment_reports")
      .select(`
        *,
        producer:producers(name, company)
      `)
      .order("created_at", { ascending: false });
    
    setPaymentReports(reports || []);

    // Load all disputes
    const { data: disps } = await supabase
      .from("disputes")
      .select(`
        *,
        payment_report:payment_reports(project_name)
      `)
      .order("created_at", { ascending: false });
    
    setDisputes(disps || []);
  };

  const handleVerifySubmission = async (id: string) => {
    const submission = submissions.find(s => s.id === id);
    
    const { error } = await supabase
      .from("submissions")
      .update({ 
        verified: true, 
        status: "verified",
        admin_notes: adminNotes || null 
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Send verification email if it's a crew report
    if (submission?.submission_type === 'crew_report') {
      const formData = submission.form_data;
      const producerName = formData.producerCompany || 
        `${formData.producerFirstName} ${formData.producerLastName}`.trim();

      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'crew_report_verified',
          to: submission.email,
          data: {
            reportId: submission.report_id,
            producerName,
            amount: formData.amountOwed,
            projectName: formData.projectName,
            verificationNotes: adminNotes,
          }
        }
      });

      if (emailError) {
        console.error('Email sending failed:', emailError);
        toast({
          title: "Warning",
          description: "Submission verified but email notification failed",
          variant: "default",
        });
      }
    }

    toast({
      title: "Success",
      description: "Submission verified successfully",
    });
    loadAdminData();
    setSelectedItem(null);
    setAdminNotes("");
  };

  const handleRejectSubmission = async (id: string) => {
    if (!adminNotes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    const submission = submissions.find(s => s.id === id);

    const { error } = await supabase
      .from("submissions")
      .update({ 
        status: "rejected",
        admin_notes: adminNotes 
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Send rejection email if it's a crew report
    if (submission?.submission_type === 'crew_report') {
      const formData = submission.form_data;
      const producerName = formData.producerCompany || 
        `${formData.producerFirstName} ${formData.producerLastName}`.trim();

      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'crew_report_rejected',
          to: submission.email,
          data: {
            reportId: submission.report_id,
            producerName,
            amount: formData.amountOwed,
            projectName: formData.projectName,
            rejectionReason: adminNotes,
          }
        }
      });

      if (emailError) {
        console.error('Email sending failed:', emailError);
        toast({
          title: "Warning",
          description: "Submission rejected but email notification failed",
          variant: "default",
        });
      }
    }

    toast({
      title: "Rejected",
      description: "Submission rejected",
    });
    loadAdminData();
    setSelectedItem(null);
    setAdminNotes("");
  };

  const handleVerifyPaymentReport = async (id: string) => {
    const { error } = await supabase
      .from("payment_reports")
      .update({ verified: true })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Payment report verified",
      });
      loadAdminData();
    }
  };

  const loadDocumentUrls = async (documentUrls: string[]) => {
    if (!documentUrls || documentUrls.length === 0) {
      setDocumentSignedUrls([]);
      return;
    }

    setLoadingUrls(true);
    try {
      const urls = await getSignedUrls(documentUrls, 3600); // 1 hour expiration
      setDocumentSignedUrls(urls);
    } catch (error: any) {
      toast({
        title: "Error Loading Documents",
        description: error.message,
        variant: "destructive",
      });
      setDocumentSignedUrls([]);
    } finally {
      setLoadingUrls(false);
    }
  };

  const downloadAllAsZip = async (documentPaths: string[], itemId: string, itemType: string) => {
    try {
      toast({
        title: "Preparing Download",
        description: "Creating ZIP file...",
      });

      const urls = await getSignedUrls(documentPaths, 3600);
      const zip = new JSZip();

      // Fetch and add each file to the ZIP
      for (let i = 0; i < urls.length; i++) {
        const response = await fetch(urls[i]);
        const blob = await response.blob();
        const fileName = documentPaths[i].split('/').pop() || `document_${i + 1}`;
        zip.file(fileName, blob);
      }

      // Generate and download the ZIP
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${itemType}_${itemId}_documents.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast({
        title: "Success",
        description: "Documents downloaded successfully",
      });
    } catch (error) {
      console.error('Error creating ZIP:', error);
      toast({
        title: "Error",
        description: "Failed to create ZIP file",
        variant: "destructive",
      });
    }
  };

  const toggleMaintenanceMode = async () => {
    if (!settingsId) return;

    const newMode = !maintenanceMode;
    const { error } = await supabase
      .from("site_settings")
      .update({ 
        maintenance_mode: newMode,
        maintenance_message: maintenanceMessage || "We're making improvements! Check back soon 🛠️"
      })
      .eq("id", settingsId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setMaintenanceMode(newMode);
    toast({
      title: "Maintenance Mode " + (newMode ? "Enabled" : "Disabled"),
      description: newMode 
        ? "Site is now in maintenance mode. Only admins can access it." 
        : "Site is now accessible to everyone.",
    });
  };

  const handleResolveDispute = async (id: string, resolution: string) => {
    if (!adminNotes.trim()) {
      toast({
        title: "Notes Required",
        description: "Please provide resolution notes",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("disputes")
      .update({ 
        status: resolution,
        resolution_notes: adminNotes 
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Dispute resolved",
      });
      loadAdminData();
      setSelectedItem(null);
      setAdminNotes("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {maintenanceMode && (
        <Card className="mb-6 p-4 bg-yellow-500/10 border-yellow-500/50">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 font-semibold">
            <PowerOff className="h-5 w-5" />
            Maintenance Mode Active - Only you can see this
          </div>
        </Card>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Review and manage all submissions, reports, and disputes</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            Home
          </Button>
        </div>
      </div>

      {/* Maintenance Mode Control */}
      <Card className="mb-6 p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="maintenance-mode" className="text-lg font-semibold flex items-center gap-2">
                {maintenanceMode ? <PowerOff className="h-5 w-5 text-destructive" /> : <Power className="h-5 w-5 text-primary" />}
                Maintenance Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                {maintenanceMode 
                  ? "Site is currently in maintenance mode. Only admins can access it." 
                  : "Site is accessible to everyone."}
              </p>
            </div>
            <Switch
              id="maintenance-mode"
              checked={maintenanceMode}
              onCheckedChange={toggleMaintenanceMode}
              className="data-[state=checked]:bg-destructive"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="maintenance-message">Maintenance Message</Label>
            <Textarea
              id="maintenance-message"
              placeholder="We're making improvements! Check back soon 🛠️"
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              rows={2}
            />
            <Button 
              size="sm" 
              variant="outline"
              onClick={toggleMaintenanceMode}
              disabled={!maintenanceMessage.trim()}
            >
              Update Message & Save
            </Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1">
          <TabsTrigger value="reports" className="text-xs sm:text-sm">
            📊 <span className="hidden sm:inline ml-1">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="disputes" className="text-xs sm:text-sm">
            ⚖️ <span className="hidden sm:inline ml-1">Disputes</span>
          </TabsTrigger>
          <TabsTrigger value="crew_report" className="text-xs sm:text-sm">
            ⚠️ <span className="hidden sm:inline ml-1">Crew Report</span>
          </TabsTrigger>
          <TabsTrigger value="payment_confirmation" className="text-xs sm:text-sm">
            ✅ <span className="hidden sm:inline ml-1">Payment</span>
          </TabsTrigger>
          <TabsTrigger value="counter_dispute" className="text-xs sm:text-sm">
            ‼️ <span className="hidden sm:inline ml-1">Counter</span>
          </TabsTrigger>
          <TabsTrigger value="payment_documentation" className="text-xs sm:text-sm">
            🧾 <span className="hidden sm:inline ml-1">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="report_explanation" className="text-xs sm:text-sm">
            ☮️ <span className="hidden sm:inline ml-1">Explain</span>
          </TabsTrigger>
          <TabsTrigger value="report_dispute" className="text-xs sm:text-sm">
            ⁉️ <span className="hidden sm:inline ml-1">Dispute</span>
          </TabsTrigger>
        </TabsList>

        {['crew_report', 'payment_confirmation', 'counter_dispute', 'payment_documentation', 'report_explanation', 'report_dispute'].map((type) => {
          const filteredSubmissions = submissions.filter(s => s.submission_type === type);
          
          return (
            <TabsContent key={type} value={type} className="space-y-4">
              <Card className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No submissions of this type
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubmissions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-mono text-xs">{sub.report_id || 'N/A'}</TableCell>
                          <TableCell>{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{sub.full_name}</TableCell>
                          <TableCell>{sub.email}</TableCell>
                          <TableCell>
                            <Badge variant={sub.status === 'pending' ? 'secondary' : sub.status === 'verified' ? 'default' : 'destructive'}>
                              {sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                setSelectedItem(sub);
                                setAdminNotes(sub.admin_notes || "");
                                await loadDocumentUrls(sub.document_urls || []);
                              }}
                            >
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>

              {selectedItem && selectedItem.submission_type === type && (
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4">Review Submission</h3>
                  <div className="space-y-4">
                    <div>
                      <p><strong>Name:</strong> {selectedItem.full_name}</p>
                      <p><strong>Email:</strong> {selectedItem.email}</p>
                      <p><strong>Type:</strong> {selectedItem.submission_type}</p>
                      {selectedItem.role_department && (
                        <p><strong>Role:</strong> {selectedItem.role_department}</p>
                      )}
                    </div>
                    
                    <div>
                      <strong>Form Data:</strong>
                      <pre className="mt-2 p-4 bg-muted rounded-md text-sm overflow-auto">
                        {JSON.stringify(selectedItem.form_data, null, 2)}
                      </pre>
                    </div>

                    {selectedItem.document_urls && selectedItem.document_urls.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <strong>Documents:</strong>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadAllAsZip(selectedItem.document_urls, selectedItem.id, 'submission')}
                          >
                            Download All as ZIP
                          </Button>
                        </div>
                        {loadingUrls ? (
                          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading documents...</span>
                          </div>
                        ) : (
                          <ul className="mt-2 space-y-1">
                            {documentSignedUrls.map((url: string, idx: number) => (
                              <li key={idx}>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  Document {idx + 1}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium">Admin Notes</label>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add notes about this submission..."
                        className="mt-2"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => handleVerifySubmission(selectedItem.id)}>
                        Verify & Approve
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => handleRejectSubmission(selectedItem.id)}
                      >
                        Reject
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setSelectedItem(null);
                        setAdminNotes("");
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>
          );
        })}

        <TabsContent value="reports" className="space-y-4">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Producer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-mono text-xs">N/A</TableCell>
                    <TableCell>{new Date(report.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{report.project_name}</TableCell>
                    <TableCell>{report.producer?.name || 'N/A'}</TableCell>
                    <TableCell>${report.amount_owed.toLocaleString()}</TableCell>
                    <TableCell>{report.days_overdue}</TableCell>
                    <TableCell>
                      <Badge variant={report.verified ? 'default' : 'secondary'}>
                        {report.verified ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!report.verified && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerifyPaymentReport(report.id)}
                        >
                          Verify
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="disputes" className="space-y-4">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell className="font-mono text-xs">N/A</TableCell>
                    <TableCell>{new Date(dispute.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="capitalize">{dispute.dispute_type}</TableCell>
                    <TableCell>{dispute.payment_report?.project_name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={dispute.status === 'pending' ? 'secondary' : 'default'}>
                        {dispute.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(dispute);
                          setAdminNotes(dispute.resolution_notes || "");
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {selectedItem && selectedItem.dispute_type && (
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Review Dispute</h3>
              <div className="space-y-4">
                <div>
                  <p><strong>Type:</strong> {selectedItem.dispute_type}</p>
                  <p><strong>Explanation:</strong> {selectedItem.explanation}</p>
                  {selectedItem.evidence_url && (
                    <p>
                      <strong>Evidence:</strong>{' '}
                      <a href={selectedItem.evidence_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        View Evidence
                      </a>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Resolution Notes</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add resolution notes..."
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleResolveDispute(selectedItem.id, 'resolved')}>
                    Resolve (Approve)
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => handleResolveDispute(selectedItem.id, 'rejected')}
                  >
                    Reject Dispute
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setSelectedItem(null);
                    setAdminNotes("");
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
