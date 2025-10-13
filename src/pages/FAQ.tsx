import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Frequently Asked Questions</CardTitle>
            <CardDescription>
              Find answers to common questions about Leaked Liability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* General Questions */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">General Questions</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>What is Leaked Liability?</AccordionTrigger>
                  <AccordionContent>
                    Leaked Liability is a transparency platform that allows film and TV crew members to
                    anonymously report unpaid wages and unethical business practices by production companies.
                    We provide a public accountability system through our leaderboard, which tracks producers'
                    Payment & Safety Compliance Score (PSCS).
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>Who can use this platform?</AccordionTrigger>
                  <AccordionContent>
                    Anyone who has worked in film and television production can submit reports about unpaid
                    wages. Producers can respond to reports and submit payment confirmations. Anyone can view
                    the public leaderboard (with an active subscription) to check producer payment histories.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>Is this a debt collection service?</AccordionTrigger>
                  <AccordionContent>
                    No. Leaked Liability is not a debt collection agency. We do not collect debts, pursue
                    legal action on behalf of crew members, or guarantee payment. We are a transparency
                    platform that publicly tracks payment compliance.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger>Is this a credit reporting agency?</AccordionTrigger>
                  <AccordionContent>
                    No. We are not a credit reporting agency. The PSCS scores displayed on our leaderboard
                    are opinion-based metrics derived from user-submitted reports and do not constitute
                    official credit ratings.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Crew Member FAQs */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">For Crew Members</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="crew-1">
                  <AccordionTrigger>How do I file a report?</AccordionTrigger>
                  <AccordionContent>
                    Navigate to "Submit Report" in the menu, then follow the step-by-step walkthrough.
                    You'll need to provide information about the production company, project details, your
                    role, payment amount owed, and supporting documentation (invoices, contracts, timecards,
                    etc.). Reports are anonymous unless you choose to identify yourself.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="crew-2">
                  <AccordionTrigger>What documentation do I need?</AccordionTrigger>
                  <AccordionContent>
                    We require at least one form of payment documentation such as: invoices, W-2 forms,
                    1099 forms, contracts, timecards, pay stubs, or email correspondence confirming payment
                    terms. The more documentation you provide, the stronger your report.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="crew-3">
                  <AccordionTrigger>Will my report be anonymous?</AccordionTrigger>
                  <AccordionContent>
                    Yes, by default all crew reports are anonymous. Your identity is never shared publicly
                    on the leaderboard. However, you may optionally choose to identify yourself to the
                    producer during the submission process.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="crew-4">
                  <AccordionTrigger>How long does verification take?</AccordionTrigger>
                  <AccordionContent>
                    Our admin team reviews all reports within 3-5 business days. We verify that documentation
                    is sufficient and that the report meets our submission guidelines. You'll receive an email
                    notification once your report is verified or if additional documentation is needed.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="crew-5">
                  <AccordionTrigger>What happens after I file a report?</AccordionTrigger>
                  <AccordionContent>
                    After verification, your report appears on the producer's profile and affects their PSCS
                    score. The producer is notified and can respond by submitting proof of payment. If they
                    submit valid payment proof, you'll be asked to confirm receipt, which can improve their
                    score.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Producer FAQs */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">For Producers</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="prod-1">
                  <AccordionTrigger>How do I respond to a report?</AccordionTrigger>
                  <AccordionContent>
                    Create a producer account and navigate to your Producer Dashboard. You'll see all reports
                    filed against your production company. You can respond by submitting payment documentation
                    (cancelled checks, bank statements, payment confirmations) to prove payment was made.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="prod-2">
                  <AccordionTrigger>What is the PSCS score?</AccordionTrigger>
                  <AccordionContent>
                    The Payment & Safety Compliance Score (PSCS) is a metric (0-100) that reflects a
                    producer's payment history based on verified reports and payment confirmations. Higher
                    scores indicate better payment compliance. It's calculated using total amount owed,
                    total paid, report count, and payment timeliness.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="prod-3">
                  <AccordionTrigger>How do I improve my PSCS score?</AccordionTrigger>
                  <AccordionContent>
                    Submit valid payment documentation for outstanding reports. Once crew members confirm
                    receipt of payment, your score will update to reflect resolved debts. The fastest way
                    to improve your score is to pay outstanding crew members and submit proof promptly.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="prod-4">
                  <AccordionTrigger>Can I dispute a false report?</AccordionTrigger>
                  <AccordionContent>
                    Yes. If you believe a report is false or inaccurate, you can file a dispute through your
                    Producer Dashboard. Provide evidence that payment was made (or the claim is fraudulent),
                    and our admin team will review. Fraudulent reports are removed and may result in penalties
                    for the submitter.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="prod-5">
                  <AccordionTrigger>How much does it cost to respond?</AccordionTrigger>
                  <AccordionContent>
                    Creating a producer account and viewing reports filed against you is free. Accessing
                    certain features and expedited score updates may require a subscription in the future.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Technical Support */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Technical Support</h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="tech-1">
                  <AccordionTrigger>I forgot my password. How do I reset it?</AccordionTrigger>
                  <AccordionContent>
                    Click "Sign In" in the navigation menu, then click "Forgot Password?" on the login page.
                    Enter your email address and you'll receive a password reset link.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tech-2">
                  <AccordionTrigger>How is my data protected?</AccordionTrigger>
                  <AccordionContent>
                    We use industry-standard encryption and secure authentication. All uploaded documents are
                    stored securely and only accessible to verified admin staff during the review process.
                    Crew member identities are never shared publicly unless explicitly authorized.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tech-3">
                  <AccordionTrigger>Can I delete my account?</AccordionTrigger>
                  <AccordionContent>
                    Yes. Contact our support team to request account deletion. Note that reports you've
                    submitted may remain on the platform (in anonymous form) to maintain leaderboard integrity,
                    but your personal account data will be permanently deleted.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tech-4">
                  <AccordionTrigger>Who can I contact for support?</AccordionTrigger>
                  <AccordionContent>
                    For technical issues, account problems, or general questions, please use the contact
                    information provided in your account dashboard or reach out through our official
                    communication channels.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FAQ;
