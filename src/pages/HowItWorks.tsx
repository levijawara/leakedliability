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
                Should include payment receipt(s), payment email confirmation(s), payment notification screen-shot(s), etc.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                Report Dispute <span className="text-2xl">⁉️</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Means you are *DISAGREEING* with any/all of the Crew Member's report, and you'll need to provide the appropriate counter-claims/supporting evidence.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                Report Explanation <span className="text-2xl">☮️</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                You are admitting the debt and explaining the delay, or the reason why the Crew Member(s) may not get paid at all. Including an honest apology might help your reputation, but it WILL NOT erase the debt.
              </p>
            </div>
          </div>
        </Card>

        <Separator className="my-12" />

        {/* PSCS Score */}
        <Card className="p-8 mb-8 border-primary/20 bg-primary/5">
          <h2 className="text-3xl font-bold mb-6">Producer/Production Company Social Credit Score (PSCS)</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Your Producer/Production Company Social Credit Score (PSCS) should be treated like your ACTUAL credit score: it reflects payment behavior, not gossip. Modeled after ACTUAL credit reporting authorities, we use an in-house, weighted, logarithmic equation to calculate your PSCS. Scores will range from 0 to 1,000—the following details will be factored in:
            </p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2"></span>
                <span>TOTAL amount of money owed (in US dollars $$$).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2"></span>
                <span>TOTAL # of UNIQUE crew members you're indebted to.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2"></span>
                <span>TOTAL # of UNIQUE productions that you still owe money on.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2"></span>
                <span>TOTAL # of UNIQUE cities where debt lingers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-primary mt-2"></span>
                <span>LONGEST outstanding debt (in DAYS).</span>
              </li>
            </ul>
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
