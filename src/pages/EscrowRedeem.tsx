import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function EscrowRedeem() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    navigate(`/pay/${trimmed}`);
  };

  return (
    <>
      <Navigation />
      <div className="max-w-md mx-auto px-4 py-10 pt-24 md:pt-28 space-y-4">
      <h1 className="text-2xl font-semibold">Redeem Escrow Code</h1>
      <p className="text-sm text-muted-foreground">
        Enter the escrow payment code you received from Leaked Liability to 
        view and complete the payment.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Escrow code"
          className="bg-background border border-input rounded-md px-3 py-2 text-sm w-full"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Continue
        </button>
      </form>
      <Footer />
      </div>
    </>
  );
}
