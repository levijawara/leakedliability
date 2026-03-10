import { useEffect, useState } from "react";
import Papa from 'papaparse';
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Power, PowerOff, Eye, Search, CalendarIcon, Bell, Map, ChevronDown, Image, GitMerge, Edit, Unlock, Link, MessageSquare, BookOpen } from "lucide-react";
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

import { BroadcastEmailSender } from "@/components/admin/BroadcastEmailSender";
import { DatabaseExportPanel } from "@/components/admin/DatabaseExportPanel";
import { ProducerNotificationSelector } from "@/components/admin/ProducerNotificationSelector";
import { ManualEmailSender } from "@/components/admin/ManualEmailSender";
import { ProjectTimelineJsonUploader } from "@/components/admin/ProjectTimelineJsonUploader";

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
  const [queuedNotifications, setQueuedNotifications] = useState<any[]>([]);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [freeAccessEnabled, setFreeAccessEnabled] = useState(true);
  const [leaderboardConfigId, setLeaderboardConfigId] = useState<string | null>(null);
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
  const [currentTab, setCurrentTab] = useState("payments_due");
  const [activeTab, setActiveTab] = useState("crew_report");
  const [generatingEscrowLink, setGeneratingEscrowLink] = useState<string | null>(null);
  const [escrowPaymentUrl, setEscrowPaymentUrl] = useState<string | null>(null);
  const [showEscrowLinkModal, setShowEscrowLinkModal] = useState(false);
  const [newSearchCount, setNewSearchCount] = useState(0);
  const [reportFilter, setReportFilter] = useState<'all' | 'proxy' | 'user'>('all');
  const [notificationPanelExpanded, setNotificationPanelExpanded] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  
  const [verifyingSubmissionId, setVerifyingSubmissionId] = useState<string | null>(null);
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

    // Set up real-time subscriptions with proper admin checks
    const setupRealtime = async () => {
      const { createRealtimeChannel } = await import("@/lib/realtimeHelpers");
      const { trackRealtimeFailure } = await import("@/lib/failureTracking");

      // Moderation logs channel (admin only)
      const moderationChannel = await createRealtimeChannel(
        'moderation_logs_changes',
        {
          table: 'moderation_logs',
          event: 'INSERT',
          callback: (payload) => {
            setModerationLogs(prev => [payload.new as any, ...prev]);
          }
        },
        {
          feature: 'admin',
          onError: (error: unknown) => {
            const err = error as { message?: string; status?: string; error?: unknown };
            trackRealtimeFailure('moderation_logs_changes', err.message || 'Unknown error', {
              status: err.status,
              error: err.error
            });
          }
        }
      );

      // Audit logs channel (admin only)
      const auditChannel = await createRealtimeChannel(
        'audit_logs_changes',
        {
          table: 'audit_logs',
          event: 'INSERT',
          callback: (payload) => {
            setAuditLogs(prev => [payload.new as any, ...prev]);
          }
        },
        {
          feature: 'admin',
          onError: (error: unknown) => {
            const err = error as { message?: string; status?: string; error?: unknown };
            trackRealtimeFailure('audit_logs_changes', err.message || 'Unknown error', {
              status: err.status,
              error: err.error
            });
          }
        }
      );

      return () => {
        if (moderationChannel) {
          supabase.removeChannel(moderationChannel);
        }
        if (auditChannel) {
          supabase.removeChannel(auditChannel);
        }
      };
    };

    let cleanup: (() => void) | undefined;
    setupRealtime().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    try {
      // Session and admin access are guaranteed by RequireAuth wrapper
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setIsAdmin(true);
        await loadAdminData();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: mapDatabaseError(error),
        variant: "destructive",
      });
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

      // Load leaderboard config
      const { data: leaderboardConfig } = await supabase
        .from("leaderboard_config")
        .select("*")
        .single();
      
      if (leaderboardConfig) {
        setFreeAccessEnabled(leaderboardConfig.free_access_enabled ?? true);
        setLeaderboardConfigId(leaderboardConfig.id);
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

    // Load all payment reports
    const { data: reports, error: reportsError } = await supabase
      .from("payment_reports")
      .select(`
        *,
        producer:producers(name, company)
      `)
      .order("created_at", { ascending: false });

    if (reportsError) {
      console.error("Failed to load payment reports:", reportsError);
      toast({
        title: "Error Loading Reports",
        description: reportsError.message,
        variant: "destructive",
      });
    }

    // Enrich results with reporter + admin creator profiles
    const enrichedReports = await Promise.all(
      (reports || []).map(async (report) => {
        const { data: reporterProfile } = await supabase
          .from("profiles")
          .select("legal_first_name, legal_last_name")
          .eq("user_id", report.reporter_id)
          .maybeSingle();

        let adminCreatorProfile = null;
        if (report.admin_creator_id) {
          const { data: adminProfile } = await supabase
            .from("profiles")
            .select("legal_first_name, legal_last_name, email")
            .eq("user_id", report.admin_creator_id)
            .maybeSingle();
          adminCreatorProfile = adminProfile;
        }

        return {
          ...report,
          profiles: reporterProfile,
          admin_creator: adminCreatorProfile,
        };
      })
    );

    setPaymentReports(enrichedReports);

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
      .select('id, name, company, email, total_amount_owed, oldest_debt_days')
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
    // Prevent double-clicks
    if (verifyingSubmissionId) {
      console.log('[handleVerifySubmission] Already verifying another submission, skipping');
      return;
    }
    
    setVerifyingSubmissionId(id);
    
    try {
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
        const producerName = (
          // Format 1: flat fields from CrewReportForm (current)
          (typeof formData.producer_name === 'string' && formData.producer_name)
            ? (formData.producer_company && formData.reporting_type === 'production_company'
                ? formData.producer_company
                : `${formData.producer_name} ${formData.producer_last_name || ''}`.trim())
            // Format 2: nested object (legacy/defensive)
            : formData.producer_name?.company || 
              `${formData.producer_name?.firstName || ''} ${formData.producer_name?.lastName || ''}`.trim()
        ) || 'Unknown Producer';
        
        // Check if payment report already exists for this submission
        const { data: existingReport } = await supabase
          .from('payment_reports')
          .select('id')
          .eq('report_id', submission.report_id)
          .maybeSingle();
        
        if (existingReport) {
          console.log('[handleVerifySubmission] Payment report already exists, skipping creation');
          toast({
            title: "Success",
            description: "Submission verified (payment report already existed)",
          });
          await loadAdminData();
          setSelectedItem(null);
          setAdminNotes("");
          return;
        }
        
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
        
        const { data: newPaymentReport, error: reportError } = await supabase
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
          })
          .select('id')
          .single();
        
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

        // Send liability notification to producer (includes escrow code generation)
        if (producerEmail && newPaymentReport?.id) {
          // Check if producer notifications are enabled
          const { data: settings } = await supabase
            .from("site_settings")
            .select("send_producer_notifications")
            .single();

          const shouldSendNow = settings?.send_producer_notifications ?? true;

          if (shouldSendNow) {
            // Send full liability notification with escrow code
            const { error: liabilityError } = await supabase.functions.invoke('send-liability-notification', {
              body: {
                report_id: newPaymentReport.id,
                accused_name: producerName,
                accused_email: producerEmail,
                accused_role: 'producer',
                accuser_id: submission.user_id
              }
            });

            if (liabilityError) {
              console.error('Liability notification failed:', liabilityError);
              toast({
                title: "Warning",
                description: "Submission verified but producer notification email failed",
                variant: "default",
              });
            }
          } else {
            // Queue for later
            await supabase
              .from('queued_producer_notifications')
              .insert({
                payment_report_id: newPaymentReport.id,
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

    // Create payment report for vendor reports  
    if (submission?.submission_type === 'vendor_report') {
      const formData = submission.form_data;
      const producerName = (
        // Format 1: flat fields from CrewReportForm (current)
        (typeof formData.producer_name === 'string' && formData.producer_name)
          ? (formData.producer_company && formData.reporting_type === 'production_company'
              ? formData.producer_company
              : `${formData.producer_name} ${formData.producer_last_name || ''}`.trim())
          // Format 2: nested object (legacy/defensive)
          : formData.producer_name?.company || 
            `${formData.producer_name?.firstName || ''} ${formData.producer_name?.lastName || ''}`.trim()
      ) || 'Unknown Producer';
      
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
      
      // Generate a report_id for vendor reports
      const vendorReportId = `VR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      
      const { data: newPaymentReport, error: reportError } = await supabase
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
          producer_email: producerEmail,
          report_id: vendorReportId,
          reporter_type: 'vendor'
        })
        .select('id')
        .single();
      
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

      // Send liability notification to producer (includes escrow code generation)
      if (producerEmail && newPaymentReport?.id) {
        const { data: settings } = await supabase
          .from("site_settings")
          .select("send_producer_notifications")
          .single();

        const shouldSendNow = settings?.send_producer_notifications ?? true;

        if (shouldSendNow) {
          const { error: liabilityError } = await supabase.functions.invoke('send-liability-notification', {
            body: {
              report_id: newPaymentReport.id,
              accused_name: producerName,
              accused_email: producerEmail,
              accused_role: 'producer',
              accuser_id: submission.user_id
            }
          });

          if (liabilityError) {
            console.error('Liability notification failed:', liabilityError);
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
    } finally {
      setVerifyingSubmissionId(null);
    }
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
      const producerName = (
        // Format 1: flat fields from CrewReportForm (current)
        (typeof formData.producer_name === 'string' && formData.producer_name)
          ? (formData.producer_company && formData.reporting_type === 'production_company'
              ? formData.producer_company
              : `${formData.producer_name} ${formData.producer_last_name || ''}`.trim())
          // Format 2: nested object (legacy/defensive)
          : formData.producer_name?.company || 
            `${formData.producer_name?.firstName || ''} ${formData.producer_name?.lastName || ''}`.trim()
      ) || 'Unknown Producer';

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
      const producerName = (
        // Format 1: flat fields from CrewReportForm (current)
        (typeof formData.producer_name === 'string' && formData.producer_name)
          ? (formData.producer_company && formData.reporting_type === 'production_company'
              ? formData.producer_company
              : `${formData.producer_name} ${formData.producer_last_name || ''}`.trim())
          // Format 2: nested object (legacy/defensive)
          : formData.producer_name?.company || 
            `${formData.producer_name?.firstName || ''} ${formData.producer_name?.lastName || ''}`.trim()
      ) || 'Unknown Producer';

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

  const renderDetailPanel = (submissionType: string) => {
    if (!selectedItem || selectedItem.submission_type !== submissionType) return null;
    return (
      <Card className="p-6 mt-4">
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
            <label className="text-sm font-medium">
              Admin Notes
              <span className="text-xs text-muted-foreground ml-2">
                ({adminNotes.length.toLocaleString()} characters)
              </span>
            </label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add notes about this submission..."
              className="mt-2"
              rows={6}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => handleVerifySubmission(selectedItem.id)}
              disabled={!!verifyingSubmissionId}
            >
              {verifyingSubmissionId === selectedItem.id ? "Verifying..." : "Verify & Approve"}
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
    );
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

  const toggleFreeAccess = async () => {
    if (!leaderboardConfigId) return;

    const newFreeAccess = !freeAccessEnabled;
    const { error } = await supabase
      .from("leaderboard_config")
      .update({ free_access_enabled: newFreeAccess })
      .eq("id", leaderboardConfigId);

    if (error) {
      toast({
        title: "Error",
        description: mapDatabaseError(error),
        variant: "destructive",
      });
      return;
    }

    setFreeAccessEnabled(newFreeAccess);

    // Log the toggle
    await supabase.functions.invoke('log-event', {
      body: {
        event_type: 'leaderboard_free_access_toggled',
        payload: {
          enabled: newFreeAccess
        }
      }
    });

    toast({
      title: newFreeAccess ? "Free Access Enabled" : "Free Access Disabled",
      description: newFreeAccess 
        ? "All users now have free leaderboard access" 
        : "Normal access rules now apply",
    });
  };


  const handleGenerateEscrowLink = async (reportId: string) => {
    setGeneratingEscrowLink(reportId);
    try {
      const { data, error } = await supabase.functions.invoke("create-escrow-payment-link", {
        body: { payment_report_id: reportId },
      });

      if (error) throw error;

      setEscrowPaymentUrl(data.payment_url);
      setShowEscrowLinkModal(true);

      toast({
        title: data.existing ? "Existing Link Retrieved" : "Payment Link Generated",
        description: "Copy and share the link with the producer.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate payment link",
        variant: "destructive",
      });
    } finally {
      setGeneratingEscrowLink(null);
    }
  };

  const copyEscrowLink = () => {
    if (escrowPaymentUrl) {
      navigator.clipboard.writeText(escrowPaymentUrl);
      toast({
        title: "Copied!",
        description: "Payment link copied to clipboard",
      });
    }
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
    <>
      <Navigation />
      <div className="container mx-auto pt-24 md:pt-28 pb-20 px-4 space-y-8">
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
            <Button 
              variant="outline" 
              onClick={() => navigate("/admin/merge-producers")}
              className="flex items-center gap-2"
            >
              <GitMerge className="h-4 w-4" />
              Merge/Redirect
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              Home
            </Button>
          </div>
        </div>
      </div>

      {/* Maintenance Mode Control */}
      <Card className="mb-6 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN */}
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

            <div className="pt-4 border-t">
              <div 
                className="flex items-start justify-between cursor-pointer"
                onClick={() => setNotificationPanelExpanded(!notificationPanelExpanded)}
              >
                <div className="space-y-0.5">
                  <Label className="text-lg font-semibold flex items-center gap-2 cursor-pointer">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    Producer Notification Emails
                    <ChevronDown 
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        notificationPanelExpanded && "rotate-180"
                      )} 
                    />
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {queuedNotifications.length} queued notification{queuedNotifications.length !== 1 ? 's' : ''} • Manual send only
                  </p>
                </div>
              </div>
              
              {notificationPanelExpanded && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  <ManualEmailSender 
                    producers={producers}
                    onEmailSent={loadAdminData}
                  />
                  <ProducerNotificationSelector 
                    queuedNotifications={queuedNotifications}
                    onEmailsSent={loadAdminData}
                  />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="free-access" className="text-lg font-semibold flex items-center gap-2">
                  <Unlock className="h-5 w-5 text-muted-foreground" />
                  Global Free Leaderboard Access
                </Label>
                <p className="text-sm text-muted-foreground">
                  {freeAccessEnabled 
                    ? "All users currently have free leaderboard access (for testing/launch)" 
                    : "Normal access rules apply (subscriptions, report unlocks, etc.)"}
                </p>
              </div>
              <Switch
                id="free-access"
                checked={freeAccessEnabled}
                onCheckedChange={toggleFreeAccess}
                variant="status"
              />
            </div>

            <Button
              onClick={() => navigate("/admin/call-sheet-reservoir")}
              size="lg"
              className="w-full mt-4 py-6 text-lg font-bold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-amber-50 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <BookOpen className="h-6 w-6 mr-2" />
              ALEXANDRIA
            </Button>
            <div className="mt-3">
              <ProjectTimelineJsonUploader variant="default" />
            </div>

          </div>
        </div>

        {/* Database Export - Full Width */}
        <div className="pt-6 mt-6 border-t">
          <DatabaseExportPanel />
        </div>
      </Card>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10 gap-1 h-auto p-1">
          <TabsTrigger value="payments_due" className="text-xs sm:text-sm px-2 py-1.5">Payments Due</TabsTrigger>
          <TabsTrigger value="payments_paid" className="text-xs sm:text-sm px-2 py-1.5">Paid</TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm px-2 py-1.5">Users</TabsTrigger>
          <TabsTrigger value="broadcast" className="text-xs sm:text-sm px-2 py-1.5">Broadcast</TabsTrigger>
          <TabsTrigger value="all_submissions" className="text-xs sm:text-sm px-2 py-1.5">All Submissions</TabsTrigger>
          <TabsTrigger value="suggestions" className="text-xs sm:text-sm px-2 py-1.5">
            Suggestions
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="ml-1">{suggestions.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reversal_other" className="text-xs sm:text-sm px-2 py-1.5">
            Reversal Other
          </TabsTrigger>
        </TabsList>

        {/* Payments Due Tab */}
        <TabsContent value="payments_due">
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">Payments Due</h2>
                <p className="text-sm text-muted-foreground">Mark debts as paid</p>
              </div>
              <Badge variant="outline">{paymentReports.filter(r => r.status !== 'paid').length} unpaid</Badge>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report ID</TableHead>
                  <TableHead>Producer</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Amount Owed</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentReports.filter(r => r.status !== 'paid').length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No unpaid debts
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentReports.filter(r => r.status !== 'paid').map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-mono text-xs">{report.report_id || 'N/A'}</TableCell>
                      <TableCell>{report.producer?.name || 'Unknown Producer'}</TableCell>
                      <TableCell>{report.project_name}</TableCell>
                      <TableCell className="font-semibold">${report.amount_owed.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={report.days_overdue > 30 ? 'destructive' : 'secondary'}>
                          {report.days_overdue} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{report.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPaymentReport(report);
                              setShowPaymentModal(true);
                            }}
                          >
                            Mark as Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateEscrowLink(report.id)}
                            disabled={generatingEscrowLink === report.id}
                          >
                            {generatingEscrowLink === report.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Link className="h-4 w-4 mr-2" />
                                Payment Link
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Payments Paid Tab */}
        <TabsContent value="payments_paid">
          <Card className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">Payments Paid</h2>
                <p className="text-sm text-muted-foreground">History of resolved debts</p>
              </div>
              <Badge variant="outline">{paymentReports.filter(r => r.status === 'paid').length} paid</Badge>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report ID</TableHead>
                  <TableHead>Producer</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentReports.filter(r => r.status === 'paid').length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No paid debts yet
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentReports.filter(r => r.status === 'paid').map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-mono text-xs">{report.report_id || 'N/A'}</TableCell>
                      <TableCell>{report.producer?.name || 'Unknown Producer'}</TableCell>
                      <TableCell>{report.project_name}</TableCell>
                      <TableCell className="font-semibold">${report.amount_owed.toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{report.payment_date ? new Date(report.payment_date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="default">{report.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Crew</p>
                  <p className="text-2xl font-bold">{accountStats.crew}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="text-2xl font-bold">{accountStats.vendor}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Producer</p>
                  <p className="text-2xl font-bold">{accountStats.producer}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="text-2xl font-bold">{accountStats.company}</p>
                </Card>
              </div>
              
              <div className="space-y-2">
                <Label>Search User</Label>
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-2"
                />
                
                <div className="p-4 bg-muted rounded-lg border font-mono text-sm whitespace-pre-wrap select-text">
                  {allUsers
                    .filter(u => 
                      u.legal_first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.legal_last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 50)
                    .map((user) => user.email)
                    .join('\n')}
                </div>
                
                {allUsers.filter(u => 
                  u.legal_first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  u.legal_last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                ).length > 50 && (
                  <p className="text-sm text-muted-foreground">
                    Showing first 50 results. Refine your search to see more.
                  </p>
                )}
              </div>
              
              {selectedUser && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">{selectedUser.legal_first_name} {selectedUser.legal_last_name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <p className="text-sm mt-2">Account Type: <Badge>{selectedUser.account_type}</Badge></p>
                  {searchResults && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">Submissions:</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Pending:</span> {searchResults.pending || 0}
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Verified:</span> {searchResults.verified || 0}
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Rejected:</span> {searchResults.rejected || 0}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* All Submissions Tab */}
        <TabsContent value="all_submissions">
          <Card className="p-6">
            {/* User Selector Dropdown */}
            <div className="mb-6">
              <Label>Select User to View Submissions</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedUser ? `${selectedUser.name} (${selectedUser.email})` : "Select user..."}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 z-50 bg-popover">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {allUsers.map((user) => (
                          <CommandItem
                            key={user.user_id}
                            onSelect={() => {
                              setSelectedUser(user);
                              handleUserSelect(user.user_id);
                              setOpen(false);
                            }}
                          >
                            <div className="flex flex-col">
                              <span>{user.name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Search Results Display */}
            {searchResults && !searchResults.notFound && (
              <Card className="mb-6 p-4 bg-muted/50">
                <h4 className="font-semibold mb-2">{searchResults.name}</h4>
                <p className="text-sm text-muted-foreground mb-2">{searchResults.email}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><Badge variant="outline">{searchResults.stats.crew_report} Crew Reports</Badge></div>
                  <div><Badge variant="outline">{searchResults.stats.payment_confirmation} Payments</Badge></div>
                  <div><Badge variant="outline">{searchResults.stats.counter_dispute} Disputes</Badge></div>
                </div>
              </Card>
            )}

            {/* Leading Users Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {leadingUsers.crew_report && (
                <Card className="p-3 bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Most Crew Reports</p>
                  <p className="font-semibold truncate">{leadingUsers.crew_report.name}</p>
                  <Badge variant="secondary" className="mt-1">{leadingUsers.crew_report.count}</Badge>
                </Card>
              )}
              {leadingUsers.vendor_report && (
                <Card className="p-3 bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Most Vendor Reports</p>
                  <p className="font-semibold truncate">{leadingUsers.vendor_report.name}</p>
                  <Badge variant="secondary" className="mt-1">{leadingUsers.vendor_report.count}</Badge>
                </Card>
              )}
              {leadingUsers.producer_report && (
                <Card className="p-3 bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Most Producer Reports</p>
                  <p className="font-semibold truncate">{leadingUsers.producer_report.name}</p>
                  <Badge variant="secondary" className="mt-1">{leadingUsers.producer_report.count}</Badge>
                </Card>
              )}
              {leadingUsers.payment_confirmation && (
                <Card className="p-3 bg-card">
                  <p className="text-xs text-muted-foreground mb-1">Most Confirmations</p>
                  <p className="font-semibold truncate">{leadingUsers.payment_confirmation.name}</p>
                  <Badge variant="secondary" className="mt-1">{leadingUsers.payment_confirmation.count}</Badge>
                </Card>
              )}
            </div>

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-1">All Submissions & Reports</h2>
                <p className="text-sm text-muted-foreground">Review all submission types</p>
              </div>
              
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
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-7 mb-4">
                <TabsTrigger value="crew_report">Crew Reports</TabsTrigger>
                <TabsTrigger value="vendor_report">Vendor Reports</TabsTrigger>
                <TabsTrigger value="producer_report">Producer Reports</TabsTrigger>
                <TabsTrigger value="payment_reports">Payment Reports</TabsTrigger>
                <TabsTrigger value="disputes">Disputes</TabsTrigger>
                <TabsTrigger value="confirmations">Confirmations</TabsTrigger>
                <TabsTrigger value="create_user">Create User</TabsTrigger>
              </TabsList>

              {/* Crew Reports Tab */}
              <TabsContent value="crew_report">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Crew Reports</h3>
                  <Badge variant="outline">{submissions.filter(s => s.submission_type === 'crew_report').length} reports</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold">Report ID</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.filter(s => s.submission_type === 'crew_report').map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-mono text-xs">{submission.report_id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {submission.full_name}
                            {submission.created_by_admin && (
                              <Badge variant="secondary" className="text-xs">Admin Created</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{submission.email}</TableCell>
                        <TableCell>
                          <Badge variant={
                            submission.status === 'verified' ? 'default' :
                            submission.status === 'rejected' ? 'destructive' :
                            'secondary'
                          }>
                            {submission.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(submission.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">Actions</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="z-50 bg-popover">
                              <DropdownMenuItem onClick={() => setSelectedItem(submission)}>
                                View Details
                              </DropdownMenuItem>
                              {submission.status === 'pending' && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleVerifySubmission(submission.id)}
                                    disabled={!!verifyingSubmissionId}
                                  >
                                    {verifyingSubmissionId === submission.id ? "Verifying..." : "Verify"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRejectSubmission(submission.id)}>
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {renderDetailPanel('crew_report')}
              </TabsContent>

              {/* Vendor Reports Tab */}
              <TabsContent value="vendor_report">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Vendor Reports</h3>
                  <Badge variant="outline">{submissions.filter(s => s.submission_type === 'vendor_report').length} reports</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold">Report ID</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.filter(s => s.submission_type === 'vendor_report').map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-mono text-xs">{submission.report_id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {submission.full_name}
                            {submission.created_by_admin && (
                              <Badge variant="secondary" className="text-xs">Admin Created</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{submission.email}</TableCell>
                        <TableCell>
                          <Badge variant={
                            submission.status === 'verified' ? 'default' :
                            submission.status === 'rejected' ? 'destructive' :
                            'secondary'
                          }>
                            {submission.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(submission.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">Actions</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="z-50 bg-popover">
                              <DropdownMenuItem onClick={() => setSelectedItem(submission)}>
                                View Details
                              </DropdownMenuItem>
                              {submission.status === 'pending' && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleVerifySubmission(submission.id)}
                                    disabled={!!verifyingSubmissionId}
                                  >
                                    {verifyingSubmissionId === submission.id ? "Verifying..." : "Verify"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRejectSubmission(submission.id)}>
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {renderDetailPanel('vendor_report')}
              </TabsContent>

              {/* Producer Reports Tab */}
              <TabsContent value="producer_report">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Producer Reports</h3>
                  <Badge variant="outline">{submissions.filter(s => s.submission_type === 'producer_report').length} reports</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold">Report ID</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.filter(s => s.submission_type === 'producer_report').map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-mono text-xs">{submission.report_id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {submission.full_name}
                            {submission.created_by_admin && (
                              <Badge variant="secondary" className="text-xs">Admin Created</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{submission.email}</TableCell>
                        <TableCell>
                          <Badge variant={
                            submission.status === 'verified' ? 'default' :
                            submission.status === 'rejected' ? 'destructive' :
                            'secondary'
                          }>
                            {submission.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(submission.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">Actions</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="z-50 bg-popover">
                              <DropdownMenuItem onClick={() => setSelectedItem(submission)}>
                                View Details
                              </DropdownMenuItem>
                              {submission.status === 'pending' && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleVerifySubmission(submission.id)}
                                    disabled={!!verifyingSubmissionId}
                                  >
                                    {verifyingSubmissionId === submission.id ? "Verifying..." : "Verify"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRejectSubmission(submission.id)}>
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {renderDetailPanel('producer_report')}
              </TabsContent>

              {/* Disputes Tab */}
              <TabsContent value="disputes">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">All Disputes</h3>
                  <Badge variant="outline">{disputes.length} disputes</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold">Dispute ID</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disputes.map((dispute) => (
                      <TableRow key={dispute.id}>
                        <TableCell className="font-mono text-xs">{dispute.id.slice(0, 8)}</TableCell>
                        <TableCell>{dispute.dispute_type}</TableCell>
                        <TableCell>
                          <Badge variant={dispute.status === 'resolved' ? 'default' : 'secondary'}>
                            {dispute.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(dispute.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedItem(dispute)}>
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* Confirmations Tab */}
              <TabsContent value="confirmations">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Payment Confirmations</h3>
                  <Badge variant="outline">{paymentConfirmations.length} confirmations</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold">Confirmation ID</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold">Verified</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentConfirmations.map((confirmation) => (
                      <TableRow key={confirmation.id}>
                        <TableCell className="font-mono text-xs">{confirmation.id.slice(0, 8)}</TableCell>
                        <TableCell>{confirmation.confirmation_type}</TableCell>
                        <TableCell>${confirmation.amount_paid.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={confirmation.verified ? 'default' : 'secondary'}>
                            {confirmation.verified ? 'Verified' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(confirmation.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/admin/edit-report/${report.id}`)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </Button>
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

          {/* Note: crew_report and vendor_report have explicit TabsContent above; map only handles types without dedicated tabs */}
          {['payment_confirmation', 'counter_dispute', 'payment_documentation', 'report_explanation', 'report_dispute'].map((type) => {
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
                      <label className="text-sm font-medium">
                        Admin Notes
                        <span className="text-xs text-muted-foreground ml-2">
                          ({adminNotes.length.toLocaleString()} characters)
                        </span>
                      </label>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add notes about this submission..."
                        className="mt-2"
                        rows={6}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleVerifySubmission(selectedItem.id)}
                        disabled={!!verifyingSubmissionId}
                      >
                        {verifyingSubmissionId === selectedItem.id ? "Verifying..." : "Verify & Approve"}
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
        </TabsContent>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-1">Platform Suggestions</h2>
              <p className="text-sm text-muted-foreground">
                User feedback and feature requests
              </p>
            </div>

            {suggestions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No suggestions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {suggestions.map((suggestion: any) => (
                  <Card key={suggestion.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {suggestion.email ? (
                            <span className="text-sm font-medium">
                              {suggestion.legal_first_name} {suggestion.legal_last_name}
                            </span>
                          ) : (
                            <span className="text-sm font-medium text-muted-foreground">
                              Anonymous
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {suggestion.account_type || 'public'}
                          </Badge>
                        </div>
                        {suggestion.email && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {suggestion.email}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">
                          {suggestion.suggestion}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {new Date(suggestion.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {suggestion.total_suggestions_by_user > 1 && (
                      <Badge variant="secondary" className="text-xs mt-2">
                        {suggestion.total_suggestions_by_user} total suggestions
                      </Badge>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="reversal_other">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-1">Payment Reversals — &quot;Other&quot; Responses</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Call sheets where users changed Yes → No and selected &quot;Other&quot; with a free-text explanation.
              </p>
              <Button onClick={() => navigate("/admin/payment-reversals-other")}>
                View All &quot;Other&quot; Responses
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Broadcast Email Tab */}
        <TabsContent value="broadcast">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-1">Broadcast Email</h2>
              <p className="text-sm text-muted-foreground">
                Send a custom email to multiple recipients
              </p>
            </div>
            <BroadcastEmailSender />
          </Card>
        </TabsContent>

      </Tabs>

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
                    fromYear={1990}
                    toYear={new Date().getFullYear()}
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

      {/* Escrow Payment Link Modal */}
      <Dialog open={showEscrowLinkModal} onOpenChange={setShowEscrowLinkModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🔒 Anonymous Payment Link Generated</DialogTitle>
            <DialogDescription>
              Share this link with the producer. They can pay without creating an account.
              Crew identity remains fully protected.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Input
                readOnly
                value={escrowPaymentUrl || ""}
                className="font-mono text-sm"
              />
            </div>
            <Button size="sm" onClick={copyEscrowLink}>
              Copy
            </Button>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              variant="secondary"
              onClick={() => setShowEscrowLinkModal(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
      </div>
    </>
  );
}
