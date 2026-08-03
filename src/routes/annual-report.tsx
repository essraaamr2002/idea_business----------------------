import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { FileBarChart, Download } from "lucide-react";

export const Route = createFileRoute("/annual-report")({
  head: () => ({
    meta: [
      { title: "التقرير السنوي | IDEA BUSINESS" },
      { name: "description", content: "التقرير السنوي لأداء منصة IDEA BUSINESS." },
    ],
  }),
  component: AnnualReportPage,
});

function AnnualReportPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<FileBarChart className="h-6 w-6" />} title="التقرير السنوي 2025" subtitle="نظرة شاملة على أداء المنصة وإنجازاتها." />
        <div className="rounded-2xl border border-border bg-card/60 p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { v: "84M SAR", l: "إجمالي التمويل" },
              { v: "237", l: "مشاريع ممولة" },
              { v: "12,430", l: "مستثمر نشط" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-primary">{s.v}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              toast.info("جاري تجهيز التقرير", { description: "سنرسل لك نسخة PDF على بريدك خلال دقائق." });
            }}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground hover:opacity-90"
          >
            <Download className="h-4 w-4" /> تحميل التقرير الكامل (PDF)
          </button>
        </div>
      </main>
    </div>
  );
}
