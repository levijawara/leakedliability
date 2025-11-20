import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight, CreditCard } from "lucide-react";

export default function EscrowHub() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
      <header className="space-y-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs uppercase tracking-wide">
          <ShieldCheck className="w-4 h-4" />
          <span>Neutral third-party payment</span>
        </div>
        <h1 className="text-3xl font-semibold">Crew Payment Escrow</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Producers send money into escrow; Leaked Liability tracks, verifies, 
          and confirms when crew have been paid. No excuses. No "lost invoices".
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => navigate("/escrow/initiate")}
          className="group border border-border rounded-xl px-5 py-4 text-left hover:border-foreground/30 transition flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">Send Payment Through Escrow</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-xs text-muted-foreground">
            For producers and companies who want to settle outstanding payments 
            through a neutral third party.
          </p>
        </button>

        <button
          onClick={() => navigate("/escrow/redeem")}
          className="group border border-border rounded-xl px-5 py-4 text-left hover:border-foreground/30 transition flex flex-col justify-between gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">Redeem Escrow Code</span>
            <CreditCard className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-xs text-muted-foreground">
            Already have an escrow payment code from Leaked Liability? Enter it 
            here to go straight to the secure payment page.
          </p>
        </button>
      </section>

      <section className="border border-border rounded-xl p-5 space-y-3 text-sm">
        <h2 className="font-medium">How Escrow Works</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>Producer submits payment details and pays into escrow.</li>
          <li>Funds sit in a neutral account while we verify the claim.</li>
          <li>Once crew confirms payment, the debt is cleared in our system.</li>
          <li>Every step is logged and timestamped for receipts and disputes.</li>
        </ul>
      </section>
    </div>
  );
}
