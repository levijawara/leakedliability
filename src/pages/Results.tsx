import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FAFOEntryCard } from "@/components/FAFOEntryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

interface FAFOEntry {
  id: string;
  created_at: string;
  hold_that_l_image_path: string;
  proof_image_path: string;
  holdThatLUrl: string;
  proofUrl: string;
}

export default function Results() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<FAFOEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);

  useEffect(() => {
    const subscription = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isAccessBlocked, setIsAccessBlocked] = useState(false);

  useEffect(() => {
    const fetchEntries = async () => {
      setLoadingEntries(true);
      setFetchError(null);
      setIsAccessBlocked(false);
      
      try {
        if (!supabase) {
          setFetchError("Results are currently unavailable");
          setLoadingEntries(false);
          return;
        }

        const { data, error } = await supabase
          .from('fafo_entries')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          const errorMsg = error.message?.toLowerCase() || '';
          const errorCode = error.code || '';
          
          // Check if table doesn't exist
          const isTableMissing = 
            errorCode === '42P01' || // PostgreSQL: relation does not exist
            errorCode === 'PGRST204' || // PostgREST: relation not found
            errorMsg.includes('does not exist') ||
            (errorMsg.includes('relation') && errorMsg.includes('not found'));
          
          if (isTableMissing) {
            setIsAccessBlocked(false);
            setFetchError(null); // Don't show error - just show empty state
            console.warn('[Results] fafo_entries table does not exist - migrations may not have been run');
          } else if (errorMsg.includes('row-level security') || errorMsg.includes('permission denied')) {
            setIsAccessBlocked(true);
            setFetchError("Access to results is restricted. Some content may require authentication.");
          } else {
            setFetchError("Unable to load results. Please try again later.");
          }
          
          // Only log non-table-missing errors
          if (!isTableMissing) {
            console.error('Error fetching FAFO entries:', error);
          }
          setLoadingEntries(false);
          return;
        }

        if (data) {
          // Get public URLs for images with error handling
          const entriesWithUrls = await Promise.all(
            data.map(async (entry) => {
              try {
                // Validate storage access and get URLs
                const { getStorageUrl } = await import("@/lib/storageValidation");
                
                const [holdThatLResult, proofResult] = await Promise.all([
                  getStorageUrl('fafo-results', entry.hold_that_l_image_path),
                  getStorageUrl('fafo-results', entry.proof_image_path)
                ]);

                return {
                  ...entry,
                  holdThatLUrl: holdThatLResult.url || supabase.storage
                    .from('fafo-results')
                    .getPublicUrl(entry.hold_that_l_image_path).data.publicUrl,
                  proofUrl: proofResult.url || supabase.storage
                    .from('fafo-results')
                    .getPublicUrl(entry.proof_image_path).data.publicUrl
                };
              } catch (urlError) {
                // Fallback to direct URL generation if validation fails
                console.warn(`[Results] Error getting storage URL for entry ${entry.id}:`, urlError);
                return {
                  ...entry,
                  holdThatLUrl: supabase.storage
                    .from('fafo-results')
                    .getPublicUrl(entry.hold_that_l_image_path).data.publicUrl,
                  proofUrl: supabase.storage
                    .from('fafo-results')
                    .getPublicUrl(entry.proof_image_path).data.publicUrl
                };
              }
            })
          );

          setEntries(entriesWithUrls);
          
          // Preload images for better demo experience
          if (entriesWithUrls.length > 0) {
            entriesWithUrls.forEach((entry) => {
              // Preload images in background
              const img1 = new Image();
              img1.src = entry.holdThatLUrl;
              const img2 = new Image();
              img2.src = entry.proofUrl;
            });
          }
        }
      } catch (error) {
        console.error('Error fetching FAFO entries:', error);
        setFetchError("An unexpected error occurred while loading results");
      } finally {
        setLoadingEntries(false);
      }
    };

    fetchEntries();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { shouldLogAdminCheckError, isNormalUserResponse } = await import("@/lib/adminCheckHelpers");
      
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });

      // Check if this is just a normal user (not an admin) vs an actual error
      if (isNormalUserResponse(data, error)) {
        // User is simply not an admin - this is expected, not an error
        setIsAdmin(false);
        return;
      }

      // If there's an error, check if it's worth logging
      if (error) {
        const shouldLog = shouldLogAdminCheckError(error, data, { userId });
        if (shouldLog) {
          // Real error - log it
          console.error('[Results] has_role error', error);
        } else {
          // Expected "not admin" response - log at debug level only
          if (import.meta.env.DEV) {
            console.debug('[Results] User is not admin (expected)');
          }
        }
        setIsAdmin(false);
        return;
      }

      // Success - user is admin
      setIsAdmin(Boolean(data));
    } catch (e) {
      // Exceptions are always real errors
      console.error('[Results] checkAdminStatus exception', e);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntries(entries.filter(e => e.id !== entryId));
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-20">
          <h1 className="text-6xl font-black text-center mb-8">RESULTS</h1>
          
          {isAdmin && (
            <div className="flex justify-center mb-12">
              <Button
                onClick={() => navigate('/results/fafo-generator')}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 text-lg rounded-lg shadow-lg transition-all hover:scale-105"
              >
                Fuck Around & Find Out Generator
              </Button>
            </div>
          )}

          {/* FAFO Archive Section */}
          {loadingEntries ? (
            <div className="mt-16">
              <h2 className="text-4xl font-black text-center mb-4">FA&FO ARCHIVE</h2>
              <p className="text-center text-muted-foreground text-xl mb-12">
                Real receipts. Real payouts. Zero excuses.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-[500px] rounded-lg" />
                ))}
              </div>
            </div>
          ) : fetchError ? (
            <div className="mt-16">
              <h2 className="text-4xl font-black text-center mb-4">FA&FO ARCHIVE</h2>
              <div className="max-w-2xl mx-auto mt-12">
                <div className="bg-card border border-status-warning/50 rounded-lg p-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-status-warning mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Unable to Load Results</h3>
                  <p className="text-muted-foreground mb-4">
                    {fetchError}
                  </p>
                  {isAccessBlocked && (
                    <p className="text-sm text-muted-foreground mb-4">
                      You may need to{" "}
                      <a 
                        href="/auth" 
                        className="text-primary hover:underline font-medium"
                      >
                        sign in
                      </a>
                      {" to view results, or this content may not be publicly available yet."}
                    </p>
                  )}
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                    className="mt-4"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          ) : entries.length > 0 ? (
            <div className="mt-16">
              <h2 className="text-4xl font-black text-center mb-4">FA&FO ARCHIVE</h2>
              <p className="text-center text-muted-foreground text-xl mb-12">
                Real receipts. Real payouts. Zero excuses.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {entries.map((entry) => (
                  <FAFOEntryCard
                    key={entry.id}
                    entry={entry}
                    isAdmin={isAdmin}
                    onDelete={handleDeleteEntry}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-16 text-center py-20">
              <p className="text-2xl text-muted-foreground mb-4">
                No results yet. Time to make some examples.
              </p>
              <p className="text-sm text-muted-foreground">
                Verified payment receipts and outcomes will appear here once published.
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
