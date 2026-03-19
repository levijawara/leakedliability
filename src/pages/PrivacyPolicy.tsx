import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 pt-24 md:pt-28 pb-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              Leaked Liability™ Privacy Policy
            </CardTitle>
            <p className="text-center text-muted-foreground">Last Updated: {format(new Date(), "MMMM d, yyyy")}</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-8">
            <p>
              Leaked Liability™ ("LL™," "we," "our," or "us") operates a user-generated public accountability platform designed to increase transparency around late payments in film, TV, commercial, live event, and digital production. All payment reports, timelines, and related data displayed on this platform are submitted by individual crew members and vendors. Leaked Liability™ is an interactive computer service that hosts and organizes this user-submitted content within the meaning of Section 230 of the Communications Decency Act (47 U.S.C. § 230).
            </p>
            <p>
              This Privacy Policy explains how we collect, use, store, and protect your information when you use the Leaked Liability platform or related services.
            </p>
            <p className="font-semibold">
              By accessing or using Leaked Liability™, you agree to this Privacy Policy.
            </p>

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold mt-8 mb-4">1. Information We Collect</h2>
              <p>We collect the following categories of information:</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">1.1 Account Information</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Name</li>
                <li>Email address</li>
                <li>Password (hashed — we never see your actual password)</li>
                <li>Profile data (role, company affiliation, profile photo, optional biography)</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">1.2 Financial & Report Information</h3>
              <p>Submitted by crew, vendors, or authorized admins:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Project names</li>
                <li>Invoice amounts</li>
                <li>Days overdue</li>
                <li>Producer/company responsible</li>
                <li>Uploaded receipts or payment confirmations</li>
                <li>Report comments, explanations, disputes, or resolutions</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">1.2.1 Source of Report Data</h3>
              <p>All report data listed in Section 1.2 is provided voluntarily by the submitting user. Leaked Liability™ does not independently generate, fabricate, or editorially author report content. Reports reflect the experiences and claims of the individual submitting user.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">1.2.2 Escrow payments</h3>
              <p>
                When producers or crew use the Leaked Liability escrow feature, payment amounts, payer/payee identifiers, and transaction timestamps are processed through Stripe and logged by LL for the purpose of confirming report resolution. LL does not hold funds directly; all escrow transactions are facilitated by Stripe.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">1.3 Producer Payment History</h3>
              <p>For purposes of public accountability:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Total amount owed</li>
                <li>Age of oldest debt</li>
                <li>Number of reports</li>
                <li>Producing Social Credit Score (PSCS)</li>
                <li>Resolution timestamps</li>
                <li>Change logs related to report corrections and disputes</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">1.4 Automatically Collected Data</h3>
              <p>Collected via Supabase, Stripe, and analytics:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>IP address</li>
                <li>Device type</li>
                <li>Browser and OS information</li>
                <li>Page interactions</li>
                <li>Login timestamps</li>
                <li>Error logs</li>
                <li>Subscription status</li>
                <li>Payment ID (from Stripe — we do not store card numbers)</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">1.5 Email and Notification Data</h3>
              <p>We log:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Which automated emails were delivered</li>
                <li>Claim response links opened</li>
                <li>Confirmation timestamps</li>
                <li>Verification and reset token usage</li>
              </ul>
              <p className="mt-3">
                We may use tracking pixels or delivery confirmation tools to determine whether outreach emails to named parties have been delivered and opened. This data is used solely to verify delivery and inform case timelines.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">1.6 Contact information from production documents</h3>
              <p>
                LL may process crew contact information extracted from call sheets or production documents submitted by other users, for the purpose of outreach, report verification, or platform improvement. Individuals identified in these documents may contact us to request review or removal of their information.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold mt-8 mb-4">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide and maintain the Leaked Liability™ platform</li>
                <li>Verify, confirm, and score payment reports</li>
                <li>Generate public PSCS and leaderboard rankings</li>
                <li>Facilitate producer claims, disputes, and resolutions</li>
                <li>Detect fraudulent reports or abuse</li>
                <li>Process subscriptions and payments</li>
                <li>Confirm escrow-related payments and report resolution through Stripe (see Section 1.2.2)</li>
                <li>Verify delivery of outreach emails and document case timelines (see Section 1.5)</li>
                <li>Use contact information from call sheets and production documents as described in Section 1.6</li>
                <li>Improve platform reliability and performance</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p className="mt-4 font-semibold">We do not sell personal data.</p>
              <p className="font-semibold">We do not share producer emails or personal details publicly.</p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold mt-8 mb-4">3. What Information Becomes Public</h2>
              <p>Leaked Liability displays user-submitted data that is directly relevant to financial accountability. All publicly visible information originates from crew and vendor reports. The display, organization, and scoring of this data does not constitute editorial authorship of that content.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">Publicly Displayed:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Producer and company names</li>
                <li>Total reported amount</li>
                <li>Days past due</li>
                <li>Project names</li>
                <li>PSCS and leaderboard ranking</li>
                <li>Report status (Pending Verification, Verified, Paid, Disputed)</li>
                <li>Producer-submitted explanations or resolutions (if voluntarily posted)</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">Resolved reports and public rankings</h3>
              <p>
                Resolved reports may be updated to reflect &apos;PAID&apos; or &apos;RESOLVED&apos; status. Producer names associated with fully resolved reports may be removed from public rankings at LL&apos;s discretion, but historical resolution records are retained internally for audit purposes.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">Never Publicly Displayed:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Crew member names</li>
                <li>Email addresses</li>
                <li>Phone numbers</li>
                <li>Uploaded documents (unless you voluntarily post proof publicly)</li>
                <li>IP addresses, device information, or login activity</li>
                <li>Payment receipts containing sensitive financial details</li>
                <li>Internal admin notes and verification logs</li>
              </ul>
              <p className="mt-4 font-semibold">Crew privacy is a core principle of Leaked Liability.</p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold mt-8 mb-4">4. Legal Basis for Processing (CCPA & GDPR-aligned)</h2>
              <p>We process data under the following legal bases:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Contractual necessity:</strong> To maintain your account and process reports</li>
                <li><strong>Legitimate interest:</strong> To operate a financial accountability system</li>
                <li><strong>Consent:</strong> When you voluntarily submit additional information</li>
                <li><strong>Legal compliance:</strong> When required by court order or law enforcement</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold mt-8 mb-4">5. Third Parties Who Receive Data</h2>
              <p>We only share data with services required for platform operation:</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">5.1 Supabase</h3>
              <p>Database, authentication, storage, logging, and security.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">5.2 Stripe</h3>
              <p>Payment processing, subscription management, customer portal, and escrow payment facilitation.</p>
              <p className="mt-2">We <strong>do not</strong> store credit card numbers. Stripe handles all payment information.</p>
              <p className="mt-2">
                LL does not hold escrow funds; escrow is processed through Stripe. Payment-related data logged for resolution is described in Section 1.2.2.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">5.3 Resend / Email Delivery</h3>
              <p>Used solely to send system-required notifications.</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">5.4 Analytics Providers</h3>
              <p>To track platform performance and error logs.</p>
              <p className="mt-2">We do not allow these providers to use LL™ data for their own advertising or profiling.</p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold mt-8 mb-4">6. Cookies & Tracking</h2>
              <p>Leaked Liability uses:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Essential cookies for authentication</li>
                <li>Supabase session cookies</li>
                <li>Analytics cookies (anonymous or pseudonymized)</li>
              </ul>
              <p className="mt-4 font-semibold">We do not use ad tracking or behavioral advertising.</p>
              <p className="mt-4">
                As noted in Section 1.5, some outreach emails may include delivery or open tracking (for example, pixels or provider-level read receipts) solely to confirm delivery and support case timelines, not for advertising.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold mt-8 mb-4">7. Data Retention</h2>
              <p>We retain information based on purpose:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Account information: until you delete your account</li>
                <li>Reports & payment history: retained indefinitely for public accountability</li>
                <li>Dispute records: retained permanently for audit integrity</li>
                <li>Verification logs: retained for administrative and legal reasons</li>
                <li>Stripe billing metadata: retained as required by financial law</li>
                <li>Internal resolution and audit records: may be retained even when public rankings or producer display is updated after resolution (see Section 3)</li>
              </ul>
              <p className="mt-4">
                If you delete your account, your personal details are removed, but <strong>public payment history cannot be deleted</strong>, as it is part of a transparency record.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold mt-8 mb-4">8. Your Rights</h2>
              <p>Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Access your data</li>
                <li>Correct inaccurate information</li>
                <li>Request account deletion</li>
                <li>Request restriction of processing</li>
                <li>Receive a copy of your data ("data portability")</li>
                <li>Opt out of marketing communications (we do none)</li>
                <li>Request review or removal of your contact information if it appears in call sheets or production documents submitted by others (see Section 1.6)</li>
              </ul>
              <p className="mt-4">To request access or deletion, email:</p>
              <p className="font-semibold">
                <a href="mailto:leakedliability@gmail.com" className="text-primary hover:underline">
                  leakedliability@gmail.com
                </a>
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold mt-8 mb-4">9. Data Security</h2>
              <p>We use:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Supabase Row-Level Security</li>
                <li>Encrypted storage for documents</li>
                <li>Hashed passwords</li>
                <li>Role-based access for admins</li>
                <li>Audit logs for admin actions</li>
                <li>HTTPS-only communication</li>
              </ul>
              <p className="mt-4">
                No system is perfectly secure, but LL™ uses industry-standard protections and never exposes crew identities publicly.
              </p>
              <p className="mt-4">
                In the event of a data breach affecting personal information, LL will notify affected users and relevant authorities as required by applicable law.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold mt-8 mb-4">10. Age Requirements</h2>
              <p>Leaked Liability™ is intended for users <strong>18 and older</strong>.</p>
              <p>We do not knowingly collect information from minors.</p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-bold mt-8 mb-4">11. Changes to This Policy</h2>
              <p>We may update this Privacy Policy occasionally.</p>
              <p>When we do, we will update the "Last Updated" date above.</p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-bold mt-8 mb-4">12. Platform Status Under Federal Law</h2>
              <p>
                Leaked Liability™ operates as an interactive computer service under Section 230 of the Communications Decency Act (47 U.S.C. § 230). User-submitted reports, reviews, disputes, and related content are provided by third-party users, not by Leaked Liability™. As such, Leaked Liability™ is not the publisher or speaker of user-generated content hosted on this platform.
              </p>
              <p>
                Leaked Liability™ may moderate, organize, categorize, score, or decline to publish user-submitted content in good faith, consistent with the protections afforded under Section 230(c)(2).
              </p>
              <p>
                Producers and production companies identified in user-submitted reports may respond to, dispute, or provide context for any claims made about them through the platform's built-in dispute process.
              </p>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-2xl font-bold mt-8 mb-4">13. Contact Us</h2>
              <p>For any questions about this Privacy Policy or your data:</p>
              <p className="mt-2 font-semibold">Leaked Liability™ Support</p>
              <p>
                <a href="mailto:leakedliability@gmail.com" className="text-primary hover:underline">
                  leakedliability@gmail.com
                </a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
