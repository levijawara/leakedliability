import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function Results() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 py-20">
          <h1 className="text-6xl font-black text-center mb-8">💰RESULTS💰</h1>
          <p className="text-center text-muted-foreground text-xl">
            Coming soon: Real success stories and concrete outcomes.
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
