import { Navigation } from "@/components/Navigation";

export default function WhyItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center">
          WHY IT WORKS
        </h1>
        
        <p className="text-xl text-center mb-12 text-muted-foreground">
          Because no one else ever dared to make accountability contagious.
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">THE PSYCHOLOGY</h2>
            <p className="text-lg leading-relaxed">
              Humans hate three things more than paying invoices: public embarrassment, loss of status, and proof they were the problem. Leaked Liability™ (legally) weaponizes those three truths. We're not begging producers to do better, because now we don't have to. The leaderboard exposes how they actually operate. Accountability isn't enforced through any social "rules" here that every user doesn't already understand. And thanks to the efficiency of social media, reputation tends to move a lot faster than lawyers ever will.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">THE INDUSTRY</h2>
            <p className="text-lg leading-relaxed">
              Freelance film crews don't have an HR department. No payroll department, no ombudsman, no "Union Cavalry" that arrives on time. It's the Wild West, with stingers, C-stands, and flimsy wireless antennas. Every set runs on borrowed trust, and we became tired of trusting that the person cutting checks would actually cut them. When that trust breaks, you get silence, debt, and the same old "we'll pay you once the client does" songs. Leaked Liability™ turns that silence into evidence. That evidence becomes a pattern. Those patterns create public pressure. And public pressure yields payments a lot more efficiently and effectively than going to The Labor Board, or filing a report at the Small Claims counter.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">THE PRODUCERS</h2>
            <p className="text-lg leading-relaxed">
              The good ones? They'll finally have receipts proving that they're not like the rest. They care enough to do right by their crews, because they know they wouldn't have projects under their names without passionate filmmakers. The bad ones? They'll learn the same lesson every scammer learns when screenshots go viral: perception is currency. Good luck convincing someone that you're trustworthy with money once the numbers say otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">THE CREW</h2>
            <p className="text-lg leading-relaxed">
              For the first time, a lot of crew members don't have to scream into a void, hoping that dodgy producer texts them back. They can whisper into Leaked Liability™ instead—quietly, safely, and collectively. They'll watch their factual data speak louder than they ever could alone, and they can do all of it ANONYMOUSLY. We want to protect those who have never had the courage to speak out, because "show business" made them feel as though they'd just be ignored (or blacklisted).
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">THE RIPPLE EFFECT</h2>
            <p className="text-lg leading-relaxed">
              Agencies, labels, celebrities, vendors, brands; they hate chaos. When Leaked Liability™ quantifies which producers cause it, money starts rerouting itself toward those who don't. Accountability scales because fear scales, as well as respect. You've got to GIVE it, in order to GET it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">THE LEGACY</h2>
            <p className="text-lg leading-relaxed">
              Yesterday it worked because people were fed up. Today it works because productions are crewing up faster than ever, and we all need to know who we can TRUST. Tomorrow it'll work because digital memory never fades. Once the truth is public? It doesn't need permission to stay, and it never cared who said it. This isn't an attack. It's a mirror. And the longer you stare into it, the more honest the reflection becomes. We hope you don't reject the reality.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
