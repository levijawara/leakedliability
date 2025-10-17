import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface SubmissionWalkthroughProps {
  onContinue: () => void;
}

export function SubmissionWalkthrough({ onContinue }: SubmissionWalkthroughProps) {
  const [understood, setUnderstood] = useState(false);

  return (
    <Card className="p-8">
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <h2 className="text-2xl font-bold mb-4">LEAKED LIABILITY™ — WALK-THROUGH</h2>
        <p className="text-sm text-muted-foreground mb-6">(version 1.5) (BETA) - Last updated 10/17/2025</p>

        <div className="space-y-6 text-sm">
          <section>
            <h3 className="font-bold text-base mb-2">PARTICIPANTS:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Crew Members</li>
              <li>Vendors / Service Providers</li>
              <li>Producers</li>
              <li>Production Companies</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">What Crew Members & Vendors / Service Providers Can Submit:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Crew Member Reports ⚠️</strong> - sworn statements of unpaid invoices</li>
              <li><strong>Vendor Reports ⚠️</strong> - sworn statements of unpaid invoices for equipment, services, or facilities</li>
              <li><strong>Payment Confirmations ✅</strong> - verify a producer actually paid you</li>
              <li><strong>Counter-Disputes ‼️</strong> - challenge a producer's dispute of your report</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">What Producers/Production Companies Can Submit:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Payment Documentation 🧾</strong> - receipts, confirmations, bank proof</li>
              <li><strong>Report Explanations ☮️</strong> - acknowledge & explain why payment is delayed</li>
              <li><strong>Report Disputes ⁉️</strong> - challenge a crew member's or vendor's report</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">Identification Rules:</h3>
            <p><strong>Crew Members:</strong> Legal name + email required. Your identity stays hidden from producers and the public.</p>
            <p><strong>Vendors:</strong> Business/Legal name + email required. Your identity stays hidden from producers and the public.</p>
            <p><strong>Producers/Production Companies:</strong> Legal/Business name + email required. Your name may appear on the leaderboard based on verified reports.</p>
          </section>

          <section>
            <h3 className="font-bold text-base mb-2">⚠️ CRITICAL WARNING:</h3>
            <div className="bg-destructive/10 border border-destructive p-4 rounded-md">
              <p className="font-bold mb-2">WE CANNOT AND WILL NOT TOLERATE LYING, EXAGGERATING, FABRICATING, OR DEFAMING OF ANY KIND.</p>
              <p>Every report is a signed, sworn statement. You are legally accountable for accuracy. False reports will result in account termination and potential legal action.</p>
            </div>
          </section>
        </div>

        <div className="mt-8 flex items-start gap-3 p-4 bg-muted rounded-md">
          <Checkbox 
            id="understood" 
            checked={understood}
            onCheckedChange={(checked) => setUnderstood(checked as boolean)}
          />
          <label 
            htmlFor="understood" 
            className="text-sm font-medium cursor-pointer"
          >
            I have READ and UNDERSTOOD EVERYTHING. I acknowledge that submitting false information may result in legal consequences.
          </label>
        </div>

        <Button 
          onClick={onContinue} 
          disabled={!understood}
          size="lg"
          className="w-full mt-6"
        >
          Continue
        </Button>
      </div>
    </Card>
  );
}
