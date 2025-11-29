import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Loader2 } from "lucide-react";

const schema = z.object({
  producerName: z.string().min(2, "Producer name required"),
  companyName: z.string().optional(),
  producerEmail: z.string().email("Valid email required"),
  crewName: z.string().min(2, "Crew name required"),
  crewEmail: z.string().email("Valid email required"),
  projectName: z.string().min(2, "Project name required"),
  reportId: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be positive"),
  note: z.string().optional(),
});

export default function EscrowInitiate() {
  const [form, setForm] = useState({
    producerName: "",
    companyName: "",
    producerEmail: "",
    crewName: "",
    crewEmail: "",
    projectName: "",
    reportId: "",
    amount: "",
    note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse({
      ...form,
      amount: form.amount,
    });

    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }

    try {
      setLoading(true);

      const { data, error: fnError } = await supabase.functions.invoke(
        "create-producer-escrow-session",
        {
          body: parsed.data,
        }
      );

      if (fnError) throw fnError;
      if (!data || !data.paymentCode) {
        throw new Error("No payment code returned from escrow function");
      }

      navigate(`/pay/${data.paymentCode}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not start escrow payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-10 pt-24 md:pt-28">
      <h1 className="text-2xl font-semibold mb-2">Start Escrow Payment</h1>
      <p className="text-sm text-muted-foreground mb-6">
        This form creates a secure escrow payment session. We will email both 
        parties receipts once payment is complete.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Producer section */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Producer details</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              name="producerName"
              value={form.producerName}
              onChange={handleChange}
              placeholder="Producer full name *"
              className="bg-background border border-input rounded-md px-3 py-2 text-sm"
            />
            <input
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
              placeholder="Company (optional)"
              className="bg-background border border-input rounded-md px-3 py-2 text-sm"
            />
          </div>
          <input
            name="producerEmail"
            value={form.producerEmail}
            onChange={handleChange}
            placeholder="Producer email *"
            className="bg-background border border-input rounded-md px-3 py-2 text-sm w-full"
          />
        </div>

        {/* Crew section */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Crew details</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              name="crewName"
              value={form.crewName}
              onChange={handleChange}
              placeholder="Crew member full name *"
              className="bg-background border border-input rounded-md px-3 py-2 text-sm"
            />
            <input
              name="crewEmail"
              value={form.crewEmail}
              onChange={handleChange}
              placeholder="Crew member email *"
              className="bg-background border border-input rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Payment section */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Payment details</h2>
          <input
            name="projectName"
            value={form.projectName}
            onChange={handleChange}
            placeholder="Project name *"
            className="bg-background border border-input rounded-md px-3 py-2 text-sm w-full"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="Amount (USD) *"
              type="number"
              step="0.01"
              className="bg-background border border-input rounded-md px-3 py-2 text-sm"
            />
            <input
              name="reportId"
              value={form.reportId}
              onChange={handleChange}
              placeholder="Report ID (optional)"
              className="bg-background border border-input rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <textarea
          name="note"
          value={form.note}
          onChange={handleChange}
          placeholder="Optional note or context"
          className="bg-background border border-input rounded-md px-3 py-2 text-sm w-full min-h-[80px]"
        />

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{loading ? "Starting escrow..." : "Continue to secure payment"}</span>
        </button>
      </form>
      <Footer />
      </div>
    </>
  );
}
