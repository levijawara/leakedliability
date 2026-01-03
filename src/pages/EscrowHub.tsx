import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowRight, CreditCard, CheckCircle2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function EscrowHub() {
  const navigate = useNavigate();

  return (
    <>
      <Navigation />
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-12 animate-fade-in">
      <header className="space-y-5 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 text-xs uppercase tracking-wide">
          <ShieldCheck className="w-4 h-4 text-green-500 animate-pulse" />
          <span className="text-green-400">Neutral third-party payment</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold">
          <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            Crew Payment Escrow
          </span>
        </h1>
        <p className="text-neutral-300 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Producers send money into escrow; Leaked Liability tracks, verifies, 
          and confirms when crew have been paid. No excuses. No "lost invoices". Never again.
        </p>
      </header>

      <section className="grid gap-5 md:grid-cols-2">
        <button
          onClick={() => navigate("/escrow/initiate")}
          className="group relative bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/30 rounded-xl px-6 py-6 text-left hover:border-green-400 hover:scale-[1.02] hover:shadow-2xl hover:shadow-green-500/20 transition-all duration-300 flex flex-col justify-between gap-4"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-lg">Send Payment Through Escrow</span>
            <ArrowRight className="w-5 h-5 text-green-500 group-hover:translate-x-2 transition-transform duration-300" />
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">
            For producers and companies who want to settle outstanding payments 
            through a neutral third party.
          </p>
        </button>

        <button
          onClick={() => navigate("/escrow/redeem")}
          className="group relative bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/30 rounded-xl px-6 py-6 text-left hover:border-emerald-400 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 flex flex-col justify-between gap-4"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-lg">Redeem Escrow Code</span>
            <CreditCard className="w-5 h-5 text-emerald-500 group-hover:translate-x-2 transition-transform duration-300" />
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Already have an escrow payment code from Leaked Liability? Enter it 
            here to go straight to the secure payment page.
          </p>
        </button>
      </section>

      <section className="bg-green-500/5 border border-green-500/30 rounded-xl p-6 space-y-4 text-sm">
        <h2 className="font-semibold text-lg text-green-400">How Escrow Works</h2>
        <ul className="space-y-3 text-neutral-300">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Producer submits payment details and pays into escrow.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Funds sit in a neutral account while we verify the claim.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Once crew confirms payment, the debt is cleared in our system.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <span>Every step is logged and timestamped for receipts and disputes.</span>
          </li>
        </ul>
      </section>
    </div>
    <Footer />
    </>
  );
}
