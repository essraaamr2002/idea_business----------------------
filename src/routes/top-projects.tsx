import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Trophy } from "lucide-react";

const PROJECTS = [
  { rank: 1, name: "مطعم نخبة", roi: "+320%", sector: "أغذية" },
  { rank: 2, name: "أكاديمية تك", roi: "+260%", sector: "تعليم" },
  { rank: 3, name: "فاشن لاب", roi: "+240%", sector: "موضة" },
  { rank: 4, name: "كلاود سيف", roi: "+195%", sector: "تقنية" },
  { rank: 5, name: "هيلث+", roi: "+170%", sector: "صحة" },
];

export const Route = createFileRoute("/top-projects")({
  head: () => ({
    meta: [
      { title: "أفضل المشاريع أداءً | IDEA BUSINESS" },
      { name: "description", content: "تصنيف المشاريع الأعلى عائدًا على المنصة." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Trophy className="h-6 w-6" />} title="أفضل المشاريع أداءً" subtitle="ترتيب حسب العائد على الاستثمار." />
        <ul className="divide-y divide-border rounded-xl border border-border bg-card/60">
          {PROJECTS.map((p) => (
            <li key={p.rank} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">#{p.rank}</span>
              <div className="flex-1">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.sector}</div>
              </div>
              <div className="font-bold text-success">{p.roi}</div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  ),
});
