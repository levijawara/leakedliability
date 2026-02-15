import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { usePortalMode } from "@/contexts/PortalContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallSheetUploader } from "@/components/callsheets/CallSheetUploader";
import { CallSheetList } from "@/components/callsheets/CallSheetList";
import { FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function CallSheetManager() {
  const isPortal = usePortalMode();
  const [sheetCount, setSheetCount] = useState<number | null>(null);

  const fetchCount = async () => {
    if (!supabase) return;
    const { count, error } = await supabase
      .from('user_call_sheets')
      .select('id', { count: 'exact', head: true });
    if (!error && count !== null) {
      setSheetCount(count);
    }
  };

  useEffect(() => {
    fetchCount();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!isPortal && <Navigation />}

      <main className="flex-1 container mx-auto px-4 py-8 md:pt-24">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Call Sheet Manager</h1>
              <p className="text-muted-foreground">
                Submit call sheets. The timer starts.
              </p>
            </div>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="upload" className="space-y-6" onValueChange={(v) => { if (v === 'sheets') fetchCount(); }}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="sheets">My Call Sheets</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Upload Call Sheet PDF
                  </CardTitle>
                  <CardDescription>
                    Submit a PDF call sheet. Duplicate files are detected by hash and linked automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CallSheetUploader onUploadComplete={fetchCount} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sheets" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Your Call Sheets{sheetCount !== null ? ` (${sheetCount})` : ''}
                  </CardTitle>
                  <CardDescription>
                    View and manage your uploaded call sheets
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CallSheetList />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {!isPortal && <Footer />}
    </div>
  );
}
