import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Lightbulb, Download } from "lucide-react";

export const Route = createFileRoute("/thesis")({
  head: () => ({ meta: [
    { title: "أطروحة الاستثمار | IDEA BUSINESS" },
    { name: "description", content: "ابنِ أطروحة استثمارية واضحة في دقائق." },
  ]}),
  component: () => {
    const [f, setF] = useState({ goal: "", sector: "", horizon: "", risk: "متوسط", checks: "" });
    const u = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-3xl px-4 py-10">
          <PageHeader icon={<Lightbulb className="h-6 w-6" />} title="أطروحة الاستثمار" subtitle="وضوح الفكر يصنع قرارات أفضل." />
          <div className="grid gap-4 md:grid-cols-2">
            <input placeholder="هدفي" value={f.goal} onChange={u("goal")} className="rounded-md border border-border bg-card/60 px-3 py-2 text-sm" />
            <input placeholder="القطاع المفضل" value={f.sector} onChange={u("sector")} className="rounded-md border border-border bg-card/60 px-3 py-2 text-sm" />
            <input placeholder="الأفق الزمني" value={f.horizon} onChange={u("horizon")} className="rounded-md border border-border bg-card/60 px-3 py-2 text-sm" />
            <select value={f.risk} onChange={u("risk")} className="rounded-md border border-border bg-card/60 px-3 py-2 text-sm">
              <option>منخفض</option><option>متوسط</option><option>عالي</option>
            </select>
            <textarea placeholder="معايير الاختيار (شركات بربحية، نمو سنوي > X…)" value={f.checks} onChange={u("checks")} rows={4} className="md:col-span-2 rounded-md border border-border bg-card/60 px-3 py-2 text-sm" />
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-card/60 p-5">
            <h3 className="text-sm font-black">معاينة الأطروحة</h3>
            <p className="mt-2 text-sm leading-7 text-foreground/90">
              أستثمر بهدف <b>{f.goal || "—"}</b> في قطاع <b>{f.sector || "—"}</b> لمدّة <b>{f.horizon || "—"}</b> بمستوى مخاطرة <b>{f.risk}</b>.
              {f.checks ? <> معاييري: {f.checks}</> : null}
            </p>
            <button onClick={() => { const blob = new Blob([JSON.stringify(f, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "investment-thesis.json"; a.click(); }} className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground hover:bg-primary/90">
              <Download className="h-3.5 w-3.5" /> حفظ
            </button>
          </div>
        </main>
      </div>
    );
  },
});
