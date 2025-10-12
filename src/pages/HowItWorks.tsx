import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="text-5xl md:text-6xl font-black text-center mb-4">How It Works</h1>
        <p className="text-center text-muted-foreground text-lg mb-12 max-w-3xl mx-auto">
          Understanding the submission process, rules, and accountability measures. Users submit either Crew Member forms or Producer/Production Company forms.
        </p>

        {/* Participants */}
        <Card className="p-8 mb-8">
          <h2 className="text-3xl font-bold mb-6">PARTICIPANTS:</h2>
          <ul className="space-y-2 text-lg">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              Crew Members
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              Producers
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              Production Companies
            </li>
          </ul>
        </Card>

        <Separator className="my-12" />

        {/* Crew Member Submission Forms */}
        <Card className="p-8 mb-8">
          <h2 className="text-3xl font-bold mb-6">Crew Member Submission Forms:</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-lg">Crew Member Reports</h3>
                <p className="text-muted-foreground">sworn statements of unpaid invoices</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h3 className="font-bold text-lg">Payment Confirmations</h3>
                <p className="text-muted-foreground">verify a producer actually paid you</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">‼️</span>
              <div>
                <h3 className="font-bold text-lg">Counter-Disputes</h3>
                <p className="text-muted-foreground">challenge a producer's dispute of your report</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Producer/Production Company Submission Forms */}
        <Card className="p-8 mb-8">
          <h2 className="text-3xl font-bold mb-6">Producer/Production Company Submission Forms:</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="text-2xl">🧾</span>
              <div>
                <h3 className="font-bold text-lg">Payment Documentation</h3>
                <p className="text-muted-foreground">receipts, confirmations, bank proof</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">☮️</span>
              <div>
                <h3 className="font-bold text-lg">Report Explanations</h3>
                <p className="text-muted-foreground">acknowledge & explain why payment is delayed and/or can't be paid</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">⁉️</span>
              <div>
                <h3 className="font-bold text-lg">Report Disputes</h3>
                <p className="text-muted-foreground">challenge a crew member's report</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Producer Dashboard */}
        <Card className="p-8 mb-8 border-primary/20 bg-primary/5">
          <h2 className="text-3xl font-bold mb-6">Producer Dashboard:</h2>
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Producers who link their account during signup gain access to a personalized dashboard where they can:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2"></span>
                <span className="text-muted-foreground">View all reports filed against them in real-time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2"></span>
                <span className="text-muted-foreground">Track payment status, amounts owed, and days outstanding</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2"></span>
                <span className="text-muted-foreground">Submit responses directly (Payment Documentation, Disputes, or Explanations)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2"></span>
                <span className="text-muted-foreground">Monitor their Producer/Production Company Social Credit Score (PSCS)</span>
              </li>
            </ul>
            <div className="bg-background/50 rounded-lg p-4 mt-4">
              <h3 className="font-bold text-lg mb-2">Account Linking Options:</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Producers can choose between <span className="font-semibold text-foreground">Permanent</span> or <span className="font-semibold text-foreground">Temporary</span> account association:
              </p>
              <ul className="space-y-2 ml-6">
                <li className="flex items-start gap-2">
                  <span className="text-lg">🔗</span>
                  <div>
                    <span className="font-semibold text-foreground">Permanent:</span>
                    <span className="text-muted-foreground"> Links your account to a specific producer/company name indefinitely. Best for established producers managing their ongoing reputation.</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-lg">⏱️</span>
                  <div>
                    <span className="font-semibold text-foreground">Temporary:</span>
                    <span className="text-muted-foreground"> Associates your account for a limited time (set duration). Useful for producers working under different company names or freelance aliases.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </Card>

        <Separator className="my-12" />

        {/* Identification Rules */}
        <Card className="p-8 mb-8">
          <h2 className="text-3xl font-bold mb-6">Identification Rules:</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-xl mb-2">Crew Members:</h3>
              <p className="text-muted-foreground leading-relaxed">
                Legal name + email required. Your identity stays hidden from producers and the public. We only contact you if clarification is needed.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2">Producers/Production Companies:</h3>
              <p className="text-muted-foreground leading-relaxed">
                Legal/Business name (or alias) + email required. Your name can/will appear on the leaderboard based on verified reports. That doesn't automatically make you a "bad" Producer/Production Company—it simply means a crew member(s) has sworn that you owe them money. Disclosure of owed debts is not illegal, nor is it defamation of any kind.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                <span className="font-semibold text-foreground">Producer Account Linking:</span> Producers can link their account to their business/producer name during signup (either permanently or temporarily). Linked producers gain access to the Producer Dashboard, where they can view all reports against them and respond directly. Account linking is optional but highly recommended for transparency and reputation management.
              </p>
            </div>
          </div>
        </Card>

        {/* Verification & Liability */}
        <Card className="p-8 mb-8 border-status-critical/20 bg-status-critical/5">
          <h2 className="text-3xl font-bold mb-6">Verification & Liability:</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              All reports undergo strict verification: HUMAN review, & A.I. parsing.
            </p>
            <p>
              Every report is a signed, sworn statement. Crew members are legally accountable for accuracy. Leaked Liability™ is not liable for defamatory attempts by crew; we investigate and discard unverifiable, malicious, or unsupported claims.
            </p>
            <p className="font-semibold text-foreground">
              So, for Crew Members, if we detect falsified or spiteful reports without solid proof/evidence, your account will get BANNED, and turned over to law enforcement. For Producers/Production Companies, falsifying payment documentation, or accusing Crew Members of lying after they've already provided factual evidence (as well as corroborating proof/support) will result in your account getting BANNED, and turned over to law enforcement. BOTH of these potential retaliatory examples are DEFAMATION lawsuits waiting to happen. Don't do it.
            </p>
          </div>
        </Card>

        <Separator className="my-12" />

        {/* Crew Member Form Instructions */}
        <Card className="p-8 mb-8">
          <h2 className="text-3xl font-bold mb-6">Crew Member Form Instructions:</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                Crew Member Report <span className="text-2xl">⚠️</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                One report per invoice. Build the habit of reporting the moment you send your invoice.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                Counter-Dispute <span className="text-2xl">‼️</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Fight back if a Producer disputes your claim with false or fabricated information. This MAY require sharing your identity directly to resolve disputes, but that decision will ALWAYS be up to you. Leaked Liability™ will never share your personal information without your consent.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                Payment Confirmation <span className="text-2xl">✅</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Confirm when you've been paid. Delay confirmations at your own risk—it could probably damage your credibility and freelance relationships. Abusing this system may result in account suspension, as consistent Payment Confirmation delays could be seen as defamatory.
              </p>
            </div>
            <div className="bg-status-warning/10 border border-status-warning/20 rounded-lg p-4">
              <h3 className="font-bold text-xl mb-2 flex items-center gap-2 text-status-warning">
                WARNING <span className="text-2xl">🚨</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Once you've confirmed a payment, you cannot "re-report" or Counter-Dispute that same invoice. This is precisely why we only allow *ONE* invoice per report.
              </p>
            </div>
          </div>
        </Card>

        {/* Producer/Production Company Form Instructions */}
        <Card className="p-8 mb-8">
          <h2 className="text-3xl font-bold mb-6">Producer/Production Company Form Instructions:</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                Payment Documentation <span className="text-2xl">🧾</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Should include payment receipt(s), payment email confirmation(s), payment notification screen-shot(s), etc. You must reference a specific Report ID when submitting payment documentation. Only producers with linked accounts can submit this form, and only for reports filed against them.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                Report Dispute <span className="text-2xl">⁉️</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Means you are *DISAGREEING* with any/all of the Crew Member's report, and you'll need to provide the appropriate counter-claims/supporting evidence. You must reference a specific Report ID when disputing. Only producers with linked accounts can submit this form, and only for reports filed against them.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                Report Explanation <span className="text-2xl">☮️</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                You are admitting the debt and explaining the delay, or the reason why the Crew Member(s) may not get paid at all. Including an honest apology might help your reputation, but it WILL NOT erase the debt. You must reference a specific Report ID when providing an explanation. Only producers with linked accounts can submit this form, and only for reports filed against them.
              </p>
            </div>
          </div>
        </Card>

        <Separator className="my-12" />

        {/* PSCS Score */}
        <Card className="p-8 mb-8 border-primary/20 bg-primary/5">
          <h2 className="text-3xl font-bold mb-6">Producer/Production Company Social Credit Score (PSCS)</h2>
          <div className="space-y-6 text-muted-foreground leading-relaxed">
            <p>
              Your Producer/Production Company Social Credit Score (PSCS) should be treated like your ACTUAL credit score: it reflects payment behavior, not gossip. Like a real credit score, <strong>paying your debt doesn't erase your history</strong>—it fades over time through sustained good behavior.
            </p>
            
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground mt-6 mb-3">Active Debt Penalties</h3>
              <p className="text-sm">
                Every producer starts at 1,000. Your score decreases based on transparent penalty calculations—no hidden algorithms, just clear math:
              </p>

              <div className="bg-background/50 p-4 rounded-lg border border-primary/10">
                <h4 className="font-bold text-foreground mb-2">Age Penalty (max -650 points)</h4>
                <ul className="space-y-1 ml-4 text-sm">
                  <li>• Days 0-60: <strong>-1 point per day</strong> overdue</li>
                  <li>• After 60 days: <strong>-60 base</strong> + <strong>-2 points per day</strong> beyond 60</li>
                  <li>• Example: 755-day debt = -650 points (capped at ~355 days)</li>
                </ul>
              </div>

              <div className="bg-background/50 p-4 rounded-lg border border-primary/10">
                <h4 className="font-bold text-foreground mb-2">Amount Penalty (max -300 points)</h4>
                <ul className="space-y-1 ml-4 text-sm">
                  <li>• <strong>-0.06 points per dollar</strong> owed</li>
                  <li>• Example: $500 owed = -30 points</li>
                  <li>• Example: $5,000+ owed = -300 points (capped)</li>
                </ul>
              </div>

              <div className="bg-background/50 p-4 rounded-lg border border-primary/10">
                <h4 className="font-bold text-foreground mb-2">Repeat Offender Penalty (no cap)</h4>
                <ul className="space-y-1 ml-4 text-sm">
                  <li>• <strong>-10 points</strong> per additional crew member owed (beyond first)</li>
                  <li>• <strong>-10 points</strong> per additional project with debt (beyond first)</li>
                  <li>• <strong>-5 points</strong> per additional city with debt (beyond first)</li>
                  <li>• Example: Owing 3 crew + 2 jobs + 2 cities = -30 points</li>
                </ul>
              </div>

              <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 mt-4">
                <p className="font-semibold text-foreground">
                  Active Debt Score = 1,000 - (Age Penalty + Amount Penalty + Repeat Penalty)
                </p>
              </div>

              <h3 className="text-xl font-bold text-foreground mt-8 mb-3">Credit Recovery System</h3>
              <p className="text-sm">
                Once you pay all debts, your score doesn't magically jump to 1,000. Like a real credit score, negative history fades with time:
              </p>

              <div className="bg-background/50 p-4 rounded-lg border border-primary/10">
                <h4 className="font-bold text-foreground mb-2">How Recovery Works</h4>
                <ul className="space-y-1 ml-4 text-sm">
                  <li>• When you pay all debts, your score immediately improves by removing current penalties</li>
                  <li>• However, <strong>25% of max penalty (250 points) remains as "negative history"</strong></li>
                  <li>• This history penalty gradually fades if you maintain zero unpaid debts</li>
                  <li>• Any new unpaid debt <strong>resets the clock</strong> and applies full penalties</li>
                </ul>
              </div>

              <div className="bg-background/50 p-4 rounded-lg border border-primary/10">
                <h4 className="font-bold text-foreground mb-2">Recovery Timeline (with clean behavior)</h4>
                <ul className="space-y-1 ml-4 text-sm">
                  <li>• <strong>6 months clean:</strong> ~50% of history forgiven (score ≈ 875)</li>
                  <li>• <strong>1 year clean:</strong> ~75% of history forgiven (score ≈ 938)</li>
                  <li>• <strong>2 years clean:</strong> ~94% of history forgiven (score ≈ 985)</li>
                  <li>• <strong>3+ years clean:</strong> Full recovery to 1,000</li>
                </ul>
                <p className="text-xs mt-2 italic">
                  Recovery uses exponential decay with a 180-day half-life
                </p>
              </div>

              <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 mt-4">
                <h4 className="font-bold text-foreground mb-2">Example: Sergey's Recovery Path</h4>
                <p className="text-sm">
                  Sergey had a 755-day debt of $500 (PSCS ≈ 275). Here's what happens when he pays:
                </p>
                <ul className="space-y-1 ml-4 text-sm mt-2">
                  <li>• <strong>Day 0 (payment):</strong> PSCS jumps to ~750 (debt cleared, but 25% history remains)</li>
                  <li>• <strong>6 months clean:</strong> PSCS ≈ 875 (50% forgiveness)</li>
                  <li>• <strong>1 year clean:</strong> PSCS ≈ 938 (75% forgiveness)</li>
                  <li>• <strong>2 years clean:</strong> PSCS ≈ 985 (94% forgiveness)</li>
                  <li>• <strong>3+ years clean:</strong> PSCS → 1000 (full recovery)</li>
                </ul>
                <p className="text-xs mt-2 font-semibold text-foreground">
                  But if Sergey creates ANY new debt during recovery, the clock resets and current penalties apply.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Final Message */}
        <Card className="p-8 mb-8 bg-gradient-to-br from-card to-muted/20">
          <div className="text-center space-y-4">
            <p className="text-xl font-bold">
              This platform is NOT about revenge. It's about ACCOUNTABILITY.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Public accountability motivates better deals, faster payments, and professional respect. Reminder—LIABILITY IS THE COST OF PRODUCING. If you don't like it, choose another career. Nobody is FORCING you to produce. You can CHOOSE to do right by your crew, or potentially suffer the consequences of what you CHOOSE to do instead. Either way, it's always up to YOU.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HowItWorks;
