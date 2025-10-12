import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-12">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-black text-center">
              Disclaimer of Liability
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-4 text-muted-foreground">
            <p>
              Leaked Liability™ provides a public platform for users to share information about payment practices within the production industry. While we encourage transparency and accountability, we do not independently verify, investigate, or authenticate every submission. Content on this platform is provided "as is" for informational purposes only and should not be interpreted as fact without independent verification.
            </p>

            <p>
              All reports, responses, and supporting materials are user-generated content. Crew Members, Producers, and Production Companies are solely responsible for the accuracy and legality of their submissions. By submitting content, you represent that it is true to the best of your knowledge and does not contain false, misleading, or defamatory material.
            </p>

            <p className="font-semibold text-foreground">
              Leaked Liability™ is not:
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>A debt collection agency</li>
              <li>A credit reporting agency</li>
              <li>An arbitrator or mediator between parties</li>
            </ul>

            <p>
              We do not provide legal advice or act on behalf of any user. Our Producer Social Credit Score (PSCS) and related metrics are proprietary opinion-based indicators, not legally recognized credit scores, and should not be relied upon as financial, reputational, or hiring criteria.
            </p>

            <p>
              We reserve the right—but not the obligation—to remove, redact, or restrict content that appears false, defamatory, abusive, or unsupported by documentation. However, any decision not to remove content does not constitute endorsement, agreement, or validation of that content.
            </p>

            <p className="font-semibold text-foreground">
              By using this platform, you acknowledge and agree that:
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>You assume full responsibility for the content you post.</li>
              <li>You may be held legally liable by third parties for false, defamatory, or unlawful submissions.</li>
              <li>Leaked Liability™ and its affiliates disclaim all responsibility and liability for damages, reputational loss, or disputes arising from user submissions or reliance on platform content, to the fullest extent permitted by law.</li>
            </ul>

            <p className="font-semibold text-foreground pt-4">
              Retaliation and Misuse:
            </p>

            <p>
              Any attempt to intimidate, harass, or retaliate against users or Leaked Liability™ for lawful participation in this platform may constitute interference or bad-faith conduct and may be documented or disclosed as part of a transparency report.
            </p>

            <p className="pt-4">
              For specific disputes or claims, users should seek independent legal counsel.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
