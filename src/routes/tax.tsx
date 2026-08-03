import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Receipt, Download } from "lucide-react";

const YEARS = [2025, 2024, 2023];

export const Route = createFileRoute("/tax")({
  head: () => ({ meta: [
    { title: "التقارير الضريبية | IDEA BUSINESS" },
    { name: "description", content: "نزّل ملخصاتك الضريبية السنوية بسهولة." },
  ]}),
  component: TaxPage,
});

function TaxPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Receipt className="h-6 w-6" />} title="التقارير الضريبية" subtitle="ملخصات سنوية جاهزة للتحميل." />
        <ul className="space-y-2">
          {YEARS.map((y) => (
            <li key={y} className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-4 py-3">
              <span className="font-extrabold">تقرير {y}</span>
              <button
                onClick={() => toast.info(`تقرير ضريبي ${y}`, { description: "سنرسل النسخة الموثقة على بريدك خلال دقائق." })}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground hover:bg-primary/90"
              >
                <Download className="h-3.5 w-3.5" /> تحميل PDF
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
