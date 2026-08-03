import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Briefcase, PieChart } from "lucide-react";
import { InvestorScorecard } from "@/components/InvestorScorecard";

export const Route = createFileRoute("/portfolio")({
  head: () => ({ meta: [
    { title: "محفظتي | IDEA BUSINESS" },
    { name: "description", content: "نظرة شاملة على استثماراتك، الأداء، والتنويع." },
  ]}),
  component: () => {
    const allocation = [
      { t: "تقنية", v: 40, c: "bg-primary" },
      { t: "عقارات", v: 25, c: "bg-emerald-500" },
      { t: "تجارة إلكترونية", v: 20, c: "bg-amber-500" },
      { t: "صحة", v: 15, c: "bg-rose-500" },
    ];
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
          <PageHeader icon={<Briefcase className="h-6 w-6" />} title="محفظتي" subtitle="ملخّص أداء استثماراتك." />
          <div className="grid gap-4 md:grid-cols-3">
            {[{l:"إجمالي القيمة",v:"148,250 ر.س"},{l:"الأرباح",v:"+18,400 ر.س"},{l:"العائد %",v:"+14.2%"}].map((k) => (
              <div key={k.l} className="rounded-2xl border border-border bg-card/60 p-4">
                <div className="text-xs text-muted-foreground">{k.l}</div>
                <div className="mt-1 text-xl font-black text-primary">{k.v}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <h3 className="inline-flex items-center gap-2 text-sm font-black"><PieChart className="h-4 w-4 text-primary" /> التنويع حسب القطاع</h3>
              <div className="mt-3 space-y-2">
                {allocation.map((a) => (
                  <div key={a.t}>
                    <div className="mb-1 flex items-center justify-between text-xs"><span className="font-bold">{a.t}</span><span>{a.v}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full ${a.c}`} style={{ width: `${a.v}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <InvestorScorecard />
          </div>
        </main>
      </div>
    );
  },
});
