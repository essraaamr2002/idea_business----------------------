import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Map } from "lucide-react";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "خارطة الطريق | IDEA BUSINESS" },
      { name: "description", content: "ما الذي نعمل عليه وما القادم في IDEA BUSINESS." },
      { property: "og:title", content: "خارطة الطريق — IDEA BUSINESS" },
    ],
  }),
  component: RoadmapPage,
});

const ROAD: { q: string; items: { t: string; s: "done" | "now" | "next" }[] }[] = [
  { q: "Q2 2026", items: [
    { t: "إطلاق السوق الموازي", s: "done" },
    { t: "تطبيق الجوّال PWA", s: "done" },
    { t: "نظام الإحالة", s: "done" },
  ]},
  { q: "Q3 2026", items: [
    { t: "ذكاء اصطناعي لتقييم المشاريع", s: "now" },
    { t: "تقارير ضريبية تلقائية", s: "now" },
    { t: "تكامل بوابات دفع إضافية", s: "next" },
  ]},
  { q: "Q4 2026", items: [
    { t: "تطبيقات iOS/Android أصلية", s: "next" },
    { t: "صناديق استثمار قطاعية", s: "next" },
  ]},
];

const COLOR: Record<string, string> = {
  done: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  now: "bg-primary/15 text-primary border-primary/30",
  next: "bg-amber-500/15 text-amber-500 border-amber-500/30",
};
const LABEL: Record<string, string> = { done: "مكتمل", now: "قيد التطوير", next: "قادم" };

function RoadmapPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader icon={<Map className="h-6 w-6" />} title="خارطة الطريق" subtitle="رؤية شفّافة لما نبنيه." />
        <div className="space-y-6">
          {ROAD.map((r) => (
            <section key={r.q} className="rounded-2xl border border-border bg-card/60 p-5">
              <h2 className="text-lg font-black">{r.q}</h2>
              <ul className="mt-3 space-y-2">
                {r.items.map((it) => (
                  <li key={it.t} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm">
                    <span className="font-bold">{it.t}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${COLOR[it.s]}`}>{LABEL[it.s]}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
