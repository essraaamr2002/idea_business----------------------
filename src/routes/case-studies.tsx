import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { FileText, TrendingUp } from "lucide-react";

const CASES = [
  { title: "مشروع مطاعم نمى 320% في 18 شهرًا", sector: "الأغذية", roi: "+320%" },
  { title: "منصة تعليمية حققت ربحية في 9 أشهر", sector: "التعليم", roi: "+185%" },
  { title: "علامة أزياء سعودية تتوسع خليجيًا", sector: "الموضة", roi: "+240%" },
];

export const Route = createFileRoute("/case-studies")({
  head: () => ({
    meta: [
      { title: "دراسات الحالة | IDEA BUSINESS" },
      { name: "description", content: "قصص نجاح حقيقية من مشاريع المنصة." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader icon={<FileText className="h-6 w-6" />} title="دراسات الحالة" subtitle="قصص نجاح حقيقية من مستثمرين ومؤسسين." />
        <div className="grid gap-4 sm:grid-cols-2">
          {CASES.map((c, i) => (
            <article key={i} className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{c.sector}</div>
              <h3 className="font-bold">{c.title}</h3>
              <div className="mt-3 inline-flex items-center gap-1 text-success"><TrendingUp className="h-4 w-4" /> <span className="font-bold">{c.roi}</span></div>
            </article>
          ))}
        </div>
      </main>
    </div>
  ),
});
