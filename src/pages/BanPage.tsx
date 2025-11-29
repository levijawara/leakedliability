import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

interface BanRecord {
  id: string;
  target_display_name: string;
  target_email: string;
  reason: string;
  created_at: string;
}

interface BanPageContent {
  title: string;
  body: string;
}

export default function BanPage() {
  const { banId } = useParams<{ banId: string }>();
  const [ban, setBan] = useState<BanRecord | null>(null);
  const [pageContent, setPageContent] = useState<BanPageContent>({ title: '', body: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!banId) {
      setError('No ban ID provided');
      setLoading(false);
      return;
    }

    async function loadBanInfo() {
      try {
        // Fetch ban record (RLS: target user can read their own ban; admins can read all)
        const { data: banData, error: banErr } = await supabase
          .from('account_bans')
          .select('id, target_display_name, target_email, reason, created_at')
          .eq('id', banId)
          .single();

        if (banErr) {
          setError('Ban record not found or you do not have access.');
          setLoading(false);
          return;
        }
        setBan(banData);

        // Fetch ban page content
        const { data: pageData, error: pageErr } = await supabase
          .rpc('get_ban_page');

        if (pageErr || !pageData || pageData.length === 0) {
          setPageContent({ 
            title: 'Account banned', 
            body: 'Your account has been banned. Contact leakedliability@gmail.com for questions.' 
          });
        } else {
          setPageContent({ 
            title: pageData[0]?.title || 'Account banned', 
            body: pageData[0]?.body || '' 
          });
        }
        setLoading(false);
      } catch (err) {
        console.error('[BanPage] Error loading ban info:', err);
        setError('Unexpected error loading ban information.');
        setLoading(false);
      }
    }

    loadBanInfo();
  }, [banId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading ban information...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-2xl bg-destructive/10 border border-destructive/20 rounded-lg p-8 text-destructive">
          {error}
        </div>
      </main>
    );
  }

  if (!ban) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">No ban record found.</div>
      </main>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen flex items-center justify-center bg-background p-6 pt-24 md:pt-28">
      <article className="max-w-3xl bg-card rounded-2xl p-8 shadow-lg border border-border">
        <h1 className="text-2xl font-semibold mb-4 text-foreground">{pageContent.title}</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none mb-6 whitespace-pre-wrap text-muted-foreground">
          {pageContent.body}
        </div>

        <hr className="my-6 border-border" />

        <div className="text-sm text-muted-foreground space-y-2">
          <div>
            <strong className="text-foreground">Account:</strong> {ban.target_display_name || ban.target_email}
          </div>
          <div>
            <strong className="text-foreground">Banned on:</strong> {new Date(ban.created_at).toLocaleString()}
          </div>
          <div className="mt-4">
            <strong className="text-foreground">Reason:</strong>
            <div className="mt-1 text-muted-foreground bg-muted/50 p-3 rounded border border-border">
              {ban.reason}
            </div>
          </div>

          <div className="mt-6 text-xs text-muted-foreground/70 pt-4 border-t border-border">
            To appeal, send a detailed explanation to <span className="text-foreground font-mono">leakedliability@gmail.com</span> (one appeal only).
          </div>
        </div>
      </article>
      
        <Footer />
      </main>
    </>
  );
}
