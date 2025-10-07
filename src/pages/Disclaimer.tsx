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
              Leaked Liability™ provides a platform for users to submit and view reports concerning payment practices in the production industry. We do not independently verify every claim, and we do not guarantee the accuracy, completeness, or legality of any report, response, or supporting documentation submitted by users.
            </p>

            <p>
              All reports and submissions are user-generated content. Crew Members and Producers/Production Companies are solely responsible for the truthfulness and accuracy of their submissions. By submitting a report or response, you represent and warrant that the information is accurate to the best of your knowledge and not misleading, fraudulent, or defamatory.
            </p>

            <p>
              Leaked Liability™ does not act as a debt collector, credit reporting agency, or arbitrator. We are not a party to disputes between Crew Members and Producers/Production Companies, and we do not provide legal advice. Our scoring system is a proprietary opinion-based metric designed for informational purposes only; it is not equivalent to a legally recognized credit score and should not be relied upon as such.
            </p>

            <p>
              We reserve the right to remove, edit, or decline to post submissions that appear false, defamatory, abusive, or unsupported by adequate documentation. However, our decision not to act on a submission does not imply endorsement or validation of its contents.
            </p>

            <p className="font-semibold text-foreground">
              By using this platform, you acknowledge and agree that:
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>You assume full responsibility for any content you submit.</li>
              <li>You may be held legally liable by third parties if your content is false, misleading, defamatory, or otherwise unlawful.</li>
              <li>Leaked Liability™ disclaims all liability for damages or disputes arising out of user submissions or reliance on platform content, to the fullest extent permitted by law.</li>
            </ul>

            <p className="pt-4">
              For specific disputes or claims, users should seek advice from a qualified legal professional.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
