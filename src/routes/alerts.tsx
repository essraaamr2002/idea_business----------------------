import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Bell, Plus, Trash2 } from "lucide-react";

type Alert = { id: string; project: string; condition: "above" | "below"; price: number };

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "التنبيهات | IDEA BUSINESS" },
      { name: "description", content: "أنشئ تنبيهات سعرية لمشاريعك المفضلة." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: "1", project: "مطعم نخبة", condition: "above", price: 120 },
  ]);
  const [project, setProject] = useState("");
  const [price, setPrice] = useState(0);
  const [cond, setCond] = useState<"above" | "below">("above");

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Bell className="h-6 w-6" />} title="تنبيهات الأسعار" subtitle="نبهنا عند بلوغ سعر الحصة هدفك." />
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <div className="grid gap-2 sm:grid-cols-[1fr_120px_120px_auto]">
            <input value={project} onChange={e => setProject(e.target.value)} placeholder="اسم المشروع" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <select value={cond} onChange={e => setCond(e.target.value as "above" | "below")} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="above">أعلى من</option>
              <option value="below">أقل من</option>
            </select>
            <input type="number" value={price || ""} onChange={e => setPrice(Number(e.target.value))} placeholder="السعر" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <button
              onClick={() => { if (project && price) { setAlerts([...alerts, { id: Date.now().toString(), project, condition: cond, price }]); setProject(""); setPrice(0); }}}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            ><Plus className="h-4 w-4" /> أضف</button>
          </div>
          <ul className="mt-4 space-y-2">
            {alerts.map(a => (
              <li key={a.id} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
                <span><strong>{a.project}</strong> — {a.condition === "above" ? "أعلى من" : "أقل من"} {a.price} SAR</span>
                <button onClick={() => setAlerts(alerts.filter(x => x.id !== a.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {alerts.length === 0 && <li className="text-center text-sm text-muted-foreground">لا توجد تنبيهات.</li>}
          </ul>
        </div>
      </main>
    </div>
  );
}
