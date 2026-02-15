import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { usePortalMode } from "@/contexts/PortalContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CallSheetUploader } from "@/components/callsheets/CallSheetUploader";
import { CallSheetList } from "@/components/callsheets/CallSheetList";
import { FileSpreadsheet, Check } from "lucide-react";

export default function CallSheetManager() {
  const isPortal = usePortalMode();

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
                Submit call sheets to document your own work timeline, and to keep us informed. Think of us as a form of "invoice insurance".
              </p>
            </div>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="sheets">My Call Sheets</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Upload Call Sheet File
                  </CardTitle>
                  <CardDescription>
                    Submit your call sheet. We'll let you know if it's already in our system.
                  </CardDescription>
                  <p className="text-sm text-green-600 flex items-center gap-1.5 mt-2">
                    <Check className="h-4 w-4 shrink-0" />
                    Relax. We safeguard crew member and vendor privacy, always. Your personal information is NEVER made public.
                  </p>
                </CardHeader>
                <CardContent>
                  <CallSheetUploader />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sheets" className="space-y-6">
              <CallSheetList />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {!isPortal && <Footer />}
    </div>
  );
}
