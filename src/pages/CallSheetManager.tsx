import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CallSheetUploader } from "@/components/callsheets/CallSheetUploader";
import { CallSheetList } from "@/components/callsheets/CallSheetList";
import { FileSpreadsheet, Users } from "lucide-react";

export default function CallSheetManager() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const contactIdFilter = searchParams.get('contact_id');

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Session and beta access are guaranteed by RequireAuth wrapper
      if (session) {
        setUser(session.user);
      }
      setLoading(false);
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
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
              <Link to="/crew-contacts">
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
                  <CallSheetUploader userId={user?.id} />
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
                  <CallSheetList userId={user?.id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
