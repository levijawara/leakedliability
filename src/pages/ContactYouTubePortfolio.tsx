import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Youtube, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { formatFullViewCount } from "@/lib/youtubeHelpers";

interface ContactData {
  id: string;
  name: string;
}

interface CallSheetWithViews {
  id: string;
  project_title: string | null;
  youtube_url: string | null;
  youtube_view_count: number | null;
}

export default function ContactYouTubePortfolio() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  
  const [contact, setContact] = useState<ContactData | null>(null);
  const [callSheets, setCallSheets] = useState<CallSheetWithViews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contactId) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch contact info
        const { data: contactData, error: contactError } = await supabase
          .from("crew_contacts")
          .select("id, name")
          .eq("id", contactId)
          .maybeSingle();
        
        if (contactError) throw contactError;
        if (!contactData) {
          setError("Contact not found");
          setLoading(false);
          return;
        }
        
        setContact(contactData);
        
        // Fetch linked call sheets with YouTube data
        const { data: links, error: linksError } = await supabase
          .from("contact_call_sheets")
          .select("call_sheet_id")
          .eq("contact_id", contactId);
        
        if (linksError) throw linksError;
        
        if (!links || links.length === 0) {
          setCallSheets([]);
          setLoading(false);
          return;
        }
        
        const callSheetIds = links.map(l => l.call_sheet_id);
        
        const { data: sheetsData, error: sheetsError } = await supabase
          .from("global_call_sheets")
          .select("id, project_title, youtube_url, youtube_view_count")
          .in("id", callSheetIds)
          .not("youtube_url", "is", null);
        
        if (sheetsError) throw sheetsError;
        
        setCallSheets(sheetsData || []);
      } catch (err) {
        console.error("[ContactYouTubePortfolio] Error:", err);
        setError("Failed to load portfolio data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [contactId]);

  const totalViews = callSheets.reduce((sum, sheet) => sum + (sheet.youtube_view_count || 0), 0);

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/crew-contacts")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
          
          {loading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading portfolio...</span>
            </div>
          ) : error ? (
            <div className="text-destructive">{error}</div>
          ) : contact ? (
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">{contact.name}</h1>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Youtube className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-mono font-semibold text-foreground">
                  {formatFullViewCount(totalViews)}
                </span>
                <span>total views across {callSheets.length} project{callSheets.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          ) : null}
        </div>
        
        {/* Content */}
        {!loading && !error && (
          <>
            {callSheets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Youtube className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No YouTube Projects Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    This contact doesn't have any call sheets with linked YouTube videos.
                    Add YouTube URLs to call sheets in the Call Sheet Manager.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate("/call-sheets")}
                  >
                    Go to Call Sheets
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-destructive" />
                    Linked Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    Full YouTube-style grid coming soon! For now, here's a summary of linked projects.
                  </p>
                  <div className="space-y-3">
                    {callSheets
                      .sort((a, b) => (b.youtube_view_count || 0) - (a.youtube_view_count || 0))
                      .map((sheet) => (
                        <div
                          key={sheet.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {sheet.project_title || "Untitled Project"}
                            </p>
                            {sheet.youtube_url && (
                              <a
                                href={sheet.youtube_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline truncate block"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {sheet.youtube_url}
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Youtube className="h-4 w-4 text-destructive" />
                            <span className="font-mono font-medium">
                              {formatFullViewCount(sheet.youtube_view_count)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}