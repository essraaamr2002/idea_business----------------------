import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

import logoAsset from "@/assets/idea-business-logo.asset.json";

export function BrandPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div dir="rtl" className="ib-circuit-bg min-h-screen text-ib-silver">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[oklch(0.16_0.06_260_/_0.82)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoAsset.url} alt="IDEA BUSINESS" className="h-10 w-10 rounded-md object-cover ring-1 ring-ib-cyan/30" />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-wider text-ib-cyan-soft">IDEA BUSINESS</p>
              <p className="text-[11px] text-ib-silver/70">IDEA BUSINESS</p>
            </div>
          </Link>
          <nav className="hidden gap-6 text-sm font-medium md:flex">
            <Link to="/" className="transition hover:text-ib-cyan">
              الرئيسية
            </Link>
            <Link to="/community" activeProps={{ className: "text-ib-cyan" }} className="transition hover:text-ib-cyan">
              My Special Packages
            </Link>
          </nav>
          <Link
            to="/auth"
            className="rounded-lg bg-[image:var(--ib-grad-cyan)] px-4 py-2 text-sm font-bold text-[oklch(0.16_0.06_260)] shadow-[var(--ib-glow-cyan)] transition hover:opacity-90"
          >
            ابدأ فكرتك اليوم
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-6 py-20 text-center md:py-28">
          <div className="absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-3xl rounded-full bg-ib-cyan/20 blur-3xl" />
          <img src={logoAsset.url} alt="IDEA BUSINESS logo" className="mx-auto h-20 w-20 rounded-2xl object-cover ring-1 ring-ib-cyan/40 ib-glow-cyan" />
          <p className="mt-6 text-sm font-bold tracking-[0.3em] text-ib-cyan-soft">{eyebrow}</p>
          <h1 className="mx-auto mt-4 max-w-4xl text-3xl font-bold leading-snug text-ib-silver md:text-5xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-ib-silver/75">{description}</p>
        </section>
        {children}
      </main>

      <footer className="border-t border-white/5 bg-black/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row">
          <div className="flex items-center gap-3 text-xs text-ib-silver/60">
            <Twitter className="h-4 w-4" />
            <Facebook className="h-4 w-4" />
            <Instagram className="h-4 w-4" />
            <Youtube className="h-4 w-4" />
            <span>@ideabusiness.com</span>
          </div>
          <div className="flex items-center gap-2 text-center">
            <img src={logoAsset.url} alt="" className="h-7 w-7 rounded object-cover" />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-wider text-ib-cyan-soft">IDEA BUSINESS</p>
              <p className="text-[10px] text-ib-silver/60">IDEA BUSINESS</p>
            </div>
          </div>
          <p className="text-[11px] text-ib-silver/60">Privacy Policy · Legal · Links</p>
        </div>
      </footer>
    </div>
  );
}