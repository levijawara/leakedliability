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
              Leaked Liability™ ("LL™," "we," "our," or "us") operates a public accountability system designed to increase transparency around late payments in film, TV, commercial, live event, and digital production.
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
                <li>Improve platform reliability and performance</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p className="mt-4 font-semibold">We do not sell personal data.</p>
              <p className="font-semibold">We do not share producer emails or personal details publicly.</p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold mt-8 mb-4">3. What Information Becomes Public</h2>
              <p>Leaked Liability publishes data that is directly relevant to financial accountability:</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">Publicly Displayed:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Producer and company names</li>
                <li>Total outstanding debt</li>
                <li>Days past due</li>
                <li>Project names</li>
                <li>PSCS and leaderboard ranking</li>
                <li>Report status (Pending Verification, Verified, Paid, Disputed)</li>
                <li>Producer-submitted explanations or resolutions (if voluntarily posted)</li>
              </ul>

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
              <p>Payment processing, subscription management, customer portal.</p>
              <p className="mt-2">We <strong>do not</strong> store credit card numbers. Stripe handles all payment information.</p>

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
              <h2 className="text-2xl font-bold mt-8 mb-4">12. Contact Us</h2>
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
