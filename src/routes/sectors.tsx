import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Tag } from "@/components/Tag";
import { Layers } from "lucide-react";

const SECTORS = [
  { name: "التقنية المالية", count: 42, growth: "+18%" },
  { name: "الأغذية والمشروبات", count: 38, growth: "+12%" },
  { name: "التعليم", count: 27, growth: "+25%" },
  { name: "العقار", count: 19, growth: "+8%" },
  { name: "الصحة", count: 22, growth: "+30%" },
  { name: "اللوجستيات", count: 15, growth: "+14%" },
];

export const Route = createFileRoute("/sectors")({
  head: () => ({
    meta: [
      { title: "القطاعات | IDEA BUSINESS" },
      { name: "description", content: "تصفّح المشاريع حسب القطاع وراقب نمو كل قطاع." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader icon={<Layers className="h-6 w-6" />} title="القطاعات" subtitle="استكشف الفرص حسب القطاع." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTORS.map((s) => (
            <div key={s.name} className="rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{s.name}</h3>
                <Tag tone="success">{s.growth}</Tag>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{s.count} مشروع</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  ),
});
