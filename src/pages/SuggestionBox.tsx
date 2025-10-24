import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { suggestionSchema } from "@/lib/validation";
import { sanitizeText } from "@/lib/sanitize";
import { Footer } from "@/components/Footer";

export default function SuggestionBox() {
  const navigate = useNavigate();
  const [suggestion, setSuggestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      // Validate input with Zod
      const validationResult = suggestionSchema.safeParse({
        suggestion: suggestion,
        meta: { path: "/suggestions" }
      });

      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        setIsSubmitting(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      // Sanitize input before storing
      const sanitizedSuggestion = sanitizeText(suggestion);
      
      const { error } = await supabase
        .from("suggestions")
        .insert({
          user_id: user?.id || null,
          suggestion: sanitizedSuggestion,
          meta: { path: "/suggestions" }
        });

      if (error) throw error;

      toast.success("Thanks! Your suggestion has been logged.");
      setSuggestion("");
    } catch (error: any) {
      console.error("Error submitting suggestion:", error);
      toast.error("Failed to submit suggestion. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount = suggestion.length;
  const isValid = charCount >= 5 && charCount <= 4000;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Suggestion Box</h1>
        </div>

        <p className="text-muted-foreground mb-8">
          Share ideas to make Leaked Liability better. You can submit without signing in.
          If you're logged in, your account will be attached so we can follow up and weigh context.
        </p>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="Pitch your improvement. Be specific."
                className="min-h-[160px] resize-none"
                maxLength={4000}
                required
              />
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${isValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                  {charCount}/4000 characters {charCount < 5 && "(minimum 5)"}
                </span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              You can be honest. We don't bite. If we like and approve of your idea, you *COULD* get *PAID* for it after implementation. 👀
            </div>

            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Submitting..." : "Submit Suggestion"}
            </Button>
          </form>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}
