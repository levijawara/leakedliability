import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Power, PowerOff, Eye, Search, CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [blurNamesForPublic, setBlurNamesForPublic] = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [paymentConfirmations, setPaymentConfirmations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [leadingUsers, setLeadingUsers] = useState<Record<string, any>>({});
  const [selectedPaymentReport, setSelectedPaymentReport] = useState<any>(null);
  const [paymentDate, setPaymentDate] = useState<Date>();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
      setBlurNamesForPublic(settings.blur_names_for_public ?? true);
      setSettingsId(settings.id);
    }

    // Load all submissions
    const { data: subs } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });
    
    setSubmissions(subs || []);

    // Load all payment reports with crew member details
    const { data: reports } = await supabase
      .from("payment_reports")
      .select(`
        *,
        producer:producers(name, company),
        profiles!payment_reports_reporter_id_fkey(legal_first_name, legal_last_name)
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

    // Load payment confirmations with crew member details and report_id
    const { data: confirmations } = await supabase
      .from("payment_confirmations")
      .select(`
        *,
        payment_report:payment_reports!inner(
          reporter_id,
          report_id
        )
      `)
      .order("created_at", { ascending: false });

    // Enrich with crew member details from submissions
    const enrichedConfirmations = await Promise.all(
      (confirmations || []).map(async (pc: any) => {
        const { data: submission } = await supabase
          .from("submissions")
          .select("email, full_name")
          .eq("user_id", pc.payment_report.reporter_id)
          .eq("submission_type", "crew_report")
          .maybeSingle();
        
        return {
          ...pc,
          report_id: pc.payment_report.report_id || "N/A",
          full_name: submission?.full_name || "Unknown",
          email: submission?.email || "Unknown"
        };
      })
    );

    setPaymentConfirmations(enrichedConfirmations);

    // Load leading users for each submission type
    await loadLeadingUsers();
  };

  const loadLeadingUsers = async () => {
    const submissionTypes = [
      'crew_report',
      'payment_confirmation',
      'counter_dispute',
      'payment_documentation',
      'report_explanation',
      'report_dispute'
    ];

    const leaders: Record<string, any> = {};

    for (const type of submissionTypes) {
      // Get VERIFIED submission counts grouped by user_id
      const { data: verifiedSubmissions } = await supabase
        .from('submissions')
        .select('user_id, full_name, email')
        .eq('submission_type', type)
        .eq('verified', true); // Only count verified submissions

      if (verifiedSubmissions && verifiedSubmissions.length > 0) {
        // Count submissions per user
        const userCounts = verifiedSubmissions.reduce((acc: any, curr: any) => {
          if (!acc[curr.user_id]) {
            acc[curr.user_id] = {
              count: 0,
              name: curr.full_name,
              email: curr.email
            };
          }
          acc[curr.user_id].count++;
          return acc;
        }, {});

        // Find the user with the most submissions
        const leadingUserData: any = Object.values(userCounts).reduce((max: any, user: any) => 
          user.count > max.count ? user : max
        , { count: 0, name: null, email: null });

        if (leadingUserData.name && leadingUserData.email) {
          leaders[type] = leadingUserData;
        }
      }
    }

    setLeadingUsers(leaders);
  };

  const handleUserSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    // Search for user by name or email
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, legal_first_name, legal_last_name")
      .or(`legal_first_name.ilike.%${query}%,legal_last_name.ilike.%${query}%`);

    const { data: submissions } = await supabase
      .from("submissions")
      .select("user_id, full_name, email")
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(1);

    if (!submissions || submissions.length === 0) {
      setSearchResults({ notFound: true });
      return;
    }

    const user = submissions[0];

    // Get all submissions for this user
    const { data: userSubmissions } = await supabase
      .from("submissions")
      .select("submission_type")
      .eq("user_id", user.user_id);

    // Count by type
    const stats = {
      crew_report: 0,
      payment_confirmation: 0,
      counter_dispute: 0,
      payment_documentation: 0,
      report_explanation: 0,
      report_dispute: 0,
    };

    userSubmissions?.forEach((sub: any) => {
      if (sub.submission_type in stats) {
        stats[sub.submission_type as keyof typeof stats]++;
      }
    });

    setSearchResults({
      name: user.full_name,
      email: user.email,
      stats
    });
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

    // Create payment report for crew reports
    if (submission?.submission_type === 'crew_report') {
      const formData = submission.form_data;
      const producerName = formData.producer_name?.company || 
        `${formData.producer_name?.firstName || ''} ${formData.producer_name?.lastName || ''}`.trim() ||
        'Unknown Producer';
      
      // Find or create the producer
      let { data: existingProducer } = await supabase
        .from('producers')
        .select('id')
        .ilike('name', producerName)
        .maybeSingle();
      
      let producerId;
      
      if (!existingProducer) {
        const { data: newProducer, error: producerError } = await supabase
          .from('producers')
          .insert({
            name: producerName,
            company: formData.producer_name?.company || null
          })
          .select('id')
          .single();
        
        if (producerError) {
          console.error('Error creating producer:', producerError);
          toast({
            title: "Error",
            description: "Failed to create producer record",
            variant: "destructive",
          });
          return;
        }
        producerId = newProducer.id;
      } else {
        producerId = existingProducer.id;
      }
      
      // Create the payment report
      const invoiceDate = formData.invoice_date || new Date().toISOString().split('T')[0];
      const daysOverdue = Math.floor((new Date().getTime() - new Date(invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
      
      const { error: reportError } = await supabase
        .from('payment_reports')
        .insert({
          reporter_id: submission.user_id,
          producer_id: producerId,
          amount_owed: parseFloat(formData.amount_owed),
          project_name: formData.project_name || 'Not specified',
          invoice_date: invoiceDate,
          days_overdue: daysOverdue,
          city: formData.city || null,
          status: 'pending',
          verified: true,
          report_id: submission.report_id
        });
      
      if (reportError) {
        console.error('Error creating payment report:', reportError);
        toast({
          title: "Warning",
          description: "Submission verified but payment report creation failed",
          variant: "default",
        });
      }

      // Send verification email
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'crew_report_verified',
          to: submission.email,
          data: {
            reportId: submission.report_id,
            producerName,
            amount: parseFloat(formData.amount_owed),
            projectName: formData.project_name || "Not specified",
            verificationNotes: adminNotes || undefined,
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
      const producerName = formData.producer_name?.company || 
        `${formData.producer_name?.firstName || ''} ${formData.producer_name?.lastName || ''}`.trim() ||
        'Unknown Producer';

      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'crew_report_rejected',
          to: submission.email,
          data: {
            reportId: submission.report_id,
            producerName,
            amount: parseFloat(formData.amount_owed),
            projectName: formData.project_name || "Not specified",
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

  const toggleBlurNames = async () => {
    if (!settingsId) return;

    const newBlur = !blurNamesForPublic;
    const { error } = await supabase
      .from("site_settings")
      .update({ blur_names_for_public: newBlur })
      .eq("id", settingsId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setBlurNamesForPublic(newBlur);
    toast({
      title: "Name Blur " + (newBlur ? "Enabled" : "Disabled"),
      description: newBlur 
        ? "Producer names are now blurred for non-admin users on the leaderboard." 
        : "Producer names are now visible to everyone on the leaderboard.",
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

  const handleMarkAsPaid = async () => {
    if (!selectedPaymentReport || !paymentDate) {
      toast({
        title: "Error",
        description: "Please select a payment date",
        variant: "destructive",
      });
      return;
    }

    const formattedDate = paymentDate.toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('payment_reports')
      .update({
        status: 'paid',
        payment_date: formattedDate,
        closed_date: formattedDate
      })
      .eq('id', selectedPaymentReport.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Get crew member email from submissions
    const { data: submission } = await supabase
      .from('submissions')
      .select('email')
      .eq('user_id', selectedPaymentReport.reporter_id)
      .eq('submission_type', 'crew_report')
      .maybeSingle();

    // Send confirmation email to crew member
    if (submission) {
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'crew_report_payment_confirmed',
          to: submission.email,
          data: {
            reportId: selectedPaymentReport.report_id,
            producerName: selectedPaymentReport.producer?.name || 'Unknown',
            amount: selectedPaymentReport.amount_owed,
            paymentDate: formattedDate,
          }
        }
      });

      if (emailError) {
        console.error('Email failed:', emailError);
      }
    }

    toast({
      title: "Success",
      description: "Payment report marked as paid and crew member notified",
    });

    setShowPaymentModal(false);
    setSelectedPaymentReport(null);
    setPaymentDate(undefined);
    loadAdminData();
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

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-1">
              <Label htmlFor="blur-names" className="text-lg font-semibold flex items-center gap-2">
                <Eye className="h-5 w-5 text-muted-foreground" />
                Blur Names for Non-Admins
              </Label>
              <p className="text-sm text-muted-foreground">
                {blurNamesForPublic 
                  ? "Producer names are blurred on the leaderboard for non-admin users." 
                  : "Producer names are visible to everyone on the leaderboard."}
              </p>
            </div>
            <Switch
              id="blur-names"
              checked={blurNamesForPublic}
              onCheckedChange={toggleBlurNames}
            />
          </div>
        </div>
      </Card>

      {/* User Search */}
      <Card className="mb-6 p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="user-search" className="text-lg font-semibold flex items-center gap-2">
              <Search className="h-5 w-5" />
              User Search
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Search by name or email to view submission statistics
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              id="user-search"
              placeholder="Enter name or email..."
              value={searchQuery}
              onChange={(e) => handleUserSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

          {searchResults && (
            <Card className="p-4 bg-muted/50">
              {searchResults.notFound ? (
                <p className="text-muted-foreground">No user found matching your search.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold">{searchResults.name}</p>
                    <p className="text-sm text-muted-foreground">{searchResults.email}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Crew Member Reports ⚠️</div>
                      <div className="text-2xl font-bold">{searchResults.stats.crew_report}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Payment Documentations 🧾</div>
                      <div className="text-2xl font-bold">{searchResults.stats.payment_documentation}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Payment Confirmations ✅</div>
                      <div className="text-2xl font-bold">{searchResults.stats.payment_confirmation}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Report Explanations ☮️</div>
                      <div className="text-2xl font-bold">{searchResults.stats.report_explanation}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Counter-Disputes ‼️</div>
                      <div className="text-2xl font-bold">{searchResults.stats.counter_dispute}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Report Disputes ⁉️</div>
                      <div className="text-2xl font-bold">{searchResults.stats.report_dispute}</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </Card>

      <Tabs defaultValue="crew_report" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7 gap-1">
          <TabsTrigger value="crew_report">
            Crew Member Report ⚠️
          </TabsTrigger>
          <TabsTrigger value="payment_reports">
            Payment Reports 💰
          </TabsTrigger>
          <TabsTrigger value="payment_confirmation">
            Payment Confirmation ✅
          </TabsTrigger>
          <TabsTrigger value="counter_dispute">
            Counter-Dispute ‼️
          </TabsTrigger>
          <TabsTrigger value="payment_documentation">
            Payment Documentation 🧾
          </TabsTrigger>
          <TabsTrigger value="report_explanation">
            Report Explanation ☮️
          </TabsTrigger>
          <TabsTrigger value="report_dispute">
            Report Dispute ⁉️
          </TabsTrigger>
        </TabsList>

        {/* Payment Reports Tab */}
        <TabsContent value="payment_reports" className="space-y-4">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">All Payment Reports</h3>
              <Badge variant="outline">{paymentReports.length} total</Badge>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report ID</TableHead>
                  <TableHead>Crew Member</TableHead>
                  <TableHead>Producer</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No payment reports yet
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-mono text-xs">{report.report_id || 'N/A'}</TableCell>
                      <TableCell>
                        {report.profiles?.legal_first_name} {report.profiles?.legal_last_name}
                      </TableCell>
                      <TableCell>{report.producer?.name}</TableCell>
                      <TableCell>{report.project_name}</TableCell>
                      <TableCell>${report.amount_owed?.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={report.days_overdue > 90 ? "destructive" : "outline"}>
                          {report.days_overdue} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.status === 'paid' ? 'default' : 'secondary'}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{report.city || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {report.status !== 'paid' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedPaymentReport(report);
                                setShowPaymentModal(true);
                              }}
                            >
                              Mark as Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {['crew_report', 'payment_confirmation', 'counter_dispute', 'payment_documentation', 'report_explanation', 'report_dispute'].map((type) => {
          const filteredSubmissions = submissions.filter(s => s.submission_type === type);
          const leadingUser = leadingUsers[type];
          
          // Special handling for payment_confirmation tab
          if (type === 'payment_confirmation') {
            return (
              <TabsContent key={type} value={type} className="space-y-4">
                {leadingUser && (
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-semibold">🏆 Leading User</Badge>
                      <span className="font-medium">{leadingUser.name}</span>
                      <span className="text-muted-foreground">({leadingUser.email})</span>
                      <span className="ml-auto text-muted-foreground">{leadingUser.count} verified submissions</span>
                    </div>
                  </Card>
                )}

                <Card className="p-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentConfirmations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No payment confirmations yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        paymentConfirmations.map((pc) => (
                          <TableRow key={pc.id}>
                            <TableCell className="font-mono text-xs">{pc.report_id}</TableCell>
                            <TableCell>{new Date(pc.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>{pc.full_name}</TableCell>
                            <TableCell>{pc.email}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            );
          }
          
          return (
            <TabsContent key={type} value={type} className="space-y-4">
              {leadingUser && (
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="font-semibold">🏆 Leading User</Badge>
                    <span className="font-medium">{leadingUser.name}</span>
                    <span className="text-muted-foreground">({leadingUser.email})</span>
                    <span className="ml-auto text-muted-foreground">{leadingUser.count} verified submissions</span>
                  </div>
                </Card>
              )}

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
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
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

      </Tabs>

      {/* Payment Date Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Payment as Received</DialogTitle>
            <DialogDescription>
              Select the date when payment was received from the producer
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
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
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={setPaymentDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {selectedPaymentReport && (
              <div className="space-y-2 text-sm">
                <div><strong>Report ID:</strong> {selectedPaymentReport.report_id}</div>
                <div><strong>Producer:</strong> {selectedPaymentReport.producer?.name}</div>
                <div><strong>Amount:</strong> ${selectedPaymentReport.amount_owed?.toFixed(2)}</div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={!paymentDate}>
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
