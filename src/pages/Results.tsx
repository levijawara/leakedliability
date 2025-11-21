import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function Results() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-20">
          <h1 className="text-6xl font-black text-center mb-8">💰RESULTS💰</h1>
          
          {isAdmin && (
            <div className="flex justify-center mb-8">
              <Button
                onClick={() => {
                  console.log("FAFO Generator activated");
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 text-lg rounded-lg shadow-lg transition-all hover:scale-105"
              >
                Fuck Around & Find Out Generator
              </Button>
            </div>
          )}
          
          <p className="text-center text-muted-foreground text-xl">
            Coming soon: Real success stories and concrete outcomes.
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
