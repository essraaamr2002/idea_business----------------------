import { createFileRoute, Link } from "@tanstack/react-router";
import { LiveCounters } from "@/components/LiveCounters";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { ShieldCheck, TrendingUp, Wallet, Globe, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/en")({
  head: () => ({
    meta: [
      { title: "IDEA BUSINESS — Global Equity Crowdfunding for MENA Startups" },
      { name: "description", content: "Invest in vetted MENA startups with legal guarantees, instant share trading, and AI-driven price discovery. Global access, regional opportunity." },
      { property: "og:title", content: "IDEA BUSINESS — Global Equity Crowdfunding" },
      { property: "og:description", content: "Invest in vetted MENA startups with legal guarantees and live secondary-market trading." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://busniss.org/en" },
      { rel: "alternate", hrefLang: "en", href: "https://busniss.org/en" },
      { rel: "alternate", hrefLang: "ar", href: "https://busniss.org/" },
    ],
  }),
  component: EnPage,
});

function EnPage() {
  return (
    <div className="min-h-screen bg-background" dir="ltr">
      <main>
        <section className="gradient-hero relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 py-20 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full glass-pill px-4 py-1.5 text-xs font-extrabold text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" /> Global investors welcome
            </div>
            <h1 className="mx-auto max-w-3xl text-3xl font-black leading-tight md:text-5xl">
              Invest in vetted <span className="text-neon">MENA startups</span>
              <br />with legal guarantees & live trading.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-cyan-100/80 md:text-lg">
              IDEA BUSINESS connects global capital to founders across the Middle East. Every project is backed
              by enforceable guarantees, secondary-market liquidity, and AI-driven price discovery.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/market"><Button size="lg" className="gradient-primary border-0 font-extrabold">Browse projects <ArrowRight className="ms-1 h-4 w-4" /></Button></Link>
              <Link to="/auth"><Button size="lg" variant="outline" className="font-extrabold">Open free account</Button></Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12">
          <LiveCounters />
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12">
          <Reveal>
            <div className="grid gap-4 md:grid-cols-4">
              <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Legal guarantees" desc="Bank guarantees, promissory notes, mortgages — enforceable, before you fund." />
              <Feature icon={<TrendingUp className="h-5 w-5" />} title="Live secondary market" desc="Sell your shares anytime via our order book." />
              <Feature icon={<Wallet className="h-5 w-5" />} title="Virtual IBAN" desc="Get a dedicated account number for cross-border deposits & payouts." />
              <Feature icon={<Globe className="h-5 w-5" />} title="Global compliance" desc="KYC/AML, sanctions screening, and per-country legal counsel for disputes." />
            </div>
          </Reveal>
        </section>

        <section className="bg-foreground py-16 text-background">
          <div className="mx-auto max-w-5xl px-4 text-center">
            <h2 className="text-3xl font-black md:text-4xl">Ready to start?</h2>
            <p className="mt-3 opacity-75">One account — invest, or launch your own project.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/auth"><Button size="lg" className="gradient-primary border-0 font-extrabold">Sign up — it's free</Button></Link>
              <Link to="/"><Button size="lg" variant="outline" className="font-extrabold text-foreground">العربية</Button></Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div className="mt-3 text-lg font-extrabold">{title}</div>
      <div className="mt-1 text-sm font-medium text-muted-foreground">{desc}</div>
    </div>
  );
}
