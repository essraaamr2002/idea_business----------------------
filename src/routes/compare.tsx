import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GitCompare, Plus, X } from "lucide-react";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "مقارنة المشاريع | IDEA BUSINESS" },
      { name: "description", content: "قارن بين فرص الاستثمار جنباً إلى جنب لاتخاذ قرار مستنير." },
      { property: "og:title", content: "مقارنة المشاريع — IDEA BUSINESS" },
    ],
  }),
  component: ComparePage,
});

type Row = { name: string; target: number; raised: number; roi: number; risk: "منخفض" | "متوسط" | "عالي" };

function ComparePage() {
  const [rows, setRows] = useState<Row[]>([
    { name: "مشروع A", target: 500000, raised: 320000, roi: 18, risk: "متوسط" },
    { name: "مشروع B", target: 250000, raised: 200000, roi: 22, risk: "عالي" },
  ]);
  const update = (i: number, k: keyof Row, v: any) => setRows((r) => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row));
  const add = () => setRows((r) => [...r, { name: `مشروع ${String.fromCharCode(65 + r.length)}`, target: 100000, raised: 0, roi: 10, risk: "منخفض" }]);
  const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader icon={<GitCompare className="h-6 w-6" />} title="مقارنة المشاريع" subtitle="قارن الأرقام جنباً إلى جنب." />
        <div className="overflow-x-auto rounded-2xl border border-border bg-card/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start">المشروع</th>
                <th className="px-3 py-2 text-start">الهدف</th>
                <th className="px-3 py-2 text-start">المُجمَّع</th>
                <th className="px-3 py-2 text-start">% الإنجاز</th>
                <th className="px-3 py-2 text-start">ROI%</th>
                <th className="px-3 py-2 text-start">المخاطر</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const pct = r.target ? Math.min(100, Math.round((r.raised / r.target) * 100)) : 0;
                return (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2"><input value={r.name} onChange={(e) => update(i, "name", e.target.value)} className="w-32 bg-transparent outline-none" /></td>
                    <td className="px-3 py-2"><input type="number" value={r.target} onChange={(e) => update(i, "target", +e.target.value)} className="w-28 bg-transparent outline-none" /></td>
                    <td className="px-3 py-2"><input type="number" value={r.raised} onChange={(e) => update(i, "raised", +e.target.value)} className="w-28 bg-transparent outline-none" /></td>
                    <td className="px-3 py-2 font-bold text-primary">{pct}%</td>
                    <td className="px-3 py-2"><input type="number" value={r.roi} onChange={(e) => update(i, "roi", +e.target.value)} className="w-16 bg-transparent outline-none" /></td>
                    <td className="px-3 py-2">
                      <select value={r.risk} onChange={(e) => update(i, "risk", e.target.value as Row["risk"])} className="bg-transparent outline-none">
                        <option>منخفض</option><option>متوسط</option><option>عالي</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-end">
                      <button onClick={() => remove(i)} aria-label="حذف" className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button onClick={add} className="mt-4 inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-sm font-bold hover:border-primary">
          <Plus className="h-4 w-4" /> إضافة مشروع للمقارنة
        </button>
      </main>
    </div>
  );
}
