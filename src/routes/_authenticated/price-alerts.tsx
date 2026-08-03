import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Bell, Trash2, Plus } from "lucide-react";
import { listPriceAlerts, addPriceAlert, deletePriceAlert } from "@/lib/mega-pack-2.functions";

export const Route = createFileRoute("/_authenticated/price-alerts")({
  head: () => ({ meta: [{ title: "تنبيهات الأسعار | IDEA BUSINESS" }] }),
  component: PriceAlertsPage,
});

function PriceAlertsPage() {
  const listFn = useServerFn(listPriceAlerts);
  const addFn = useServerFn(addPriceAlert);
  const delFn = useServerFn(deletePriceAlert);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["price-alerts"], queryFn: () => listFn() });
  const [pid, setPid] = useState("");
  const [cond, setCond] = useState<"above" | "below">("above");
  const [val, setVal] = useState("");
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader icon={<Bell className="h-6 w-6" />} title="تنبيهات الأسعار" subtitle="اضبط تنبيهات فورية عند وصول السهم لسعر محدد." />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!pid || !val) return;
            await addFn({ data: { project_id: pid, condition: cond, target_value: Number(val) } });
            setPid(""); setVal("");
            qc.invalidateQueries({ queryKey: ["price-alerts"] });
          }}
          className="mb-4 grid gap-2 rounded-2xl border border-border bg-card/60 p-3 sm:grid-cols-[1fr_auto_auto_auto]"
        >
          <input value={pid} onChange={(e) => setPid(e.target.value)} placeholder="Project UUID" className="rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
          <select value={cond} onChange={(e) => setCond(e.target.value as any)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value="above">فوق</option>
            <option value="below">تحت</option>
          </select>
          <input value={val} onChange={(e) => setVal(e.target.value)} type="number" step="0.01" placeholder="السعر" className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
          <button className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground"><Plus className="h-4 w-4" />إضافة</button>
        </form>
        <div className="space-y-2">
          {(data?.items ?? []).map((a: any) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-3">
              <div>
                <div className="text-sm font-bold">{a.projects?.name || a.project_id}</div>
                <div className="text-xs text-muted-foreground">
                  {a.condition === "above" ? "≥" : "≤"} {a.target_value} — سعر حالي {a.projects?.current_price ?? "—"}
                  {a.is_triggered && <span className="ms-2 rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-500">تم التفعيل</span>}
                </div>
              </div>
              <button onClick={async () => { await delFn({ data: { id: a.id } }); qc.invalidateQueries({ queryKey: ["price-alerts"] }); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {data && data.items.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">لا توجد تنبيهات بعد.</div>}
        </div>
      </main>
    </div>
  );
}
