import { Link, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { usePortalMode, usePortalBase } from "@/contexts/PortalContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CallSheetUploader } from "@/components/callsheets/CallSheetUploader";
import { CallSheetList } from "@/components/callsheets/CallSheetList";
import { FileSpreadsheet, Users } from "lucide-react";

export default function CallSheetManager() {
  const [searchParams] = useSearchParams();
  const contactIdFilter = searchParams.get('contact_id');
  const isPortal = usePortalMode();
  const portalBase = usePortalBase();

  // No need for local user state - RequireAuth wrapper guarantees authentication
  // Components get userId from session directly to prevent RLS race conditions

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {!isPortal && <Navigation />}

      <main className="flex-1 container mx-auto px-4 py-8 md:pt-24">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Call Sheet Manager</h1>
                <p className="text-muted-foreground">
                  Upload, parse, and manage your call sheets to extract crew contacts
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link to={`${portalBase}/crew-contacts`}>
                <Users className="h-4 w-4" />
                Crew Contacts
              </Link>
            </Button>
          </div>

          {/* Main Content */}
          <Tabs defaultValue={contactIdFilter ? "sheets" : "upload"} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="sheets">My Call Sheets</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Call Sheet</CardTitle>
                  <CardDescription>
                    Upload a PDF call sheet to automatically extract crew contact information using AI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CallSheetUploader />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sheets" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Your Call Sheets</CardTitle>
                  <CardDescription>
                    View and manage your uploaded call sheets with real-time parsing status
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
