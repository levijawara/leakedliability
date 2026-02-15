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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Copy,
  Archive
} from "lucide-react";
import { format } from "date-fns";
import { ReservoirPaymentButtons, PaymentStatusCounts } from "@/components/callsheets/ReservoirPaymentButtons";
import { HeatScoreIndicator } from "@/components/callsheets/HeatScoreIndicator";
import { PDFViewerModal } from "@/components/callsheets/PDFViewerModal";

interface UserPaymentInfo {
  userId: string;
  name: string;
  email: string | null;
  status: string;
}

interface UserSubmissionCount {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  uploadCount: number;
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
  // Heat metrics
  heat_score?: number | null;
  paid_count?: number;
  never_paid_count?: number;
}

interface ReservoirStats {
  totalSheets: number;
  uniqueUploaders: number;
}

export default function AdminCallSheetReservoir() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [callSheets, setCallSheets] = useState<GlobalCallSheet[]>([]);
  const [stats, setStats] = useState<ReservoirStats>({
    totalSheets: 0,
    uniqueUploaders: 0
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteSheet, setDeleteSheet] = useState<GlobalCallSheet | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // User submission count modal state
  const [viewingPdf, setViewingPdf] = useState<{ filePath: string; fileName: string } | null>(null);
  const [showUserCountModal, setShowUserCountModal] = useState(false);
  const [userSubmissionCounts, setUserSubmissionCounts] = useState<UserSubmissionCount[]>([]);
  const [loadingUserCounts, setLoadingUserCounts] = useState(false);

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

      // Get heat metrics for all sheets
      const { data: heatMetrics } = await supabase
        .from('call_sheet_heat_metrics')
        .select('*');
      
      const heatMap = new Map(heatMetrics?.map(h => [h.global_call_sheet_id, h]) || []);

      // Get user link counts and payment status data for each sheet
      const sheetsWithCounts = await Promise.all(
        (sheets || []).map(async (sheet) => {
          // Fetch user_call_sheets with payment status (no FK join - it doesn't exist)
          const { data: userLinks, count } = await supabase
            .from('user_call_sheets')
            .select('id, user_id, payment_status', { count: 'exact' })
            .eq('global_call_sheet_id', sheet.id);
          
          // Collect unique user_ids to fetch profiles separately
          const userIds = [...new Set((userLinks || []).map(l => l.user_id))];
          
          // Fetch profiles for these users (separate query)
          let profilesMap: Record<string, { legal_first_name: string | null; legal_last_name: string | null; email: string | null }> = {};
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, legal_first_name, legal_last_name, email')
              .in('user_id', userIds);
            
            profiles?.forEach(p => {
              profilesMap[p.user_id] = p;
            });
          }
          
          // Merge profile data into userLinks
          const userLinksWithProfiles = (userLinks || []).map(link => ({
            ...link,
            profiles: profilesMap[link.user_id] || null
          }));
          
          const paymentCounts = aggregatePaymentStatus(userLinksWithProfiles);
          
          // Get heat metrics for this sheet
          const heatData = heatMap.get(sheet.id);
          
          return {
            ...sheet,
            user_link_count: count || 0,
            paymentCounts,
            heat_score: heatData?.heat_score ?? null,
            paid_count: heatData?.paid_count ?? 0,
            never_paid_count: heatData?.never_paid_count ?? 0,
          };
        })
      );

      setCallSheets(sheetsWithCounts);

      // Calculate stats
      const uniqueUploaders = new Set(sheetsWithCounts.map(s => s.first_uploaded_by).filter(Boolean)).size;

      setStats({
        totalSheets: sheetsWithCounts.length,
        uniqueUploaders
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

  // Load user submission counts
  const loadUserSubmissionCounts = async (): Promise<UserSubmissionCount[]> => {
    // Get ALL user_call_sheets entries (every upload attempt counts)
    const { data: allLinks, error } = await supabase
      .from('user_call_sheets')
      .select('user_id');
    
    if (error) throw error;
    if (!allLinks || allLinks.length === 0) return [];
    
    // Count uploads per user
    const countMap: Record<string, number> = {};
    allLinks.forEach(link => {
      countMap[link.user_id] = (countMap[link.user_id] || 0) + 1;
    });
    
    // Get unique user IDs
    const userIds = Object.keys(countMap);
    
    // Fetch profiles for these users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, legal_first_name, legal_last_name, email')
      .in('user_id', userIds);
    
    const profilesMap: Record<string, { legal_first_name: string | null; legal_last_name: string | null; email: string | null }> = {};
    profiles?.forEach(p => {
      profilesMap[p.user_id] = p;
    });
    
    // Build result array sorted by upload count descending
    return userIds
      .map(userId => ({
        userId,
        firstName: profilesMap[userId]?.legal_first_name || null,
        lastName: profilesMap[userId]?.legal_last_name || null,
        email: profilesMap[userId]?.email || null,
        uploadCount: countMap[userId]
      }))
      .sort((a, b) => b.uploadCount - a.uploadCount);
  };

  const handleOpenUserCounts = async () => {
    setShowUserCountModal(true);
    setLoadingUserCounts(true);
    try {
      const counts = await loadUserSubmissionCounts();
      setUserSubmissionCounts(counts);
    } catch (error: any) {
      console.error('[Reservoir] Error loading user counts:', error);
      toast({
        title: "Failed to load user submission counts",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoadingUserCounts(false);
    }
  };

  // Filter call sheets
  const filteredSheets = callSheets.filter(sheet => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      sheet.original_file_name.toLowerCase().includes(q) ||
      sheet.content_hash.toLowerCase().includes(q) ||
      (sheet.project_title?.toLowerCase().includes(q) ?? false)
    );
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
        <div className="grid gap-4 md:grid-cols-2 mb-8">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Unique Uploaders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{stats.uniqueUploaders}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Call Sheets ({filteredSheets.length})</CardTitle>
                <CardDescription>
                  Complete archive of all call sheets uploaded to the platform
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenUserCounts}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                User Submission Count
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Content Hash</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead>Payment Responses</TableHead>
                    <TableHead>Heat Score</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSheets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                        <TableCell>
                          <HeatScoreIndicator 
                            heatScore={sheet.heat_score ?? null}
                            paidCount={sheet.paid_count}
                            neverPaidCount={sheet.never_paid_count}
                            compact
                          />
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingPdf({ filePath: sheet.master_file_path, fileName: sheet.original_file_name })}
                              title="View PDF"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        open={!!viewingPdf}
        onOpenChange={() => setViewingPdf(null)}
        filePath={viewingPdf?.filePath ?? ""}
        fileName={viewingPdf?.fileName ?? ""}
      />

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

      {/* User Submission Count Modal */}
      <Dialog open={showUserCountModal} onOpenChange={setShowUserCountModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Submission Count</DialogTitle>
            <DialogDescription>
              Total Users: {userSubmissionCounts.length}
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto">
            {loadingUserCounts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : userSubmissionCounts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No uploads yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Uploads</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userSubmissionCounts.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell>
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : 'Unknown User'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.email || '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {user.uploadCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
