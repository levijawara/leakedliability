import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, FileWarning } from "lucide-react";
import { Navigation } from "@/components/Navigation";

export default function SubmitReport() {

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-3">Submission Forms</h1>
          <p className="text-muted-foreground">
            Report | Document | Dispute | Explain | Confirm
          </p>
        </div>

        <Card className="p-6 mb-6 border-l-4 border-status-warning bg-status-warning/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-status-warning mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold mb-1">Crew members, your identity is well-protected</p>
              <p className="text-muted-foreground">
                Legal name + email required. Your identity stays hidden from the producers you're reporting, as well as the general public.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">WE CANNOT AND WILL NOT TOLERATE LYING, EXAGGERATING, FABRICATING, OR DEFAMING OF ANY KIND. SUBMIT TRUE STATEMENTS AND FACTUAL DOCUMENTS ONLY.</h2>
          <p className="text-muted-foreground mb-6">
            If we catch you lying, we're (ironically) not liable for the consequences you may suffer in a court of law.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.open("https://form.typeform.com/to/xuqf6PDX", "_blank")}
            className="text-lg px-8"
          >
            <FileWarning className="mr-2 h-5 w-5" />
            Open Submission Forms
          </Button>
        </Card>
        </div>
      </div>
    </>
  );
}
