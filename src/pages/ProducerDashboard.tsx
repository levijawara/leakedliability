import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ProducerSelfReportForm from "@/components/ProducerSelfReportForm";
import { Footer } from "@/components/Footer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PaymentReport {
  id: string;
  report_id: string;
  amount_owed: number;
  status: string;
  days_overdue: number;
  updated_at: string;
  project_name: string;
  producer_email: string;
}

export default function ProducerDashboard() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<PaymentReport[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoadReports();
  }, []);

  const checkAuthAndLoadReports = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.email) {
      toast({
        title: "Authentication Required",
        description: "Please log in to view your producer dashboard",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setUserEmail(user.email);
    await loadReports(user.email);
  };

  const loadReports = async (email: string) => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // First, check if user has a producer account link
    const { data: linkData } = await supabase
      .from("producer_account_links")
      .select("producer_id")
      .eq("user_id", user.id)
      .single();

    let query = supabase
      .from("payment_reports")
      .select("*")
      .order("created_at", { ascending: false });

    // If user has a linked producer account, use producer_id, otherwise fall back to email
    if (linkData?.producer_id) {
      query = query.eq("producer_id", linkData.producer_id);
    } else {
      query = query.eq("producer_email", email);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading reports:", error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } else {
      setReports(data || []);
    }
    
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "destructive",
      paid: "default",
      disputed: "secondary",
    };

    const labels: Record<string, string> = {
      pending: "Pending",
      paid: "Resolved",
      disputed: "Disputed",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Producer Dashboard</h1>
          <p className="text-muted-foreground">
            Reports associated with: <span className="font-medium">{userEmail}</span>
          </p>
        </div>

        {reports.length === 0 ? (
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No Reports Found</h2>
            <p className="text-muted-foreground">
              There are currently no payment reports associated with your email address.
            </p>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report ID</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead className="text-right">Amount Owed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Days Outstanding</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-mono font-medium">
                        {report.report_id}
                      </TableCell>
                      <TableCell>{report.project_name}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${report.amount_owed.toLocaleString('en-US', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2 
                        })}
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="text-right">
                        <span className={report.days_overdue > 90 ? "text-destructive font-semibold" : ""}>
                          {report.days_overdue} days
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(report.updated_at).toLocaleDateString('en-US', {
                          month: 'numeric',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/submit?reportId=${report.report_id}`)}
                        >
                          Respond
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        <Card className="mt-6 p-6 bg-muted/50">
          <h3 className="font-semibold mb-3">Response Options</h3>
          <div className="space-y-2 text-sm">
            <p>• <strong>Payment Documentation 🧾</strong> - Submit receipts, bank statements, or payment confirmations</p>
            <p>• <strong>Report Explanation ☮️</strong> - Acknowledge the debt and explain the delay or reason for non-payment</p>
            <p>• <strong>Report Dispute ⁉️</strong> - Challenge a crew member's report with counter-evidence</p>
          </div>
          <Button
            onClick={() => navigate("/submit")}
            className="mt-4"
          >
            Submit Response
          </Button>
        </Card>

        <Card className="mt-6 p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            Self-Report Outstanding Debt
            <span className="text-sm font-normal text-muted-foreground">
              (Transparency Credit)
            </span>
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Voluntarily disclose debts to earn transparency credit. Requires 3 crew/vendor 
            corroborations for verification.
          </p>
          <ProducerSelfReportForm />
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}
