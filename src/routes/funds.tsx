import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ShieldCheck } from "lucide-react";

const FUNDS = [
  { name: "صندوق التقنية الناشئة", aum: "12M SAR", roi: "+22%", risk: "متوسط" },
  { name: "صندوق التجزئة والاستهلاك", aum: "8M SAR", roi: "+15%", risk: "منخفض" },
  { name: "صندوق العقار التشاركي", aum: "20M SAR", roi: "+9%", risk: "منخفض" },
];

export const Route = createFileRoute("/funds")({
  head: () => ({
    meta: [
      { title: "الصناديق الاستثمارية | IDEA BUSINESS" },
      { name: "description", content: "تنوع تلقائي عبر صناديق مُدارة من خبراء المنصة." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader icon={<ShieldCheck className="h-6 w-6" />} title="الصناديق المُدارة" subtitle="تنوّع تلقائي يديره خبراء." />
        <div className="grid gap-4 sm:grid-cols-3">
          {FUNDS.map((f) => (
            <div key={f.name} className="rounded-2xl border border-border bg-card/60 p-5">
              <h3 className="font-bold">{f.name}</h3>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div><div className="text-muted-foreground">الأصول</div><div className="mt-0.5 font-bold">{f.aum}</div></div>
                <div><div className="text-muted-foreground">العائد</div><div className="mt-0.5 font-bold text-success">{f.roi}</div></div>
                <div><div className="text-muted-foreground">المخاطر</div><div className="mt-0.5 font-bold">{f.risk}</div></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  ),
});
