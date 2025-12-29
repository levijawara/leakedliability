import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FAFOEntryCard } from "@/components/FAFOEntryCard";
import { Skeleton } from "@/components/ui/skeleton";

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

  useEffect(() => {
    const fetchEntries = async () => {
      setLoadingEntries(true);
      try {
        const { data, error } = await supabase
          .from('fafo_entries')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        if (data) {
          // Get public URLs for images
          const entriesWithUrls = data.map(entry => ({
            ...entry,
            holdThatLUrl: supabase.storage
              .from('fafo-results')
              .getPublicUrl(entry.hold_that_l_image_path).data.publicUrl,
            proofUrl: supabase.storage
              .from('fafo-results')
              .getPublicUrl(entry.proof_image_path).data.publicUrl
          }));

          setEntries(entriesWithUrls);
        }
      } catch (error) {
        console.error('Error fetching FAFO entries:', error);
      } finally {
        setLoadingEntries(false);
      }
    };

    fetchEntries();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });

      if (error) {
        console.error('has_role error', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(Boolean(data));
    } catch (e) {
      console.error('checkAdminStatus exception', e);
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
              <p className="text-2xl text-muted-foreground">
                No results yet. Time to make some examples.
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
