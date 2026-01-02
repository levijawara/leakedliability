import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container max-w-4xl mx-auto px-4 py-12">
        <Card className="p-8">
          <h1 className="text-4xl font-bold mb-2">Frequently Asked Questions</h1>
          <p className="text-muted-foreground mb-8">
            Find answers to common questions about Leaked Liability™
          </p>

          {/* General Questions */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">General Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-is">
                <AccordionTrigger>What is Leaked Liability™?</AccordionTrigger>
                <AccordionContent>
                  Leaked Liability™ is a transparency platform built to track delayed payments in film and production. Crew, vendors, and freelancers can submit reports about outstanding payments, and LL™ publicly displays producer payment behavior on the Leaderboard. Our goal is simple: encourage faster, more reliable payment across the industry.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="who-can-use">
                <AccordionTrigger>Who can use this platform?</AccordionTrigger>
                <AccordionContent>
                  Anyone working in the production ecosystem: crew members, vendors, producers, production companies, rental houses, and agencies. Producers can view, verify, and settle outstanding debts. Crew and vendors can track owed payments and submit reports when necessary.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="debt-collection">
                <AccordionTrigger>Is this a debt collection service?</AccordionTrigger>
                <AccordionContent>
                  No. Leaked Liability™ is <strong>not</strong> a debt collection agency. We do <strong>not</strong> purchase debts, chase debtors, or take legal action on behalf of users.
                  <br /><br />
                  LL™ simply tracks verified payment delays and provides an optional <strong>neutral escrow settlement system</strong>. Producers may choose to resolve a debt through our secure Stripe-backed escrow portal, but all payments are voluntary and processed anonymously on both sides.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="credit-reporting">
                <AccordionTrigger>Is this a credit reporting agency?</AccordionTrigger>
                <AccordionContent>
                  No. We are not a credit bureau and do not report to credit agencies. The Producing Social Credit Score (PSCS) is <strong>internal to Leaked Liability™ only</strong> and is designed to reflect payment behavior within the production community.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* For Crew Members */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">For Crew Members</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="how-to-file">
                <AccordionTrigger>How do I file a report?</AccordionTrigger>
                <AccordionContent>
                  Log into your account and submit a delayed-payment report from the "Submission Forms" section. You'll provide the producer's name, project details, amount owed, and supporting documentation.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="what-documentation">
                <AccordionTrigger>What documentation do I need?</AccordionTrigger>
                <AccordionContent>
                  Preferred evidence includes:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Invoices</li>
                    <li>Call sheets</li>
                    <li>Texts/emails confirming the rate and job</li>
                    <li>Proof of completed work</li>
                    <li>Payment agreements</li>
                    <li>Purchase orders (if vendor)</li>
                  </ul>
                  <br />
                  The more documentation you attach, the faster we can verify and publish the report.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="crew-anonymous">
                <AccordionTrigger>Can producers see my name?</AccordionTrigger>
                <AccordionContent>
                  No. Producer-facing pages, including escrow payment links, never reveal your identity. Only LL™ admins can see reporter information internally for verification and fraud-prevention.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="report-verification">
                <AccordionTrigger>How are reports verified?</AccordionTrigger>
                <AccordionContent>
                  Our admin team checks timestamps, communication logs, submitted documents, and rate confirmations. If anything is unclear, we contact you for clarification before adding the report to the Leaderboard.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="verification-time">
                <AccordionTrigger>How long does verification take?</AccordionTrigger>
                <AccordionContent>
                  Verification typically takes 1-3 business days, depending on the completeness of your submission. Clear documentation and communication records help speed up the process.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="after-filing">
                <AccordionTrigger>What happens after I file a report?</AccordionTrigger>
                <AccordionContent>
                  Once verified, your report appears on the public leaderboard under the producer's name. The producer receives a notification about the outstanding payment. If they resolve the debt through our escrow system or provide proof of payment, the report status is updated automatically.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* For Producers */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">For Producers</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="how-to-resolve">
                <AccordionTrigger>How can I resolve a payment shown on the Leaderboard?</AccordionTrigger>
                <AccordionContent>
                  Producers can:
                  <ol className="list-decimal ml-6 mt-2 space-y-1">
                    <li><strong>Pay the crew/vendor directly</strong>, then upload proof of payment, or</li>
                    <li><strong>Use LL™ Anonymous Escrow</strong>, where Stripe handles payment securely and LL™ updates the report automatically.</li>
                  </ol>
                  <br />
                  Selecting escrow does <strong>not</strong> require an account. We never disclose the crew member's identity.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="why-name-appears">
                <AccordionTrigger>Why does my name appear on the leaderboard?</AccordionTrigger>
                <AccordionContent>
                  Your name appears only after a delayed-payment report has been <strong>verified</strong>. We do not publish unverified or speculative reports.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="producer-respond">
                <AccordionTrigger>How can I respond to a report?</AccordionTrigger>
                <AccordionContent>
                  Create a producer account to access your dashboard where you can view reports, submit payment confirmations, or file disputes with supporting documentation.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pscs-score">
                <AccordionTrigger>What is the Producing Social Credit Score (PSCS)?</AccordionTrigger>
                <AccordionContent>
                  The PSCS is a scoring model that reflects payment reliability. It considers:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Total amount owed</li>
                    <li>Days overdue</li>
                    <li>Number of outstanding reports</li>
                    <li>Number of paid/cleared reports</li>
                    <li>Repeat offenses across multiple jobs or locations</li>
                  </ul>
                  <br />
                  Scores update automatically when debts are paid or verified. The system includes a forgiveness curve that allows producers to recover their score within 30 days after resolving past debts.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="improve-score">
                <AccordionTrigger>How can I improve my PSCS score?</AccordionTrigger>
                <AccordionContent>
                  Pay outstanding debts promptly and maintain consistent payment practices. Your score improves as you resolve reports and demonstrate reliable payment behavior over time.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="dispute-report">
                <AccordionTrigger>Can I dispute a report?</AccordionTrigger>
                <AccordionContent>
                  Yes. Producers may submit a dispute from the "Disputes" section on their dashboard. Supporting documentation is required.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cost-to-respond">
                <AccordionTrigger>How much does it cost to respond?</AccordionTrigger>
                <AccordionContent>
                  Creating an account and responding to reports is free. Payment processing fees apply when using the escrow system.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* Escrow & Payment System */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Escrow & Payment System</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="how-escrow-works">
                <AccordionTrigger>How does LL™ Escrow work?</AccordionTrigger>
                <AccordionContent>
                  LL™ creates a secure payment link for a verified report. When paid:
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Stripe processes the payment</li>
                    <li>LL™ marks the report as "Paid"</li>
                    <li>The crew/vendor receives funds</li>
                    <li>Producer identity remains private</li>
                    <li>Crew/vendor identity remains private</li>
                  </ul>
                  <br />
                  No one sees each other's personal details.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ll-profit">
                <AccordionTrigger>Does LL™ profit from these payments?</AccordionTrigger>
                <AccordionContent>
                  No. LL™ does not profit from the debt itself. Standard Stripe processing fees apply, and LL™ may charge a small platform fee for payment handling and verification services.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="dispute-process">
                <AccordionTrigger>What is the dispute resolution process?</AccordionTrigger>
                <AccordionContent>
                  Submit your dispute through the producer dashboard with all relevant documentation. Our admin team reviews both sides and makes a determination based on the evidence provided. Resolution typically takes 3-5 business days.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* Leaderboard & Public Visibility */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Leaderboard & Public Visibility</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="remove-name">
                <AccordionTrigger>Can I remove my name from the Leaderboard?</AccordionTrigger>
                <AccordionContent>
                  If a report is incorrect, outdated, or paid—and proof is submitted—your name will be updated automatically. We do not remove verified reports solely upon request.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="why-transparency">
                <AccordionTrigger>Why is transparency necessary?</AccordionTrigger>
                <AccordionContent>
                  Delayed payments are widespread in the film industry and often go unaddressed. The Leaderboard incentivizes timely payment and accountability, not harassment or retaliation.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* Account & Platform */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Account & Platform</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="crew-anonymity">
                <AccordionTrigger>Is LL™ anonymous for crew?</AccordionTrigger>
                <AccordionContent>
                  Yes. All producer-facing systems (escrow links, emails, notifications) preserve crew anonymity.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="platform-cost">
                <AccordionTrigger>Is LL™ free to use?</AccordionTrigger>
                <AccordionContent>
                  Creating an account is free. Some advanced analytics and optional subscription features may require payment.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="producer-registration">
                <AccordionTrigger>Can producers register?</AccordionTrigger>
                <AccordionContent>
                  Yes. Producers can create accounts to manage reports, submit payment confirmations, dispute incorrect entries, and view detailed PSCS analytics.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* Technical Support */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Technical Support</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="password-reset">
                <AccordionTrigger>How do I reset my password?</AccordionTrigger>
                <AccordionContent>
                  Click "Forgot Password" on the login page. Enter your email address and we'll send you a password reset link.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="data-protection">
                <AccordionTrigger>How is my data protected?</AccordionTrigger>
                <AccordionContent>
                  We use industry-standard encryption and security measures. Personal information is never shared with producers, and all payment processing is handled securely through Stripe.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="delete-account">
                <AccordionTrigger>Can I delete my account?</AccordionTrigger>
                <AccordionContent>
                  Yes. Contact our support team to request account deletion. Note that verified reports you've submitted will remain on the platform for transparency, but your personal information will be removed.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contact-support">
                <AccordionTrigger>How do I contact support?</AccordionTrigger>
                <AccordionContent>
                  Email us at <a href="mailto:leakedliability@gmail.com" className="font-bold text-primary hover:underline"><strong>leakedliability@gmail.com</strong></a>, send us a DM on Instagram at <a href="https://www.instagram.com/leakedliability/" target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline"><strong>@LeakedLiability</strong></a>, or use our <Link to="/suggestions" className="font-bold text-primary hover:underline"><strong>Suggestion Box</strong></Link>. Our team typically responds within 24-48 hours.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* For Vendors */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">For Vendors</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="vendors-submit">
                <AccordionTrigger>Can vendors submit reports?</AccordionTrigger>
                <AccordionContent>
                  Yes! Vendors (equipment rental houses, catering companies, post-production facilities, etc.) can submit reports just like crew members when payments are delayed.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="vendor-different">
                <AccordionTrigger>What's different for vendor reports?</AccordionTrigger>
                <AccordionContent>
                  Vendor reports are handled the same way as crew reports, but we understand vendors often work with formal contracts and invoices. The verification process accommodates these business-to-business relationships.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="vendor-documentation">
                <AccordionTrigger>What documentation should vendors provide?</AccordionTrigger>
                <AccordionContent>
                  Invoices, purchase orders, contracts, delivery confirmations, and any email correspondence regarding payment terms or delays.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="company-name-public">
                <AccordionTrigger>Will my company name be public?</AccordionTrigger>
                <AccordionContent>
                  No. Like crew members, vendor identities are kept confidential on all producer-facing communications and escrow transactions.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
