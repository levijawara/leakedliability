import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface ReversalRow {
  id: string;
  user_id: string;
  user_label: string | null;
  payment_reversal_reason_other: string;
  created_at: string;
  global_call_sheets: { original_file_name: string } | null;
  email?: string | null;
  legal_first_name?: string | null;
  legal_last_name?: string | null;
}

export default function AdminPaymentReversalsOther() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ReversalRow[]>([]);

  const fetchRows = async () => {
    setLoading(true);
    const { data: ucsData, error: ucsError } = await supabase
      .from("user_call_sheets")
      .select(`
        id,
        user_id,
        user_label,
        payment_reversal_reason_other,
        created_at,
        global_call_sheets (original_file_name)
      `)
      .eq("payment_reversal_reason", "other")
      .not("payment_reversal_reason_other", "is", null)
      .order("created_at", { ascending: false });

    if (ucsError) {
      console.error("[AdminPaymentReversalsOther] Fetch error:", ucsError);
      setRows([]);
      setLoading(false);
      return;
    }

    const rows = (ucsData || []) as ReversalRow[];
    const userIds = [...new Set(rows.map((r) => r.user_id))];

    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_id, email, legal_first_name, legal_last_name")
      .in("user_id", userIds);

    const profileMap = new Map(
      (profileData || []).map((p: any) => [p.user_id, p])
    );

    const enriched = rows.map((r) => ({
      ...r,
      ...profileMap.get(r.user_id),
    }));

    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 md:pt-24">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Reversals — "Other" Responses</CardTitle>
              <CardDescription>
                Call sheets where users changed Yes → No and selected "Other" with a free-text explanation.
              </CardDescription>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : rows.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">No "Other" reversal responses yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Call Sheet</TableHead>
                      <TableHead>Explanation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(row.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {row.legal_first_name || row.legal_last_name
                              ? `${row.legal_first_name || ""} ${row.legal_last_name || ""}`.trim()
                              : "—"}
                            {row.email && (
                              <div className="text-muted-foreground text-xs">{row.email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.user_label || row.global_call_sheets?.original_file_name || "—"}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm whitespace-pre-wrap">{row.payment_reversal_reason_other}</p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
