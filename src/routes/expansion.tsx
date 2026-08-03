import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Globe } from "lucide-react";

const PLANS = [
  { region: "دول الخليج", year: "2026 Q4", flag: "🇦🇪 🇰🇼 🇧🇭 🇶🇦 🇴🇲" },
  { region: "مصر والأردن", year: "2027 Q2", flag: "🇪🇬 🇯🇴" },
  { region: "المغرب العربي", year: "2027 Q4", flag: "🇲🇦 🇹🇳 🇩🇿" },
];

export const Route = createFileRoute("/expansion")({
  head: () => ({
    meta: [
      { title: "خطط التوسع | IDEA BUSINESS" },
      { name: "description", content: "خططنا لتوسيع المنصة إقليميًا." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Globe className="h-6 w-6" />} title="خطط التوسع الإقليمي" subtitle="من السعودية إلى المنطقة." />
        <div className="grid gap-3 sm:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.region} className="rounded-2xl border border-border bg-card/60 p-5 text-center">
              <div className="text-3xl">{p.flag}</div>
              <h3 className="mt-3 font-bold">{p.region}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{p.year}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  ),
});
