import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Video, Calendar } from "lucide-react";

const WEBINARS = [
  { title: "مستقبل التمويل الجماعي في السعودية", date: "2026-07-05", host: "د. سارة العنزي" },
  { title: "كيف تختار مشروعك الاستثماري الأول", date: "2026-07-19", host: "أحمد القحطاني" },
  { title: "إدارة المحفظة الاستثمارية", date: "2026-08-02", host: "م. ليلى الحربي" },
];

export const Route = createFileRoute("/webinars")({
  head: () => ({
    meta: [
      { title: "الندوات | IDEA BUSINESS" },
      { name: "description", content: "ندوات مباشرة مع خبراء الاستثمار وريادة الأعمال." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Video className="h-6 w-6" />} title="الندوات القادمة" subtitle="انضم لخبراء الاستثمار في جلسات مباشرة." />
        <div className="space-y-3">
          {WEBINARS.map((w, i) => (
            <article key={i} className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-4">
              <div>
                <h3 className="font-bold">{w.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{w.host}</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs text-primary">
                <Calendar className="h-3 w-3" /> {w.date}
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  ),
});
