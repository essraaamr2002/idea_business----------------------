import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Gift } from "lucide-react";

const PERKS = [
  { tier: "فضي", min: "10K SAR", perks: ["ندوات حصرية", "تقارير شهرية"] },
  { tier: "ذهبي", min: "50K SAR", perks: ["مدير علاقات", "وصول مبكر للمشاريع", "حسومات الرسوم 25%"] },
  { tier: "بلاتيني", min: "250K SAR", perks: ["استشارات مخصصة", "دعوات حصرية", "إعفاء كامل من الرسوم"] },
];

export const Route = createFileRoute("/vip")({
  head: () => ({
    meta: [
      { title: "نادي كبار المستثمرين | IDEA BUSINESS" },
      { name: "description", content: "مزايا حصرية لكبار المستثمرين على المنصة." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader icon={<Gift className="h-6 w-6" />} title="نادي VIP" subtitle="مزايا حصرية للمستثمرين الكبار." />
        <div className="grid gap-4 sm:grid-cols-3">
          {PERKS.map((p) => (
            <div key={p.tier} className="rounded-2xl border border-primary/20 bg-card/60 p-5">
              <h3 className="text-lg font-bold">{p.tier}</h3>
              <p className="mt-1 text-xs text-muted-foreground">من {p.min}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {p.perks.map((x) => <li key={x}>• {x}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  ),
});
