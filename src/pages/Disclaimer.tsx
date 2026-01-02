import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

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
            <p className="text-center text-muted-foreground">Last Updated: {format(new Date(), "MMMM d, yyyy")}</p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-4 text-muted-foreground">
            <p>
              Leaked Liability™ is a user-driven transparency platform where individuals may share information about payment practices within the production industry, including experiences involving freelance crew, vendors, service providers, producers, and production companies. The information presented on this platform is user generated and is made available "as is" for general informational purposes only. Leaked Liability™ does not independently verify, investigate, or authenticate the accuracy of each submission.
            </p>

            <h2 className="font-semibold text-foreground text-lg mt-6 mb-3">
              Nature of User Content
            </h2>

            <p>
              All reports, responses, and uploaded materials are submitted by platform users. Each user is solely responsible for the accuracy, completeness, and legality of their own submissions. By posting any content, you represent that it is true to the best of your knowledge and does not contain false, misleading, or defamatory material.
            </p>

            <p>
              Under California defamation law, a claim generally requires a false statement of fact that is published to a third party, is unprivileged, and has a natural tendency to harm reputation. Statements of opinion are generally protected and cannot form the basis of a defamation claim. Users should ensure that all factual claims in their submissions can be supported with documentation, and should clearly distinguish personal opinion from factual assertion. References: Cal. Civ. Code; see also defamation guidance summarized by the Digital Media Law Project and other California legal resources.
            </p>

            <p>
              Leaked Liability™ does not guarantee that user submissions constitute accurate factual representations of events. Users and third parties are encouraged to conduct their own independent verification.
            </p>

            <h2 className="font-semibold text-foreground text-lg mt-6 mb-3">
              Platform Role and Limitations
            </h2>

            <p>
              Leaked Liability™ is not any of the following:
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>A debt collection agency</li>
              <li>A credit reporting agency</li>
              <li>A mediator, arbitrator, or legal representative for any party</li>
              <li>A guarantor of the accuracy of user submitted information</li>
            </ul>

            <p>
              The Producing Social Credit Score (PSCS) and related metrics are proprietary opinion based indicators. They are not credit scores, financial ratings, or legally recognized evaluations, and should not be used as the sole basis for hiring, contracting, or financial decision making.
            </p>

            <p>
              Nothing on this platform should be interpreted as legal advice.
            </p>

            <h2 className="font-semibold text-foreground text-lg mt-6 mb-3">
              Content Moderation
            </h2>

            <p>
              Leaked Liability™ reserves the right, but not the obligation, to remove, redact, restrict access to, or decline to publish any content that appears to be:
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>False</li>
              <li>Defamatory under California law</li>
              <li>Abusive, harassing, or retaliatory</li>
              <li>Unsupported by documentation</li>
              <li>Violative of these Terms or any applicable law</li>
            </ul>

            <p>
              Decisions not to remove content do not constitute endorsement, agreement, or validation of that content.
            </p>

            <h2 className="font-semibold text-foreground text-lg mt-6 mb-3">
              User Responsibilities
            </h2>

            <p>
              By using Leaked Liability™, you agree to the following:
            </p>

            <ol className="list-decimal pl-6 space-y-2">
              <li>You assume full responsibility for any content you submit.</li>
              <li>You acknowledge that California law may hold individuals liable for false statements of fact that harm another party's reputation.</li>
              <li>You acknowledge that Leaked Liability™ disclaims liability for damages arising from user submissions or reliance on platform content, to the fullest extent permitted by law.</li>
              <li>You understand that disputes between users must be resolved independently, through private communication or legal counsel, rather than through Leaked Liability™.</li>
              <li>You understand that the statute of limitations for defamation claims in California is generally one year from the date of publication.</li>
              <li>You understand that public figure status may affect the burden of proof for a defamation claim. Public figures generally must show "actual malice," meaning knowledge of falsity or reckless disregard for the truth.</li>
            </ol>

            <h2 className="font-semibold text-foreground text-lg mt-6 mb-3">
              Retaliation, Harassment, and Interference
            </h2>

            <p>
              Any attempt to intimidate, harass, threaten, or retaliate against users for lawful participation on this platform may be documented. Such conduct may also be disclosed in transparency reports if necessary for platform safety and integrity.
            </p>

            <h2 className="font-semibold text-foreground text-lg mt-6 mb-3">
              Legal Consultation
            </h2>

            <p>
              Users involved in disputes or legal matters are strongly encouraged to seek independent legal counsel. Leaked Liability™ cannot provide legal advice and does not intervene in individual conflicts.
            </p>
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
}
