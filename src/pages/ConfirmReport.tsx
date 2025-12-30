import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function ConfirmReport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const reportId = searchParams.get('r');
  const producerId = searchParams.get('p');
  
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [reportData, setReportData] = useState<{
    project_title: string;
    amount_owed: number;
    producer_name: string;
    corroboration_count: number;
  } | null>(null);

  useEffect(() => {
    if (!reportId || !producerId) {
      toast({
        title: "Invalid Link",
        description: "This confirmation link is invalid or expired.",
        variant: "destructive",
      });
      navigate('/');
      return;
    }
    
    loadReportData();
  }, [reportId, producerId]);

  const loadReportData = async () => {
    try {
      // Fetch report details + producer name
      const { data: report, error: reportError } = await supabase
        .from('producer_self_reports')
        .select('project_title, amount_owed, corroboration_count, producer_id')
        .eq('id', reportId)
        .single();

      if (reportError || !report) {
        toast({
          title: "Report Not Found",
          description: "This self-report may have been removed or is invalid.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Fetch producer name
      const { data: producer } = await supabase
        .from('producers')
        .select('name')
        .eq('id', report.producer_id)
        .single();

      setReportData({
        project_title: report.project_title,
        amount_owed: report.amount_owed,
        producer_name: producer?.name || 'Unknown Producer',
        corroboration_count: report.corroboration_count,
      });
    } catch (error) {
      console.error('Error loading report:', error);
      toast({
        title: "Error",
        description: "Unable to load report details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    
    try {
      const { error } = await supabase.rpc('increment_corroboration', {
        report_id: reportId
      });

      if (error) {
        console.error('Corroboration error:', error);
        toast({
          title: "Confirmation Failed",
          description: "Unable to confirm at this time. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setConfirmed(true);
      toast({
        title: "Thank You!",
        description: "Your confirmation has been recorded.",
      });
      
      // Refresh data to show updated count
      await loadReportData();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-20 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {confirmed ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  Confirmation Recorded
                </>
              ) : (
                <>Confirm Self-Reported Debt</>
              )}
            </CardTitle>
            <CardDescription>
              {confirmed 
                ? "Thank you for helping verify this payment report."
                : "A producer has voluntarily disclosed an outstanding debt and requested verification."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {reportData && (
              <>
                <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Producer</div>
                    <div className="text-lg">{reportData.producer_name}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Project</div>
                    <div className="text-lg">{reportData.project_title}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Amount Owed</div>
                    <div className="text-lg font-semibold">
                      ${reportData.amount_owed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Confirmations</div>
                    <div className="text-lg">
                      {reportData.corroboration_count} / 3 required
                    </div>
                  </div>
                </div>

                {!confirmed ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      If you worked on this project and can confirm that payment is outstanding, 
                      click below to corroborate this self-report.
                    </p>
                    <Button 
                      onClick={handleConfirm} 
                      disabled={loading}
                      className="w-full"
                      size="lg"
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm Payment Occurred
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <p className="text-green-600 dark:text-green-400 font-medium">
                      Your confirmation has been recorded.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/')}
                      className="w-full"
                    >
                      Return to Homepage
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}
