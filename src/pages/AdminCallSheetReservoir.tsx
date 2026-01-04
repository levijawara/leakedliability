import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Search, 
  FileText, 
  Users, 
  Download, 
  Trash2, 
  RefreshCw, 
  Eye,
  Database,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  Archive
} from "lucide-react";
import { format } from "date-fns";
import { ReservoirPaymentButtons, PaymentStatusCounts } from "@/components/callsheets/ReservoirPaymentButtons";

interface UserPaymentInfo {
  userId: string;
  name: string;
  email: string | null;
  status: string;
}

interface GlobalCallSheet {
  id: string;
  original_file_name: string;
  content_hash: string;
  master_file_path: string;
  status: string;
  contacts_extracted: number | null;
  error_message: string | null;
  first_uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  project_title: string | null;
  user_link_count?: number;
  paymentCounts?: PaymentStatusCounts;
}

interface ReservoirStats {
  totalSheets: number;
  totalContacts: number;
  uniqueUploaders: number;
  statusCounts: Record<string, number>;
}

export default function AdminCallSheetReservoir() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [callSheets, setCallSheets] = useState<GlobalCallSheet[]>([]);
  const [stats, setStats] = useState<ReservoirStats>({
    totalSheets: 0,
    totalContacts: 0,
    uniqueUploaders: 0,
    statusCounts: {}
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteSheet, setDeleteSheet] = useState<GlobalCallSheet | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

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
      await loadReservoirData();
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

  const aggregatePaymentStatus = (userLinks: any[]): PaymentStatusCounts => {
    const result: PaymentStatusCounts = {
      paid: { count: 0, users: [] },
      waiting: { count: 0, users: [] },
      unpaid: { count: 0, users: [] },
      unanswered: { count: 0, users: [] }
    };
    
    userLinks?.forEach(link => {
      const profile = link.profiles;
      const name = profile?.legal_first_name && profile?.legal_last_name
        ? `${profile.legal_first_name} ${profile.legal_last_name}`
        : profile?.email || 'Unknown User';
      
      const userInfo: UserPaymentInfo = { 
        userId: link.user_id, 
        name, 
        email: profile?.email || null, 
        status: link.payment_status 
      };
      
      switch (link.payment_status) {
        case 'paid':
          result.paid.users.push(userInfo);
          result.paid.count++;
          break;
        case 'waiting':
          result.waiting.users.push(userInfo);
          result.waiting.count++;
          break;
        case 'unpaid_needs_proof':
        case 'free_labor':
          result.unpaid.users.push(userInfo);
          result.unpaid.count++;
          break;
        default: // 'unanswered' or any other
          result.unanswered.users.push(userInfo);
          result.unanswered.count++;
      }
    });
    
    return result;
  };

  const loadReservoirData = async () => {
    try {
      // Load all global call sheets
      const { data: sheets, error } = await supabase
        .from('global_call_sheets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user link counts and payment status data for each sheet
      const sheetsWithCounts = await Promise.all(
        (sheets || []).map(async (sheet) => {
          // Fetch user_call_sheets with payment status and profile info
          const { data: userLinks, count } = await supabase
            .from('user_call_sheets')
            .select(`
              id,
              user_id,
              payment_status,
              profiles!user_call_sheets_user_id_fkey (
                legal_first_name,
                legal_last_name,
                email
              )
            `, { count: 'exact' })
            .eq('global_call_sheet_id', sheet.id);
          
          const paymentCounts = aggregatePaymentStatus(userLinks || []);
          
          return {
            ...sheet,
            user_link_count: count || 0,
            paymentCounts
          };
        })
      );

      setCallSheets(sheetsWithCounts);

      // Calculate stats
      const totalContacts = sheetsWithCounts.reduce((sum, s) => sum + (s.contacts_extracted || 0), 0);
      const uniqueUploaders = new Set(sheetsWithCounts.map(s => s.first_uploaded_by).filter(Boolean)).size;
      const statusCounts = sheetsWithCounts.reduce((acc, s) => {
        acc[s.status || 'unknown'] = (acc[s.status || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setStats({
        totalSheets: sheetsWithCounts.length,
        totalContacts,
        uniqueUploaders,
        statusCounts
      });

    } catch (error: any) {
      console.error('[AdminReservoir] Load error:', error);
      toast({
        title: "Failed to load reservoir data",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRetry = async (sheet: GlobalCallSheet) => {
    setRetryingId(sheet.id);
    try {
      const { error: updateError } = await supabase
        .from('global_call_sheets')
        .update({ 
          status: 'queued', 
          error_message: null,
          retry_count: 0,
          parsing_started_at: null
        })
        .eq('id', sheet.id);

      if (updateError) throw updateError;

      await supabase.functions.invoke('parse-call-sheet', {
        body: { call_sheet_id: sheet.id }
      });

      toast({
        title: "Retry initiated",
        description: "The call sheet has been queued for re-processing."
      });

      await loadReservoirData();
    } catch (error: any) {
      toast({
        title: "Retry failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setRetryingId(null);
    }
  };

  const handleTrueDelete = async () => {
    if (!deleteSheet) return;
    
    setDeleting(true);
    try {
      // Check if anyone still has this linked
      const { count } = await supabase
        .from('user_call_sheets')
        .select('*', { count: 'exact', head: true })
        .eq('global_call_sheet_id', deleteSheet.id);

      if (count && count > 0) {
        toast({
          title: "Cannot delete",
          description: `${count} user(s) still have this call sheet linked. Remove all user links first.`,
          variant: "destructive"
        });
        setDeleteSheet(null);
        setDeleting(false);
        return;
      }

      // Delete storage file
      if (deleteSheet.master_file_path) {
        await supabase.storage
          .from('call_sheets')
          .remove([deleteSheet.master_file_path]);
      }

      // Delete contact_call_sheets links
      await supabase
        .from('contact_call_sheets')
        .delete()
        .eq('call_sheet_id', deleteSheet.id);

      // Delete the global record
      const { error } = await supabase
        .from('global_call_sheets')
        .delete()
        .eq('id', deleteSheet.id);

      if (error) throw error;

      toast({
        title: "Call sheet destroyed",
        description: "The call sheet has been permanently removed from the reservoir."
      });

      setCallSheets(prev => prev.filter(s => s.id !== deleteSheet.id));
      setDeleteSheet(null);
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (sheet: GlobalCallSheet) => {
    try {
      const { data, error } = await supabase.storage
        .from('call_sheets')
        .createSignedUrl(sheet.master_file_path, 60);

      if (error) throw error;
      
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast({
      title: "Hash copied",
      description: "Content hash copied to clipboard."
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Queued</Badge>;
      case 'parsing':
        return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Parsing</Badge>;
      case 'parsed':
        return <Badge className="gap-1 bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3" />Parsed</Badge>;
      case 'error':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter call sheets
  const filteredSheets = callSheets.filter(sheet => {
    const matchesSearch = !searchQuery || 
      sheet.original_file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.content_hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.project_title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sheet.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Archive className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Call Sheet Reservoir</h1>
          </div>
          <p className="text-muted-foreground">
            The Library of Alexandria — every call sheet ever uploaded to the platform
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Call Sheets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{stats.totalSheets}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts Extracted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{stats.totalContacts.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unique Uploaders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{stats.uniqueUploaders}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Parse Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1 text-xs">
                {Object.entries(stats.statusCounts).map(([status, count]) => (
                  <Badge key={status} variant="outline" className="text-xs">
                    {status}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by filename, hash, or project title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="parsing">Parsing</SelectItem>
                  <SelectItem value="parsed">Parsed</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadReservoirData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Call Sheets Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Call Sheets ({filteredSheets.length})</CardTitle>
            <CardDescription>
              Complete archive of all call sheets uploaded to the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Content Hash</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Contacts</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead>Payment Responses</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSheets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No call sheets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSheets.map((sheet) => (
                      <TableRow key={sheet.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate max-w-[200px]" title={sheet.original_file_name}>
                              {sheet.original_file_name}
                            </span>
                          </div>
                          {sheet.project_title && (
                            <p className="text-xs text-muted-foreground mt-1">{sheet.project_title}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {sheet.content_hash.slice(0, 8)}...
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyHash(sheet.content_hash)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(sheet.status)}
                            {sheet.status === 'error' && sheet.error_message && (
                              <p className="text-xs text-destructive truncate max-w-[150px]" title={sheet.error_message}>
                                {sheet.error_message}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {sheet.contacts_extracted ?? '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={sheet.user_link_count === 0 ? "secondary" : "default"}>
                            {sheet.user_link_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sheet.user_link_count && sheet.user_link_count > 0 && sheet.paymentCounts ? (
                            <ReservoirPaymentButtons paymentCounts={sheet.paymentCounts} />
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(sheet.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {sheet.status === 'parsed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/call-sheets/${sheet.id}/review`)}
                                title="View parsed contacts"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {sheet.status === 'error' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRetry(sheet)}
                                disabled={retryingId === sheet.id}
                                title="Retry parsing"
                              >
                                {retryingId === sheet.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(sheet)}
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteSheet(sheet)}
                              disabled={sheet.user_link_count !== 0}
                              title={sheet.user_link_count === 0 ? "Permanently delete" : "Cannot delete: users still linked"}
                              className={sheet.user_link_count === 0 ? "text-destructive hover:text-destructive" : "text-muted-foreground"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />

      {/* True Delete Confirmation */}
      <AlertDialog open={!!deleteSheet} onOpenChange={() => setDeleteSheet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ PERMANENTLY DESTROY Call Sheet?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="font-medium">This is an irreversible admin action.</p>
                <p className="mt-2">
                  You are about to permanently delete "{deleteSheet?.original_file_name}" including:
                </p>
                <ul className="mt-2 ml-4 list-disc text-sm">
                  <li>The stored PDF file</li>
                  <li>All parsed contact data</li>
                  <li>The global call sheet record</li>
                </ul>
                <p className="mt-3 text-destructive font-medium">
                  This cannot be undone. The Library of Alexandria weeps.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTrueDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Destroying...
                </>
              ) : (
                "Destroy Forever"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
