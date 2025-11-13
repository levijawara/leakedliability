import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Power, PowerOff, Eye, Search, CalendarIcon, Bell, Map, ChevronDown, Image } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { mapDatabaseError } from "@/lib/errors";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Footer } from "@/components/Footer";

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [paymentReports, setPaymentReports] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [moderationLogs, setModerationLogs] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [documentSignedUrls, setDocumentSignedUrls] = useState<string[]>([]);
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [blurNamesForPublic, setBlurNamesForPublic] = useState(true);
  const [sendProducerNotifications, setSendProducerNotifications] = useState(true);
  const [queuedNotifications, setQueuedNotifications] = useState<any[]>([]);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [paymentConfirmations, setPaymentConfirmations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [leadingUsers, setLeadingUsers] = useState<Record<string, any>>({});
  const [selectedPaymentReport, setSelectedPaymentReport] = useState<any>(null);
  const [paymentDate, setPaymentDate] = useState<Date>();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paidBy, setPaidBy] = useState("");
  const [confirmationNote, setConfirmationNote] = useState("");
  const [accountStats, setAccountStats] = useState({ crew: 0, vendor: 0, producer: 0, company: 0 });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("crew_report");
  const [newSearchCount, setNewSearchCount] = useState(0);
  const [reportFilter, setReportFilter] = useState<'all' | 'proxy' | 'user'>('all');
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    legal_first_name: '',
    legal_last_name: '',
    account_type: 'crew',
    producer_id: '',
    amount_owed: '',
    project_name: '',
    invoice_date: '',
    city: '',
    notes: '',
    new_producer_name: '',
    new_producer_company: '',
    new_producer_email: ''
  });
  const [producers, setProducers] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    // Set up real-time subscriptions
    const moderationChannel = supabase
      .channel('moderation_logs_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'moderation_logs'
      }, (payload) => {
        setModerationLogs(prev => [payload.new as any, ...prev]);
      })
      .subscribe();

    const auditChannel = supabase
      .channel('audit_logs_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_logs'
      }, (payload) => {
        setAuditLogs(prev => [payload.new as any, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(moderationChannel);
      supabase.removeChannel(auditChannel);
    };
  }, [isAdmin]);

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
        description: mapDatabaseError(error),
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
        setSendProducerNotifications(settings.send_producer_notifications ?? true);
        setSettingsId(settings.id);
      }

      // Load queued notifications count
      const { data: queued } = await supabase
        .from("queued_producer_notifications")
        .select("*")
        .is("sent_at", null);
      setQueuedNotifications(queued || []);

      // Load moderation logs
      const { data: modLogs } = await supabase
        .from('moderation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setModerationLogs(modLogs || []);

      // Check for new searches since last admin visit
      const lastVisit = localStorage.getItem('admin_last_inquiries_visit');
      if (lastVisit) {
        const { count } = await supabase
          .from('search_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', lastVisit);
        setNewSearchCount(count || 0);
      }

      // Load audit logs
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('*, profiles!audit_logs_user_id_fkey(legal_first_name, legal_last_name, email)')
        .order('created_at', { ascending: false })
        .limit(200);
      setAuditLogs(auditData || []);

    // Load account statistics
    await loadAccountStats();
    
    // Load all users for dropdown
    await loadAllUsers();

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
        profiles!payment_reports_reporter_id_fkey(legal_first_name, legal_last_name),
        admin_creator:profiles!payment_reports_admin_creator_id_fkey(legal_first_name, legal_last_name, email)
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

    // Load suggestions with profile data
    const { data: suggs } = await supabase
      .from('suggestions_with_profile')
      .select('*')
      .order('created_at', { ascending: false });
    setSuggestions(suggs || []);

    // Load all producers for the create user form dropdown
    const { data: producersList } = await supabase
      .from('producers')
      .select('id, name, company')
      .order('name', { ascending: true });
    setProducers(producersList || []);

    // Load leading users for each submission type
    await loadLeadingUsers();
  };

  const loadLeadingUsers = async () => {
    const submissionTypes = [
      'crew_report',
      'vendor_report',
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

  const loadAccountStats = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('account_type, business_name');
    
    const stats = {
      crew: profiles?.filter(p => p.account_type === 'crew').length || 0,
      vendor: profiles?.filter(p => p.account_type === 'vendor').length || 0,
      producer: profiles?.filter(p => p.account_type === 'producer').length || 0,
      company: profiles?.filter(p => p.account_type === 'producer' && p.business_name).length || 0
    };
    
    setAccountStats(stats);
  };

  const handleBackfillSubmissions = async () => {
    setBackfillLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-missing-submissions');
      
      if (error) throw error;

      toast({
        title: "Success",
        description: `✅ All admin-created payment reports synced with submissions. Inserted: ${data?.inserted || 0}`,
      });

      // Refresh data
      await loadAdminData();
    } catch (error: any) {
      console.error('Backfill error:', error);
      toast({
        title: "Error",
        description: "⚠️ Backfill failed — check logs.",
        variant: "destructive",
      });
    } finally {
      setBackfillLoading(false);
    }
  };

  const loadAllUsers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, legal_first_name, legal_last_name, business_name, account_type, email');
    
    const users = profiles?.map(p => ({
      user_id: p.user_id,
      name: `${p.legal_first_name} ${p.legal_last_name}`,
      business_name: p.business_name,
      account_type: p.account_type,
      email: p.email || 'No email'
    })) || [];
    
    // Sort alphabetically by last name, then first name
    users.sort((a, b) => {
      const aLast = a.name.split(' ').pop() || '';
      const bLast = b.name.split(' ').pop() || '';
      return aLast.localeCompare(bLast) || a.name.localeCompare(b.name);
    });
    
    setAllUsers(users);
  };

  const handleUserSelect = async (userId: string) => {
    // Get all submissions for this user
    const { data: userSubmissions } = await supabase
      .from("submissions")
      .select("submission_type, full_name, email")
      .eq("user_id", userId);

    if (!userSubmissions || userSubmissions.length === 0) {
      setSearchResults({ notFound: true });
      return;
    }

    const user = userSubmissions[0];

    // Count by type
    const stats = {
      crew_report: 0,
      payment_confirmation: 0,
      counter_dispute: 0,
      payment_documentation: 0,
      report_explanation: 0,
      report_dispute: 0,
    };

    userSubmissions.forEach((sub: any) => {
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
      
      // Extract producer email from form data
      const producerEmail = formData.producer_name?.email || null;
      
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
          report_id: submission.report_id,
          producer_email: producerEmail
        });
      
      if (reportError) {
        console.error('Error creating payment report:', reportError);
        toast({
          title: "Warning",
          description: "Submission verified but payment report creation failed",
          variant: "default",
        });
      }

      // Send verification email to crew member
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
        console.error('Crew member email sending failed:', emailError);
        toast({
          title: "Warning",
          description: "Submission verified but crew member email notification failed",
          variant: "default",
        });
      }

        // Send notification email to producer (or queue it)
        if (producerEmail) {
          // Check if producer notifications are enabled
          const { data: settings } = await supabase
            .from("site_settings")
            .select("send_producer_notifications")
            .single();

          const shouldSendNow = settings?.send_producer_notifications ?? true;

          if (shouldSendNow) {
            // Send immediately
            const { error: producerEmailError } = await supabase.functions.invoke('send-email', {
              body: {
                type: 'producer_report_notification',
                to: producerEmail,
                data: {
                  reportId: submission.report_id,
                  amountOwed: parseFloat(formData.amount_owed),
                  daysOverdue: daysOverdue,
                  projectName: formData.project_name || "Not specified",
                }
              }
            });

            if (producerEmailError) {
              console.error('Producer email sending failed:', producerEmailError);
              toast({
                title: "Warning",
                description: "Submission verified but producer notification email failed",
                variant: "default",
              });
            }
          } else {
            // Queue for later
            const { data: paymentReport } = await supabase
              .from('payment_reports')
              .select('id')
              .eq('report_id', submission.report_id)
              .single();

            if (paymentReport) {
              await supabase
                .from('queued_producer_notifications')
                .insert({
                  payment_report_id: paymentReport.id,
                  producer_email: producerEmail,
                  report_id: submission.report_id,
                  amount_owed: parseFloat(formData.amount_owed),
                  days_overdue: daysOverdue,
                  project_name: formData.project_name || "Not specified",
                });

              toast({
                title: "Notification Queued",
                description: "Producer notification queued (toggle is OFF)",
                variant: "default",
              });
            }
          }
        }
    }

    // Create payment report for vendor reports  
    if (submission?.submission_type === 'vendor_report') {
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
      
      // Calculate days overdue from due_date or invoice_date + 30
      const invoiceDate = formData.invoice_date || new Date().toISOString().split('T')[0];
      const dueDate = formData.due_date || invoiceDate;
      const daysOverdue = Math.floor((new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
      
      // Extract producer email from form data
      const producerEmail = formData.producer_name?.email || null;
      
      const { error: reportError } = await supabase
        .from('payment_reports')
        .insert({
          reporter_id: submission.user_id,
          producer_id: producerId,
          amount_owed: parseFloat(formData.amount_owed),
          project_name: formData.project_name || 'Not specified',
          invoice_date: invoiceDate,
          days_overdue: Math.max(0, daysOverdue),
          city: formData.city || null,
          status: 'pending',
          verified: true,
          producer_email: producerEmail
        });
      
      if (reportError) {
        console.error('Error creating payment report:', reportError);
        toast({
          title: "Warning",
          description: "Submission verified but payment report creation failed",
          variant: "default",
        });
      }

      // Send verification email to vendor
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'vendor_report_verified',
          to: submission.email,
          data: {
            vendorCompany: formData.vendor_company,
            contactName: formData.contact_name,
            producerName,
            amountOwed: parseFloat(formData.amount_owed),
            projectName: formData.project_name || "Not specified",
            invoiceNumber: formData.invoice_number,
            verificationNotes: adminNotes || undefined,
          }
        }
      });

      if (emailError) {
        console.error('Vendor email sending failed:', emailError);
        toast({
          title: "Warning",
          description: "Submission verified but vendor email notification failed",
          variant: "default",
        });
      }

      // Send notification email to producer (or queue it) - same logic as crew reports
      if (producerEmail) {
        const { data: settings } = await supabase
          .from("site_settings")
          .select("send_producer_notifications")
          .single();

        const shouldSendNow = settings?.send_producer_notifications ?? true;

        if (shouldSendNow) {
          const { error: producerEmailError } = await supabase.functions.invoke('send-email', {
            body: {
              type: 'producer_report_notification',
              to: producerEmail,
              data: {
                reportId: 'Vendor Report',
                amountOwed: parseFloat(formData.amount_owed),
                daysOverdue: Math.max(0, daysOverdue),
                projectName: formData.project_name || "Not specified",
              }
            }
          });

          if (producerEmailError) {
            console.error('Producer email sending failed:', producerEmailError);
          }
        }
      }
    }

    // Log the verification event
    await supabase.functions.invoke('log-event', {
      body: {
        event_type: 'submission_verified',
        payload: {
          submission_id: id,
          submission_type: submission.submission_type,
          report_id: submission.report_id
        }
      }
    });

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

    // Send rejection email if it's a vendor report
    if (submission?.submission_type === 'vendor_report') {
      const formData = submission.form_data;
      const producerName = formData.producer_name?.company || 
        `${formData.producer_name?.firstName || ''} ${formData.producer_name?.lastName || ''}`.trim() ||
        'Unknown Producer';

      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'vendor_report_rejected',
          to: submission.email,
          data: {
            vendorCompany: formData.vendor_company,
            contactName: formData.contact_name,
            producerName,
            projectName: formData.project_name || "Not specified",
            invoiceNumber: formData.invoice_number,
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

    // Log the rejection event
    await supabase.functions.invoke('log-event', {
      body: {
        event_type: 'submission_rejected',
        payload: {
          submission_id: id,
          submission_type: submission.submission_type,
          reason: adminNotes
        }
      }
    });

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
        description: mapDatabaseError(error),
        variant: "destructive",
      });
      return;
    }

    setMaintenanceMode(newMode);

    // Log the maintenance mode toggle
    await supabase.functions.invoke('log-event', {
      body: {
        event_type: 'maintenance_mode_toggled',
        payload: {
          enabled: newMode,
          message: maintenanceMessage || "We're making improvements! Check back soon 🛠️"
        }
      }
    });

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
        description: mapDatabaseError(error),
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

  const handleProducerNotificationToggle = async (checked: boolean) => {
    if (!settingsId) return;
    
    const { error } = await supabase
      .from("site_settings")
      .update({ send_producer_notifications: checked })
      .eq("id", settingsId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setSendProducerNotifications(checked);

    // Log the notification toggle
    await supabase.functions.invoke('log-event', {
      body: {
        event_type: 'producer_notification_toggled',
        payload: {
          enabled: checked,
          queued_count: queuedNotifications.length
        }
      }
    });

    // If turning ON, send all queued notifications
    if (checked && queuedNotifications.length > 0) {
      await sendQueuedNotifications();
    }

    toast({
      title: "Success",
      description: checked 
        ? "Producer notifications enabled" 
        : "Producer notifications paused",
    });
  };

  const sendQueuedNotifications = async () => {
    const { data: queued } = await supabase
      .from("queued_producer_notifications")
      .select("*")
      .is("sent_at", null);

    if (!queued || queued.length === 0) return;

    let successCount = 0;
    let failCount = 0;

    for (const notification of queued) {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'producer_report_notification',
          to: notification.producer_email,
          data: {
            reportId: notification.report_id,
            amountOwed: notification.amount_owed,
            daysOverdue: notification.days_overdue,
            projectName: notification.project_name,
          }
        }
      });

      if (!error) {
        // Mark as sent
        await supabase
          .from("queued_producer_notifications")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", notification.id);
        successCount++;
      } else {
        failCount++;
        console.error('Failed to send queued notification:', error);
      }
    }

    // Log the batch send event
    await supabase.functions.invoke('log-event', {
      body: {
        event_type: 'producer_notifications_sent',
        payload: {
          success_count: successCount,
          fail_count: failCount,
          total: queued.length
        }
      }
    });

    toast({
      title: "Queued Emails Sent",
      description: `Sent ${successCount} notifications${failCount > 0 ? `, ${failCount} failed` : ''}`,
    });

    loadAdminData(); // Refresh to show updated queue count
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
    if (!selectedPaymentReport || !paymentDate || !paidBy.trim()) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in payment date and who paid",
        variant: "destructive",
      });
      return;
    }

    try {
      const formattedDate = paymentDate.toISOString().split('T')[0];
      
      // Call the edge function to handle payment confirmation
      const { data, error: invokeError } = await supabase.functions.invoke('admin-confirm-payment', {
        body: {
          payment_report_id: selectedPaymentReport.id,
          paid_by: paidBy.trim(),
          payment_date: formattedDate,
          note: confirmationNote.trim() || null,
        },
      });

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "✅ Payment Confirmed",
        description: "Payment confirmation recorded and reporter notified",
      });

      // Reset modal state
      setShowPaymentModal(false);
      setSelectedPaymentReport(null);
      setPaymentDate(undefined);
      setPaidBy('');
      setConfirmationNote('');
      
      // Reload data
      await loadAdminData();

    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      toast({
        title: "Error",
        description: mapDatabaseError(error),
        variant: "destructive",
      });
    }
  };

  const handleCreateUserAndReport = async () => {
    try {
      if (!createUserForm.email || !createUserForm.legal_first_name || !createUserForm.legal_last_name) {
        toast({
          title: "Missing Required Fields",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      if (!createUserForm.producer_id || !createUserForm.amount_owed || !createUserForm.project_name || !createUserForm.invoice_date) {
        toast({
          title: "Missing Report Fields",
          description: "Please fill in all report details",
          variant: "destructive"
        });
        return;
      }

      // Validate new producer name if "new_producer" selected
      if (createUserForm.producer_id === 'new_producer' && !createUserForm.new_producer_name.trim()) {
        toast({
          title: "Missing Producer Name",
          description: "Please enter a name for the new producer",
          variant: "destructive"
        });
        return;
      }

      setLoading(true);

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: createUserForm.email.trim(),
          legal_first_name: createUserForm.legal_first_name.trim(),
          legal_last_name: createUserForm.legal_last_name.trim(),
          account_type: createUserForm.account_type,
          producer_id: createUserForm.producer_id,
          amount_owed: parseFloat(createUserForm.amount_owed),
          project_name: createUserForm.project_name.trim(),
          invoice_date: createUserForm.invoice_date,
          city: createUserForm.city.trim() || null,
          notes: createUserForm.notes.trim() || null,
          // Include new producer fields only if new_producer selected
          ...(createUserForm.producer_id === 'new_producer' && {
            new_producer_name: createUserForm.new_producer_name.trim(),
            new_producer_company: createUserForm.new_producer_company.trim() || null,
            new_producer_email: createUserForm.new_producer_email.trim() || null
          })
        }
      });

      if (error) throw error;

      const resultMessage = data.user_existed 
        ? `Report created for existing user. Report ID: ${data.report_number || data.report_id}`
        : `Account created and report submitted! Temp password: ${data.temp_password}. Report ID: ${data.report_number || data.report_id}`;

      toast({
        title: "Success",
        description: resultMessage,
      });

      // Reset form
      setCreateUserForm({
        email: '',
        legal_first_name: '',
        legal_last_name: '',
        account_type: 'crew',
        producer_id: '',
        amount_owed: '',
        project_name: '',
        invoice_date: '',
        city: '',
        notes: '',
        new_producer_name: '',
        new_producer_company: '',
        new_producer_email: ''
      });

      await loadAdminData();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: mapDatabaseError(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
    <div className="container mx-auto py-8 px-4 pb-20 space-y-8">
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
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                localStorage.setItem('admin_last_inquiries_visit', new Date().toISOString());
                setNewSearchCount(0);
                navigate("/admin/search-insights");
              }}
              className={cn(
                "flex items-center gap-2 relative",
                newSearchCount > 0 && "animate-pulse ring-2 ring-orange-500/50"
              )}
            >
              <Search className="h-4 w-4" />
              Inquiries
              {newSearchCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {newSearchCount > 99 ? '99+' : newSearchCount}
                </Badge>
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate("/sitemap")}>
              <Map className="h-4 w-4 mr-2" />
              Sitemap
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/hold-that-l")}
              className="flex items-center gap-2"
            >
              <Image className="h-4 w-4" />
              Generate #HoldThatL
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              Home
            </Button>
          </div>
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
              variant="status-inverted"
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
              variant="status"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-1">
              <Label htmlFor="producer-notifications" className="text-lg font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5 text-muted-foreground" />
                Producer Notification Emails
              </Label>
              <p className="text-sm text-muted-foreground">
                {sendProducerNotifications 
                  ? "Producers receive emails when crew reports are verified" 
                  : `Notifications paused (${queuedNotifications.length} queued)`}
              </p>
            </div>
            <Switch
              id="producer-notifications"
              checked={sendProducerNotifications}
              onCheckedChange={handleProducerNotificationToggle}
              variant="status"
            />
          </div>
        </div>
      </Card>

      {/* User Search */}
      <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
              <Search className="h-5 w-5" />
              User Search
            </h2>
            <p className="text-sm text-muted-foreground">
              Search by name or email to view submission statistics
            </p>
          </div>

          {/* Account Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Crew Member Accounts</div>
              <div className="text-3xl font-bold">⚠️ {accountStats.crew}</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Vendor / Service Provider Accounts</div>
              <div className="text-3xl font-bold">🛠️ {accountStats.vendor}</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Producer Accounts</div>
              <div className="text-3xl font-bold">🏢 {accountStats.producer}</div>
            </Card>
            
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Production Company Accounts</div>
              <div className="text-3xl font-bold">🎬 {accountStats.company}</div>
            </Card>
          </div>

          {/* User Dropdown */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full max-w-md justify-between"
              >
                {selectedUser 
                  ? `${selectedUser.name} - ${selectedUser.email}`
                  : "Select a user..."}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search by name or email..." />
                <CommandEmpty>No user found.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {allUsers.map((user) => (
                      <CommandItem
                        key={user.user_id}
                        value={`${user.name} ${user.email}`}
                        onSelect={() => {
                          setSelectedUser(user);
                          setOpen(false);
                          handleUserSelect(user.user_id);
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.email} • {user.account_type}
                            {user.business_name && ` • ${user.business_name}`}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

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

      <Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-1">Submissions & Reports</h2>
            <p className="text-sm text-muted-foreground">Review all submission types</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBackfillSubmissions}
              disabled={backfillLoading}
            >
              {backfillLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Syncing...
                </>
              ) : (
                'Backfill Missing Submissions'
              )}
            </Button>
            
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[200px] justify-between">
                {activeTab === "crew_report" && "Crew Reports ⚠️"}
                {activeTab === "vendor_report" && "Vendor Reports 📋"}
                {activeTab === "payment_confirmation" && "Payment Confirmation ✅"}
                {activeTab === "payment_documentation" && "Payment Documentation 🧾"}
                {activeTab === "report_explanation" && "Report Explanation ☮️"}
                {activeTab === "counter_dispute" && "Counter-Dispute ‼️"}
                {activeTab === "report_dispute" && "Report Dispute ⁉️"}
                {activeTab === "suggestions" && "Suggestions 💡"}
                {activeTab === "moderation" && "Moderation 🛡️"}
                {activeTab === "audit" && "Audit Logs 🧾"}
                {activeTab === "create_user" && "Create User + Report 👤"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px] bg-background">
              <DropdownMenuItem onClick={() => setActiveTab("crew_report")}>
                Crew Reports ⚠️
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("vendor_report")}>
                Vendor Reports 📋
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("payment_confirmation")}>
                Payment Confirmation ✅
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("payment_documentation")}>
                Payment Documentation 🧾
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("report_explanation")}>
                Report Explanation ☮️
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("counter_dispute")}>
                Counter-Dispute ‼️
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("report_dispute")}>
                Report Dispute ⁉️
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("suggestions")}>
                Suggestions 💡
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("moderation")}>
                Moderation 🛡️
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("audit")}>
                Audit Logs 🧾
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("create_user")}>
                Create User + Report 👤
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>

          {/* Payment Reports Tab */}
          <TabsContent value="payment_reports">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">All Payment Reports</h3>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Filter: {reportFilter === 'all' ? 'All' : reportFilter === 'proxy' ? 'Admin Created' : 'User Submitted'}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setReportFilter('all')}>
                      All Reports
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setReportFilter('proxy')}>
                      Admin Created Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setReportFilter('user')}>
                      User Submitted Only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Badge variant="outline">{paymentReports.filter(report => {
                  if (reportFilter === 'proxy') return report.created_by_admin === true;
                  if (reportFilter === 'user') return report.created_by_admin !== true;
                  return true;
                }).length} shown</Badge>
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-border/50 hover:bg-transparent">
                  <TableHead className="font-semibold">Report ID</TableHead>
                  <TableHead className="font-semibold">Crew Member</TableHead>
                  <TableHead className="text-xs">Producer</TableHead>
                  <TableHead className="text-xs">Project</TableHead>
                  <TableHead className="font-semibold">Amount</TableHead>
                  <TableHead className="text-xs">Days Overdue</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-xs">City</TableHead>
                  <TableHead className="text-xs">Submitted By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentReports.filter(report => {
                  if (reportFilter === 'proxy') return report.created_by_admin === true;
                  if (reportFilter === 'user') return report.created_by_admin !== true;
                  return true;
                }).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No payment reports match this filter
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentReports.filter(report => {
                    if (reportFilter === 'proxy') return report.created_by_admin === true;
                    if (reportFilter === 'user') return report.created_by_admin !== true;
                    return true;
                  }).map((report) => (
                    <TableRow key={report.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">{report.report_id || 'N/A'}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {report.profiles?.legal_first_name} {report.profiles?.legal_last_name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{report.producer?.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{report.project_name}</TableCell>
                      <TableCell className="text-sm font-medium">${report.amount_owed?.toFixed(2)}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={report.days_overdue > 90 ? "destructive" : "outline"}>
                          {report.days_overdue} days
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        <Badge variant={report.status === 'paid' ? 'default' : 'secondary'}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{report.city || '-'}</TableCell>
                      <TableCell className="text-xs">
                        {report.created_by_admin ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className="w-fit">
                              Admin Created
                            </Badge>
                            {report.admin_creator && (
                              <span className="text-[10px] text-muted-foreground">
                                by {report.admin_creator.legal_first_name} {report.admin_creator.legal_last_name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="w-fit">
                            User
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {report.status !== 'paid' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedPaymentReport(report);
                                setPaidBy(report.producer?.name || '');
                                setConfirmationNote('');
                                setPaymentDate(undefined);
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
        </TabsContent>

          {['crew_report', 'vendor_report', 'payment_confirmation', 'counter_dispute', 'payment_documentation', 'report_explanation', 'report_dispute'].map((type) => {
          const filteredSubmissions = submissions.filter(s => s.submission_type === type);
          const leadingUser = leadingUsers[type];
          
          // Special handling for payment_confirmation tab
          if (type === 'payment_confirmation') {
            return (
              <TabsContent key={type} value={type}>
                {leadingUser && (
                  <Card className="p-4 bg-primary/5 border-primary/20 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="font-semibold">🏆 Leading User</Badge>
                      <span className="font-medium">{leadingUser.name}</span>
                      <span className="text-muted-foreground">({leadingUser.email})</span>
                      <span className="ml-auto text-muted-foreground">{leadingUser.count} verified submissions</span>
                    </div>
                  </Card>
                )}

                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold">Report ID</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="text-xs">Email</TableHead>
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
                        <TableRow key={pc.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-mono text-xs text-muted-foreground">{pc.report_id}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(pc.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-sm font-medium">{pc.full_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{pc.email}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            );
          }
          
          return (
            <TabsContent key={type} value={type}>
              {leadingUser && (
                <Card className="p-4 bg-primary/5 border-primary/20 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="font-semibold">🏆 Leading User</Badge>
                    <span className="font-medium">{leadingUser.name}</span>
                    <span className="text-muted-foreground">({leadingUser.email})</span>
                    <span className="ml-auto text-muted-foreground">{leadingUser.count} verified submissions</span>
                  </div>
                </Card>
              )}

              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-border/50 hover:bg-transparent">
                    <TableHead className="font-semibold">Report ID</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubmissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No submissions of this type
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubmissions.map((sub) => (
                      <TableRow key={sub.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-xs text-muted-foreground">{sub.report_id || 'N/A'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-sm font-medium">{sub.full_name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{sub.email}</TableCell>
                        <TableCell className="text-sm font-medium">
                          <Badge variant={sub.status === 'pending' ? 'secondary' : sub.status === 'verified' ? 'default' : 'destructive'}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {sub.created_by_admin ? (
                            <Badge variant="secondary" className="w-fit">
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="w-fit">
                              User
                            </Badge>
                          )}
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

              {selectedItem && selectedItem.submission_type === type && (
                <Card className="p-6">
                  <h3 className="text-lg font-bold mb-4">Review Submission</h3>
                  <div className="space-y-4">
                    <div>
                      <p><strong>Name:</strong> {selectedItem.full_name}</p>
                      <p><strong>Email:</strong> {selectedItem.email}</p>
                      <p><strong>Type:</strong> {selectedItem.submission_type}</p>
                      {selectedItem.role_department && (
                        <p><strong>Role/Vendor Type:</strong> {selectedItem.role_department}</p>
                      )}
                    </div>
                    
                    {/* Vendor-specific fields display */}
                    {selectedItem.submission_type === 'vendor_report' && selectedItem.form_data && (
                      <div className="space-y-3 border-l-4 border-primary/30 pl-4">
                        <h4 className="font-semibold text-sm uppercase text-muted-foreground">Vendor Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Company</p>
                            <p className="font-medium">{selectedItem.form_data.vendor_company}</p>
                          </div>
                          {selectedItem.form_data.vendor_dba && (
                            <div>
                              <p className="text-xs text-muted-foreground">DBA</p>
                              <p className="font-medium">{selectedItem.form_data.vendor_dba}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground">Vendor Type</p>
                            <p className="font-medium">{selectedItem.form_data.vendor_type === 'Other' ? selectedItem.form_data.vendor_type_other : selectedItem.form_data.vendor_type}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Contact</p>
                            <p className="font-medium">{selectedItem.form_data.contact_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Invoice #</p>
                            <p className="font-mono text-sm">{selectedItem.form_data.invoice_number}</p>
                          </div>
                          {selectedItem.form_data.purchase_order_number && (
                            <div>
                              <p className="text-xs text-muted-foreground">PO #</p>
                              <p className="font-mono text-sm">{selectedItem.form_data.purchase_order_number}</p>
                            </div>
                          )}
                          {selectedItem.form_data.net_terms && (
                            <div>
                              <p className="text-xs text-muted-foreground">Net Terms</p>
                              <p className="font-medium">{selectedItem.form_data.net_terms}</p>
                            </div>
                          )}
                          {selectedItem.form_data.booking_method && (
                            <div>
                              <p className="text-xs text-muted-foreground">Booking Method</p>
                              <p className="font-medium">{selectedItem.form_data.booking_method}</p>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Service Description</p>
                          <p className="text-sm mt-1">{selectedItem.form_data.service_description}</p>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <strong>Form Data:</strong>
                      <pre className="mt-2 p-4 bg-muted rounded-md text-sm overflow-auto max-h-96">
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

        {/* Suggestions Tab */}
        <TabsContent value="suggestions">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">User Suggestions</h3>
            <Badge variant="outline">{suggestions.length} total</Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-border/50 hover:bg-transparent">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">User</TableHead>
                <TableHead className="font-semibold">Suggestion</TableHead>
                <TableHead className="text-xs">Total by User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No suggestions yet
                  </TableCell>
                </TableRow>
              ) : (
                suggestions.map((suggestion) => (
                  <TableRow key={suggestion.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(suggestion.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {suggestion.user_id ? (
                        <div>
                          <div className="font-medium">
                            {suggestion.legal_first_name} {suggestion.legal_last_name}
                            {suggestion.business_name && ` (${suggestion.business_name})`}
                          </div>
                          <div className="text-xs text-muted-foreground">{suggestion.email}</div>
                          <Badge variant="outline" className="text-xs mt-1">{suggestion.account_type}</Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Anonymous</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm whitespace-pre-wrap">{suggestion.suggestion}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground text-center">
                      {suggestion.total_suggestions_by_user || 1}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Moderation Logs Tab */}
        <TabsContent value="moderation">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Moderation Logs</h3>
            <Badge variant="outline">{moderationLogs.length} logs</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target Type</TableHead>
                <TableHead>Target ID</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {moderationLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No moderation logs yet
                  </TableCell>
                </TableRow>
              ) : (
                moderationLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.target_type}</TableCell>
                    <TableCell className="text-xs font-mono">{log.target_id.substring(0, 8)}...</TableCell>
                    <TableCell className="text-sm max-w-md">
                      {log.notes || <span className="text-muted-foreground">No notes</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold">Audit Logs</h3>
              <p className="text-sm text-muted-foreground">Complete history of all admin actions</p>
            </div>
            <Badge variant="outline">{auditLogs.length} logs</Badge>
          </div>
          
          <div className="mb-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by event type or user..."
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No audit logs yet
                  </TableCell>
                </TableRow>
              ) : (
                auditLogs
                  .filter(log => {
                    if (!auditSearchQuery) return true;
                    const query = auditSearchQuery.toLowerCase();
                    const userName = log.profiles 
                      ? `${log.profiles.legal_first_name} ${log.profiles.legal_last_name}`.toLowerCase()
                      : '';
                    return log.event_type.toLowerCase().includes(query) || userName.includes(query);
                  })
                  .map((log) => {
                    const eventTypeColors: Record<string, string> = {
                      'submission_verified': 'bg-green-500/10 text-green-700 dark:text-green-400',
                      'submission_rejected': 'bg-red-500/10 text-red-700 dark:text-red-400',
                      'payment_marked_paid': 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
                      'maintenance_mode_toggled': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
                      'producer_notification_toggled': 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
                      'producer_notifications_sent': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
                    };

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.profiles ? (
                            <div>
                              <div className="font-medium">
                                {log.profiles.legal_first_name} {log.profiles.legal_last_name}
                              </div>
                              <div className="text-xs text-muted-foreground">{log.profiles.email}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={eventTypeColors[log.event_type] || ''}
                          >
                            {log.event_type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <details className="cursor-pointer group">
                            <summary className="text-sm text-muted-foreground group-hover:text-foreground">
                              View payload →
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </details>
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Create User + Report Tab */}
        <TabsContent value="create_user">
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Create Account & Submit Report</h3>
              <p className="text-sm text-muted-foreground">
                Create a new crew member or vendor account and file a report on their behalf.
                The user will receive an email with their credentials.
              </p>
            </div>

            <div className="space-y-6">
              {/* User Information Section */}
              <div className="border-l-4 border-primary/30 pl-4 space-y-4">
                <h4 className="font-semibold text-sm uppercase text-muted-foreground">User Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="create-email">Email *</Label>
                    <Input
                      id="create-email"
                      type="email"
                      placeholder="user@example.com"
                      value={createUserForm.email}
                      onChange={(e) => setCreateUserForm({...createUserForm, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-account-type">Account Type *</Label>
                    <select
                      id="create-account-type"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={createUserForm.account_type}
                      onChange={(e) => setCreateUserForm({...createUserForm, account_type: e.target.value})}
                    >
                      <option value="crew">Crew Member</option>
                      <option value="vendor">Vendor</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="create-first-name">Legal First Name *</Label>
                    <Input
                      id="create-first-name"
                      placeholder="John"
                      value={createUserForm.legal_first_name}
                      onChange={(e) => setCreateUserForm({...createUserForm, legal_first_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-last-name">Legal Last Name *</Label>
                    <Input
                      id="create-last-name"
                      placeholder="Doe"
                      value={createUserForm.legal_last_name}
                      onChange={(e) => setCreateUserForm({...createUserForm, legal_last_name: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Report Information Section */}
              <div className="border-l-4 border-destructive/30 pl-4 space-y-4">
                <h4 className="font-semibold text-sm uppercase text-muted-foreground">Report Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="create-producer">Producer *</Label>
                    <select
                      id="create-producer"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={createUserForm.producer_id}
                      onChange={(e) => setCreateUserForm({...createUserForm, producer_id: e.target.value})}
                    >
                      <option value="">Select a producer...</option>
                      {producers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.company && `(${p.company})`}
                        </option>
                      ))}
                      <option value="new_producer">➕ New Producer / Company</option>
                    </select>

                    {/* Conditional inline form for new producer */}
                    {createUserForm.producer_id === 'new_producer' && (
                      <div className="mt-4 space-y-3 border border-primary/20 p-4 rounded-md bg-primary/5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase">New Producer Details</p>
                        
                        <div>
                          <Label htmlFor="new-producer-name">Producer Name *</Label>
                          <Input
                            id="new-producer-name"
                            placeholder="Jane Smith / Production Company LLC"
                            value={createUserForm.new_producer_name}
                            onChange={(e) =>
                              setCreateUserForm({
                                ...createUserForm,
                                new_producer_name: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="new-producer-company">Company (Optional)</Label>
                          <Input
                            id="new-producer-company"
                            placeholder="Big Budget Productions"
                            value={createUserForm.new_producer_company}
                            onChange={(e) =>
                              setCreateUserForm({
                                ...createUserForm,
                                new_producer_company: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="new-producer-email">Email (Optional)</Label>
                          <Input
                            id="new-producer-email"
                            type="email"
                            placeholder="producer@example.com"
                            value={createUserForm.new_producer_email}
                            onChange={(e) =>
                              setCreateUserForm({
                                ...createUserForm,
                                new_producer_email: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="create-amount">Amount Owed * ($)</Label>
                    <Input
                      id="create-amount"
                      type="number"
                      step="0.01"
                      placeholder="2500.00"
                      value={createUserForm.amount_owed}
                      onChange={(e) => setCreateUserForm({...createUserForm, amount_owed: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-project">Project Name *</Label>
                    <Input
                      id="create-project"
                      placeholder="Project Title"
                      value={createUserForm.project_name}
                      onChange={(e) => setCreateUserForm({...createUserForm, project_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-invoice-date">Invoice Date *</Label>
                    <Input
                      id="create-invoice-date"
                      type="date"
                      value={createUserForm.invoice_date}
                      onChange={(e) => setCreateUserForm({...createUserForm, invoice_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-city">City (Optional)</Label>
                    <Input
                      id="create-city"
                      placeholder="Los Angeles"
                      value={createUserForm.city}
                      onChange={(e) => setCreateUserForm({...createUserForm, city: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="create-notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="create-notes"
                    placeholder="Any additional context about this report..."
                    rows={3}
                    value={createUserForm.notes}
                    onChange={(e) => setCreateUserForm({...createUserForm, notes: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateUserForm({
                      email: '',
                      legal_first_name: '',
                      legal_last_name: '',
                      account_type: 'crew',
                      producer_id: '',
                      amount_owed: '',
                      project_name: '',
                      invoice_date: '',
                      city: '',
                      notes: '',
                      new_producer_name: '',
                      new_producer_company: '',
                      new_producer_email: ''
                    });
                  }}
                >
                  Clear Form
                </Button>
                <Button
                  onClick={handleCreateUserAndReport}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account & Report'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        </Tabs>
      </Card>

      {/* Payment Confirmation Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payment Received</DialogTitle>
            <DialogDescription>
              Confirm that payment has been received from the producer
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Report Summary */}
            {selectedPaymentReport && (
              <Card className="p-3 bg-muted/50">
                <div className="space-y-1 text-sm">
                  <div><strong>Report ID:</strong> {selectedPaymentReport.report_id}</div>
                  <div><strong>Crew/Vendor:</strong> {selectedPaymentReport.profiles?.legal_first_name} {selectedPaymentReport.profiles?.legal_last_name}</div>
                  <div><strong>Producer:</strong> {selectedPaymentReport.producer?.name}</div>
                  <div><strong>Project:</strong> {selectedPaymentReport.project_name}</div>
                  <div><strong>Amount:</strong> ${selectedPaymentReport.amount_owed?.toFixed(2)}</div>
                </div>
              </Card>
            )}

            {/* Paid By Field */}
            <div>
              <Label htmlFor="paid-by">Paid By</Label>
              <Input
                id="paid-by"
                placeholder="e.g. Satien Mehta"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Who made the payment (defaults to producer name)
              </p>
            </div>

            {/* Payment Date */}
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

            {/* Note Field */}
            <div>
              <Label htmlFor="confirmation-note">Note (Optional)</Label>
              <Textarea
                id="confirmation-note"
                placeholder="Confirmed by admin on behalf of crew member..."
                value={confirmationNote}
                onChange={(e) => setConfirmationNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPaymentModal(false);
              setPaidBy("");
              setConfirmationNote("");
              setPaymentDate(undefined);
            }}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={!paymentDate || !paidBy}>
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}
