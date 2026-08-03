import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { BarChart3, Download } from "lucide-react";

const REPORTS = [
  { title: "تقرير الربع الثاني 2026", size: "2.4 MB", date: "2026-06-30" },
  { title: "تقرير اتجاهات التمويل الجماعي", size: "1.1 MB", date: "2026-05-15" },
  { title: "نظرة على قطاع التقنية المالية", size: "3.7 MB", date: "2026-04-01" },
];

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "التقارير | IDEA BUSINESS" },
      { name: "description", content: "تقارير دورية حول السوق والاستثمار والمنصة." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<BarChart3 className="h-6 w-6" />} title="التقارير والأبحاث" subtitle="بيانات وتحليلات السوق بشكل دوري." />
        <ul className="divide-y divide-border rounded-xl border border-border bg-card/60">
          {REPORTS.map((r, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground">{r.date} · {r.size}</div>
              </div>
              <button
                onClick={() => toast.info("جاري تجهيز التقرير", { description: r.title })}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <Download className="h-4 w-4" /> تحميل
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
