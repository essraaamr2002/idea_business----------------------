import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Download } from "lucide-react";

export const Route = createFileRoute("/export-data")({
  head: () => ({
    meta: [
      { title: "تصدير بياناتي | IDEA BUSINESS" },
      { name: "description", content: "اطلب نسخة كاملة من بياناتك بصيغة JSON أو CSV." },
    ],
  }),
  component: ExportDataPage,
});

function exportFile(label: string) {
  const isCsv = label.includes("CSV");
  const filename = label.replace(/\s+\(.+\)/, "").replace(/\s+/g, "_") + (isCsv ? ".csv" : ".json");
  const payload = isCsv
    ? "نوع,تاريخ,قيمة\nطلب,2026-06-22,—\n"
    : JSON.stringify({ requestedAt: new Date().toISOString(), type: label, note: "سيتم تجهيز نسخة كاملة وإرسالها إلى بريدك." }, null, 2);
  const blob = new Blob([payload], { type: isCsv ? "text/csv" : "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast.success("بدأ التحميل", { description: filename });
}

function ExportDataPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader icon={<Download className="h-6 w-6" />} title="تصدير بياناتي" subtitle="حقك في الحصول على نسخة من بياناتك." />
        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-3">
          {["محفظتي وحركاتها (CSV)", "استثماراتي (JSON)", "ملفي الشخصي (JSON)", "سجل الرسائل (JSON)"].map((t, i) => (
            <button
              key={i}
              onClick={() => exportFile(t)}
              className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
            >
              <span>{t}</span>
              <Download className="h-4 w-4" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
