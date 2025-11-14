import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, GitMerge, ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { mapDatabaseError } from "@/lib/errors";

interface Producer {
  id: string;
  name: string;
  company: string | null;
  pscs_score: number;
  total_amount_owed: number;
  total_crew_owed: number;
  total_vendors_owed: number;
  account_status: string;
}

interface MergeImpact {
  payment_reports: number;
  producer_account_links: number;
  producer_self_reports: number;
  producer_subscriptions: number;
  past_debts: number;
  search_logs: number;
  payment_confirmations: number;
}

export default function AdminProducerMerge() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Producer[]>([]);
  const [selectedProducers, setSelectedProducers] = useState<string[]>([]);
  const [primaryProducerId, setPrimaryProducerId] = useState<string>("");
  const [mergePreview, setMergePreview] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [merging, setMerging] = useState(false);
  const [searching, setSearching] = useState(false);

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

      const { data, error } = await supabase.rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      });

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Enter a search query",
        description: "Type a producer name to search",
        variant: "destructive",
      });
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('producers')
        .select('id, name, company, pscs_score, total_amount_owed, total_crew_owed, total_vendors_owed, account_status')
        .ilike('name', `%${searchQuery}%`)
        .order('name');

      if (error) throw error;

      setSearchResults(data || []);
      
      if (!data || data.length === 0) {
        toast({
          title: "No results",
          description: "No producers found matching your search",
        });
      }
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: mapDatabaseError(error),
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const toggleProducerSelection = (producerId: string) => {
    setSelectedProducers(prev => {
      if (prev.includes(producerId)) {
        // If deselecting and it was primary, clear primary
        if (primaryProducerId === producerId) {
          setPrimaryProducerId("");
        }
        return prev.filter(id => id !== producerId);
      } else {
        return [...prev, producerId];
      }
    });
  };

  const fetchRelatedCounts = async (producerId: string): Promise<MergeImpact> => {
    const [reports, links, selfReports, subscriptions, pastDebts, searchLogs, confirmations] = await Promise.all([
      supabase.from('payment_reports').select('*', { count: 'exact', head: true }).eq('producer_id', producerId),
      supabase.from('producer_account_links').select('*', { count: 'exact', head: true }).eq('producer_id', producerId),
      supabase.from('producer_self_reports').select('*', { count: 'exact', head: true }).eq('producer_id', producerId),
      supabase.from('producer_subscriptions').select('*', { count: 'exact', head: true }).eq('producer_id', producerId),
      supabase.from('past_debts').select('*', { count: 'exact', head: true }).eq('producer_id', producerId),
      supabase.from('search_logs').select('*', { count: 'exact', head: true }).eq('matched_producer_id', producerId),
      supabase.from('payment_confirmations').select('*', { count: 'exact', head: true }).eq('producer_id', producerId),
    ]);

    return {
      payment_reports: reports.count || 0,
      producer_account_links: links.count || 0,
      producer_self_reports: selfReports.count || 0,
      producer_subscriptions: subscriptions.count || 0,
      past_debts: pastDebts.count || 0,
      search_logs: searchLogs.count || 0,
      payment_confirmations: confirmations.count || 0,
    };
  };

  const generatePreview = async () => {
    if (selectedProducers.length < 2) {
      toast({
        title: "Select at least 2 producers",
        description: "You need to select at least 2 producers to merge",
        variant: "destructive",
      });
      return;
    }

    if (!primaryProducerId) {
      toast({
        title: "Select a primary producer",
        description: "Choose which producer record to keep",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const primary = searchResults.find(p => p.id === primaryProducerId);
      const duplicates = searchResults.filter(p => 
        selectedProducers.includes(p.id) && p.id !== primaryProducerId
      );

      const impactData: Record<string, MergeImpact> = {};
      
      for (const duplicate of duplicates) {
        const counts = await fetchRelatedCounts(duplicate.id);
        impactData[duplicate.id] = counts;
      }

      // Calculate totals
      const totalImpact = Object.values(impactData).reduce((acc, curr) => ({
        payment_reports: acc.payment_reports + curr.payment_reports,
        producer_account_links: acc.producer_account_links + curr.producer_account_links,
        producer_self_reports: acc.producer_self_reports + curr.producer_self_reports,
        producer_subscriptions: acc.producer_subscriptions + curr.producer_subscriptions,
        past_debts: acc.past_debts + curr.past_debts,
        search_logs: acc.search_logs + curr.search_logs,
        payment_confirmations: acc.payment_confirmations + curr.payment_confirmations,
      }), {
        payment_reports: 0,
        producer_account_links: 0,
        producer_self_reports: 0,
        producer_subscriptions: 0,
        past_debts: 0,
        search_logs: 0,
        payment_confirmations: 0,
      });

      setMergePreview({
        primary,
        duplicates,
        impact: impactData,
        totalImpact,
      });
      
      setShowPreviewModal(true);
    } catch (error: any) {
      toast({
        title: "Failed to generate preview",
        description: mapDatabaseError(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const proceedToConfirmation = () => {
    setShowPreviewModal(false);
    setShowConfirmModal(true);
  };

  const executeMerge = async () => {
    if (!confirmChecked) {
      toast({
        title: "Confirmation required",
        description: "You must confirm you understand this action cannot be undone",
        variant: "destructive",
      });
      return;
    }

    setMerging(true);
    try {
      const duplicateIds = selectedProducers.filter(id => id !== primaryProducerId);
      
      const { data, error } = await supabase.functions.invoke('merge-producers', {
        body: {
          primary_producer_id: primaryProducerId,
          duplicate_producer_ids: duplicateIds
        }
      });

      if (error) throw error;

      toast({
        title: "Merge completed successfully",
        description: `Merged ${duplicateIds.length} producer${duplicateIds.length > 1 ? 's' : ''} into primary producer`,
      });

      // Reset everything
      setSelectedProducers([]);
      setPrimaryProducerId("");
      setShowConfirmModal(false);
      setConfirmChecked(false);
      setMergePreview(null);
      
      // Refresh search results
      await handleSearch();
    } catch (error: any) {
      toast({
        title: "Merge failed",
        description: mapDatabaseError(error),
        variant: "destructive",
      });
    } finally {
      setMerging(false);
    }
  };

  const resetSelection = () => {
    setSelectedProducers([]);
    setPrimaryProducerId("");
    setMergePreview(null);
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
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-4xl font-black flex items-center gap-2">
              <GitMerge className="h-8 w-8" />
              Producer Merge Tool
            </h1>
            <p className="text-muted-foreground mt-1">
              Combine duplicate producer entries into a single record
            </p>
          </div>
        </div>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Warning: Irreversible Action</AlertTitle>
        <AlertDescription>
          Merging producers permanently combines all their data into a single record and deletes the duplicate entries. This action cannot be undone.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Search for Producers</CardTitle>
          <CardDescription>
            Find potential duplicate producers by name
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter producer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline">{searchResults.length} results found</Badge>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetSelection}
                    disabled={selectedProducers.length === 0}
                  >
                    Reset Selection
                  </Button>
                  <Button
                    onClick={generatePreview}
                    disabled={selectedProducers.length < 2 || !primaryProducerId}
                  >
                    <GitMerge className="h-4 w-4 mr-2" />
                    Preview Merge
                  </Button>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead className="w-16">Primary</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">PSCS Score</TableHead>
                      <TableHead className="text-right">Amount Owed</TableHead>
                      <TableHead className="text-right">Crew Owed</TableHead>
                      <TableHead className="text-right">Vendors Owed</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((producer) => {
                      const isSelected = selectedProducers.includes(producer.id);
                      const isPrimary = primaryProducerId === producer.id;
                      
                      return (
                        <TableRow
                          key={producer.id}
                          className={cn(
                            "transition-colors",
                            isSelected && "bg-muted/50",
                            isPrimary && "bg-green-500/10 border-l-4 border-l-green-500"
                          )}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleProducerSelection(producer.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <RadioGroup
                              value={primaryProducerId}
                              onValueChange={setPrimaryProducerId}
                            >
                              <RadioGroupItem
                                value={producer.id}
                                disabled={!isSelected}
                              />
                            </RadioGroup>
                          </TableCell>
                          <TableCell className="font-medium">{producer.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {producer.company || "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {producer.pscs_score}
                          </TableCell>
                          <TableCell className="text-right">
                            ${producer.total_amount_owed.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {producer.total_crew_owed}
                          </TableCell>
                          <TableCell className="text-right">
                            {producer.total_vendors_owed}
                          </TableCell>
                          <TableCell>
                            <Badge variant={producer.account_status === 'active' ? 'default' : 'destructive'}>
                              {producer.account_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Merge Preview</DialogTitle>
            <DialogDescription>
              Review the impact of this merge operation
            </DialogDescription>
          </DialogHeader>

          {mergePreview && (
            <div className="space-y-6">
              {/* Primary Producer */}
              <div className="rounded-lg border border-green-500 bg-green-500/10 p-4">
                <h3 className="font-semibold text-green-700 dark:text-green-400 mb-2">
                  PRIMARY PRODUCER (Keeping)
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <span className="ml-2 font-medium">{mergePreview.primary.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Company:</span>
                    <span className="ml-2 font-medium">{mergePreview.primary.company || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">PSCS Score:</span>
                    <span className="ml-2 font-mono">{mergePreview.primary.pscs_score}</span>
                  </div>
                </div>
              </div>

              {/* Duplicates Being Merged */}
              <div>
                <h3 className="font-semibold mb-2">Merging from Duplicates:</h3>
                <div className="space-y-2">
                  {mergePreview.duplicates.map((dup: Producer) => (
                    <div key={dup.id} className="rounded-lg border bg-muted/50 p-3 text-sm">
                      <div className="font-medium mb-1">{dup.name}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>{mergePreview.impact[dup.id].payment_reports} reports</div>
                        <div>{mergePreview.impact[dup.id].producer_account_links} links</div>
                        <div>{mergePreview.impact[dup.id].past_debts} past debts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact Summary */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <h3 className="font-semibold mb-3">Total Impact:</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Reports:</span>
                    <span className="font-mono">{mergePreview.totalImpact.payment_reports}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Links:</span>
                    <span className="font-mono">{mergePreview.totalImpact.producer_account_links}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Self Reports:</span>
                    <span className="font-mono">{mergePreview.totalImpact.producer_self_reports}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Past Debts:</span>
                    <span className="font-mono">{mergePreview.totalImpact.past_debts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Search Logs:</span>
                    <span className="font-mono">{mergePreview.totalImpact.search_logs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confirmations:</span>
                    <span className="font-mono">{mergePreview.totalImpact.payment_confirmations}</span>
                  </div>
                </div>

                {mergePreview.totalImpact.producer_subscriptions > 0 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warning: Active Subscriptions</AlertTitle>
                    <AlertDescription>
                      {mergePreview.totalImpact.producer_subscriptions} subscription(s) will be transferred. Manual review may be needed.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  <strong>After merge:</strong> PSCS score will be automatically recalculated for the primary producer based on all merged data.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Cancel
            </Button>
            <Button onClick={proceedToConfirmation} className="bg-orange-600 hover:bg-orange-700">
              Proceed to Confirmation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">⚠️ Final Confirmation Required</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please confirm you understand the consequences.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Producers Being Deleted:</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {mergePreview?.duplicates.map((dup: Producer) => (
                  <li key={dup.id}>{dup.name} {dup.company ? `(${dup.company})` : ''}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="confirm"
              checked={confirmChecked}
              onCheckedChange={(checked) => setConfirmChecked(checked as boolean)}
            />
            <Label
              htmlFor="confirm"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I understand this will permanently merge these producers and cannot be undone
            </Label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)} disabled={merging}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={executeMerge}
              disabled={!confirmChecked || merging}
            >
              {merging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Merging...
                </>
              ) : (
                "Execute Merge"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
