import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black mb-4">
            How It Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Read once. Understand forever.
          </p>
        </div>

        <Accordion type="multiple" defaultValue={[]} className="w-full space-y-4">
          {/* 1️⃣ OVERVIEW */}
          <AccordionItem value="overview">
            <Card>
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Overview</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-4">
                  <p className="text-lg">
                    Leaked Liability™ is a transparency platform designed to protect freelance crew, vendors, and service providers — while motivating producers and companies to act with integrity. <strong>We reward honesty. We verify facts. We track patterns.</strong>
                  </p>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 2️⃣ WHO USES LEAKED LIABILITY™ */}
          <AccordionItem value="participants">
            <Card>
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Who Uses Leaked Liability™</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold mb-2">Crew Members</h3>
                    <p className="text-muted-foreground">
                      File reports on unpaid jobs, track payment status, and earn access to the leaderboard.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Vendors & Service Providers</h3>
                    <p className="text-muted-foreground">
                      Log outstanding invoices and rental debts, submit payment confirmations, and build public accountability records.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Producers/Production Companies</h3>
                    <p className="text-muted-foreground">
                      Confirm payments, self-report debts to earn Transparency Credit, repair PSCS reputation, and access the Producer Dashboard.
                    </p>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 3️⃣ CONFIRMATION CASH */}
          <AccordionItem value="confirmation-cash">
            <Card className="border-green-600/30 bg-green-600/10 dark:border-green-500/30 dark:bg-green-500/10">
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Confirmation Cash 💰</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-4">
                  <p className="text-lg font-semibold italic">
                    "Think of it as karma points with receipts."
                  </p>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Purpose</h3>
                    <p className="text-muted-foreground">
                      In-platform credit system that rewards accountability and verified actions.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">How to Earn It</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Verified payment confirmations</li>
                      <li>Corroborating other users' self-reports</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Rules</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Never expires</li>
                      <li>Cannot be redeemed for real money</li>
                      <li>Can be used only for in-platform perks (merch, leaderboard access upgrades, etc.)</li>
                      <li>Visible only in your dashboard (hidden from public)</li>
                    </ul>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 4️⃣ PRODUCER SELF-REPORTS */}
          <AccordionItem value="self-reports">
            <Card className="border-green-600/30 bg-green-600/10 dark:border-green-500/30 dark:bg-green-500/10">
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Producer Self-Reports 🎉</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">What It Is</h3>
                    <p className="text-muted-foreground">
                      A voluntary transparency mechanism for producers to self-disclose unpaid debts.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Why Do It</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Earn Transparency Credit when verified</li>
                      <li>Boost PSCS score (+10 points)</li>
                      <li>Unlock 🔥 Momentum status (7-day good standing window)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Verification Requirements</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>3+ independent corroborations from crew/vendors (via share link)</li>
                      <li>Uploaded payment documentation</li>
                      <li>Admin review & validation</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">How It Works</h3>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      <li>Submit self-report through Producer Dashboard</li>
                      <li>Receive auto-generated share link immediately</li>
                      <li>Share link with collaborators (crew/vendors who can confirm)</li>
                      <li>Once 3 confirmations received → status changes to "Pending Verification"</li>
                      <li>Admin reviews → if approved, PSCS increases + Momentum unlocked</li>
                    </ol>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 5️⃣ THE WILDFIRE SYSTEM */}
          <AccordionItem value="wildfire">
            <Card className="border-green-600/30 bg-green-600/10 dark:border-green-500/30 dark:bg-green-500/10">
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>The Wildfire System (Corroboration Links) 🔗</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-4">
                  <p className="text-lg font-semibold italic">
                    "You can't fake community trust — it's built through repetition."
                  </p>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Purpose</h3>
                    <p className="text-muted-foreground">
                      Allow crew/vendors to confirm producer self-reports without creating accounts.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">How It Works</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Producer submits self-report → receives unique share link</li>
                      <li>Format: <code className="bg-muted px-2 py-1 rounded">leakedliability.com/confirm?r=&#123;uuid&#125;&p=&#123;uuid&#125;</code></li>
                      <li>No login required for crew/vendors to confirm</li>
                      <li>Each unique confirmation = +1 corroboration count</li>
                      <li>At 3 confirmations → auto-changes to "Pending Verification"</li>
                      <li>Admin finalizes after review</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Why "Wildfire"</h3>
                    <p className="text-muted-foreground">
                      Encourages viral accountability through community trust — once it starts spreading, it's unstoppable.
                    </p>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 6️⃣ MOMENTUM STATUS */}
          <AccordionItem value="momentum">
            <Card className="border-green-600/30 bg-green-600/10 dark:border-green-500/30 dark:bg-green-500/10">
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Momentum Status 🔥</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">What It Is</h3>
                    <p className="text-muted-foreground">
                      7-day "Good Standing" window that appears when a producer's PSCS increases.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Visual Indicator</h3>
                    <p className="text-muted-foreground">
                      🔥 icon next to producer name on leaderboard.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Purpose</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Reward consistent good behavior</li>
                      <li>Encourage "streaks" of accountability</li>
                      <li>Publicly visible sign of active reputation improvement</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">How to Earn</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Verified on-time payment confirmation</li>
                      <li>Verified self-report with corroboration</li>
                      <li>Any action that increases PSCS</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Duration</h3>
                    <p className="text-muted-foreground">
                      7 days from last positive action.
                    </p>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 7️⃣ PSCS */}
          <AccordionItem value="pscs">
            <Card>
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>PSCS (Producer Social Credit Score)</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-6">
                  <p className="text-lg">
                    The metric that defines accountability.
                  </p>
                  
                  <div>
                    <h3 className="text-xl font-bold mb-4">Scoring Events</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-4">Event</th>
                            <th className="text-right py-2 px-4">Effect</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 px-4">Verified on-time payment</td>
                            <td className="text-right py-2 px-4 text-green-600 font-semibold">+15</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-4">Verified late payment</td>
                            <td className="text-right py-2 px-4 text-green-600 font-semibold">+5</td>
                          </tr>
                          <tr className="border-b bg-primary/5">
                            <td className="py-2 px-4 font-semibold">Verified self-report (NEW)</td>
                            <td className="text-right py-2 px-4 text-green-600 font-semibold">+10</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-4">Unresolved report (30+ days)</td>
                            <td className="text-right py-2 px-4 text-red-600 font-semibold">-10</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 px-4">Confirmed non-payment (60+ days)</td>
                            <td className="text-right py-2 px-4 text-red-600 font-semibold">-25</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-4">Fraud / ban</td>
                            <td className="text-right py-2 px-4 text-red-600 font-semibold">-100</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-3">Active Debt Penalties</h3>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold mb-1">Age Penalty (no cap)</h4>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                          <li>Days 0-60: -1 point/day</li>
                          <li>After 60 days: -60 base + -2 points/day beyond 60</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Amount Penalty (max -300 points)</h4>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                          <li>-0.06 points per dollar owed</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Repeat Offender Penalty (no cap)</h4>
                        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                          <li>-10 points per additional crew owed</li>
                          <li>-20 points per additional vendor owed</li>
                          <li>-10 points per additional project with debt</li>
                          <li>-5 points per additional city with debt</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-3">Credit Recovery System</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>25% of max penalty remains as "negative history" after payment</li>
                      <li>6 months clean: ~50% forgiven (≈875)</li>
                      <li>1 year clean: ~75% forgiven (≈938)</li>
                      <li>2 years clean: ~94% forgiven (≈985)</li>
                      <li>3+ years clean: Full recovery to 1000</li>
                    </ul>
                    <p className="mt-3 font-semibold text-destructive">
                      Important: Any new debt resets the clock.
                    </p>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 8️⃣ LEADERBOARD ACCESS */}
          <AccordionItem value="leaderboard">
            <Card>
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Leaderboard Access</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold mb-3">For Crew/Vendors</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Free access after <strong>one verified report</strong> OR <strong>3 corroborations on self-reports</strong></li>
                      <li>Earn Confirmation Cash for verified activity</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-3">For Producers</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong>Tier 1 (<span className="font-bold text-green-600 dark:text-green-400">$5.99</span>/mo):</strong> When you receive payment confirmation from crew, your PSCS will update sometime within a NET30 window.</li>
              <p className="text-red-500 font-bold mt-2">
                (...DO YOU SEE HOW FUCKING STUPID THAT SOUNDS???)
              </p>
              <li><strong>Tier 2 (<span className="font-bold text-green-600 dark:text-green-400">$9.99</span>/mo):</strong> Real-time updates, advanced analytics, export reports</li>
                      <li><strong>OR:</strong> Pay with Confirmation Cash (future feature)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-3">Privacy Threshold</h3>
                    <p className="text-muted-foreground">
                      Producer names blurred until 20 unique verified producers exist in system.
                    </p>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 9️⃣ SUBMISSION FORMS GUIDE */}
          <AccordionItem value="forms">
            <Card>
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Submission Forms Guide</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold mb-3">Crew Member & Vendor Forms</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>Crew Member Report ⚠️</strong> — Sworn statements of unpaid invoices (one per invoice)</li>
                      <li><strong>Vendor Report 📋</strong> — Unpaid invoices for equipment, services, facilities (one per invoice)</li>
                      <li><strong>Payment Confirmation ✅</strong> — Confirm when paid (for both crew and vendors)</li>
                      <li><strong>Counter-Dispute ‼️</strong> — Challenge producer's false dispute (may require identity sharing, always user's choice)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-3">Producer/Production Company Forms</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>Self-Report 🤝 (NEW)</strong> — Voluntarily disclose debt, earn Transparency Credit</li>
                      <li><strong>Payment Documentation 🧾</strong> — Receipts, confirmations, bank proof (must reference Report ID)</li>
                      <li><strong>Report Explanation ☮️</strong> — Admit debt, explain delay, apologize (doesn't erase debt)</li>
                      <li><strong>Report Dispute ⁉️</strong> — Challenge crew/vendor claim with counter-evidence (must reference Report ID)</li>
                    </ul>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 🔟 PRODUCER DASHBOARD */}
          <AccordionItem value="dashboard">
            <Card>
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Producer Dashboard</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold mb-3">Available to producers with linked accounts:</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>View all reports filed against them (real-time)</li>
                      <li>Track payment status, amounts owed, days outstanding</li>
                      <li>Submit responses directly (Documentation, Disputes, Explanations)</li>
                      <li className="font-semibold">NEW: Submit self-reports with auto-generated share links</li>
                      <li className="font-semibold">NEW: Monitor Momentum status (🔥 indicator)</li>
                      <li>Monitor PSCS score</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-3">Account Linking Options</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>Permanent:</strong> Indefinite link to producer/company name (best for established producers)</li>
                      <li><strong>Temporary:</strong> Limited-time association (useful for freelance aliases or changing company names)</li>
                    </ul>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 1️⃣1️⃣ IDENTIFICATION RULES */}
          <AccordionItem value="identification">
            <Card>
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Identification Rules</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold mb-3">Crew Members</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Legal name + email required</li>
                      <li>Identity hidden from producers and public</li>
                      <li>Contacted only if clarification needed</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-3">Vendors</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Business name + contact info required</li>
                      <li><strong>Not anonymous</strong> — company name appears on verified reports (standard B2B accountability)</li>
                      <li>Must provide invoice number, PO/booking confirmation, commercial agreement</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-3">Producers/Production Companies</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Legal/Business name (or alias) + email required</li>
                      <li>Name appears on leaderboard based on verified reports</li>
                      <li>Dashboard access requires account linking (optional but recommended)</li>
                    </ul>
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 1️⃣2️⃣ VERIFICATION & LIABILITY */}
          <AccordionItem value="verification">
            <Card>
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Verification & Liability</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-4">
                  <ul className="list-disc list-inside space-y-3 text-muted-foreground">
                    <li>All reports undergo strict verification: human review + AI parsing</li>
                    <li>Every report is a signed, sworn statement</li>
                    <li>Legal accountability for accuracy applies to all participants</li>
                    <li><strong>Crew/Vendors:</strong> Falsified or spiteful reports without proof → BANNED + turned over to law enforcement</li>
                    <li><strong>Producers:</strong> Falsifying payment documentation or false accusations → BANNED + turned over to law enforcement</li>
                    <li>Retaliatory false claims = defamation lawsuits waiting to happen</li>
                  </ul>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 1️⃣3️⃣ REPORT LIFECYCLE */}
          <AccordionItem value="lifecycle">
            <Card>
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Report Lifecycle</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                    <li><strong>Submitted</strong> → "Pending Review"</li>
                    <li><strong>Admin validates</strong> → "Active"</li>
                    <li><strong>Producer responds/pays</strong> → "Resolved"</li>
                    <li><strong>Verified</strong> → PSCS auto-updates</li>
                    <li><strong>Late or false data</strong> → penalties applied</li>
                    <li><strong>Immutable audit log</strong> ensures integrity</li>
                  </ol>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 1️⃣5️⃣ BAN POLICY */}
          <AccordionItem value="ban-policy">
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Ban Policy 🚫</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent className="space-y-4">
                  <p className="text-lg font-semibold">
                    Zero tolerance for fraud or manipulation.
                  </p>
                  
                  <div>
                    <h3 className="text-xl font-bold mb-2">Ban Triggers</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Falsified claims</li>
                      <li>Fake corroborations</li>
                      <li>Abusive conduct</li>
                      <li>Repeat violations</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-2">Appeal Process</h3>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>One appeal only</strong> via email: leakedliability@gmail.com</li>
                      <li>If denied → permanent deletion</li>
                      <li>No second chances</li>
                    </ul>
                  </div>

                  <p className="text-lg font-semibold italic mt-4">
                    "Play stupid games, win stupid prizes."
                  </p>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 1️⃣6️⃣ SECURITY & PRIVACY */}
          <AccordionItem value="security">
            <Card>
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Security & Privacy</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>All user data secured via backend Edge Functions + RLS (Row-Level Security)</li>
                    <li>No client-side role logic (prevents tampering)</li>
                    <li>Files: UUID-named, 15-minute signed URLs</li>
                    <li>Producer data visible only after admin verification</li>
                    <li>Audit logs for every admin action</li>
                    <li>Corroboration links use public RPC (intentionally — no auth required for anonymous confirmation)</li>
                  </ul>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 1️⃣7️⃣ DISCLAIMERS & LEGAL */}
          <AccordionItem value="legal">
            <Card>
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Disclaimers & Legal</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>LL™ ≠ a bank, mediator, or lawyer</li>
                    <li>All monetary figures are symbolic (Confirmation Cash is not real money)</li>
                    <li>Participation = agreement to all platform terms</li>
                    <li>We provide verified documentation, <strong>not legal representation</strong></li>
                    <li>Users are responsible for their own legal recourse</li>
                  </ul>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>

          {/* 1️⃣8️⃣ FUTURE AMENDMENTS */}
          <AccordionItem value="amendments">
            <Card>
              <CardHeader>
                <AccordionTrigger className="hover:no-underline">
                  <CardTitle>Future Amendments</CardTitle>
                </AccordionTrigger>
              </CardHeader>
              <AccordionContent>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>All major platform updates published as <strong>Site Notices</strong> in user dashboard</li>
                    <li>Pulled from backend database in real-time</li>
                    <li><strong>You're responsible for staying informed</strong></li>
                    <li>No retroactive grandfathering — platform evolves, users adapt</li>
                  </ul>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>

        {/* FINAL MESSAGE - ALWAYS VISIBLE */}
        <Card className="border-primary/20 bg-primary/5 mt-8">
          <CardContent className="pt-6">
            <p className="text-center text-lg font-semibold mb-4">
              This platform is NOT about revenge. It's about ACCOUNTABILITY.
            </p>
            <p className="text-center text-muted-foreground">
              Public accountability motivates better deals, faster payments, and professional respect. 
              Reminder—LIABILITY IS THE COST OF PRODUCING. If you don't like it, choose another career. 
              Nobody is FORCING you to produce. You can CHOOSE to do right by your crew, or potentially 
              suffer the consequences of what you CHOOSE to do instead. Either way, it's always up to YOU.
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Fixed Home button */}
      <Link to="/">
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg"
          aria-label="Return to home"
        >
          <Home className="h-5 w-5" />
        </Button>
      </Link>
      
      <Footer />
    </div>
  );
}
