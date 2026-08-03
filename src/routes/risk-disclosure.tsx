import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/risk-disclosure")({
  head: () => ({ meta: [
    { title: "إفصاح المخاطر | IDEA BUSINESS" },
    { name: "description", content: "تنبيهات هامة حول مخاطر الاستثمار في المشاريع." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<AlertTriangle className="h-6 w-6" />} title="إفصاح المخاطر" subtitle="اقرأ بعناية قبل اتخاذ أي قرار." />
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-7">
            الاستثمار في المشاريع الناشئة ينطوي على مخاطر عالية، بما في ذلك خسارة كامل رأس المال. لا تستثمر إلا ما يمكنك تحمّل خسارته.
          </div>
          {["مخاطر السيولة: قد يستغرق بيع الحصص وقتاً.","مخاطر السوق: تتأثر القيمة بالظروف الاقتصادية.","مخاطر التشغيل: قد تفشل المشاريع لأسباب إدارية.","مخاطر تنظيمية: قد تتغير الأنظمة المالية."].map((t) => (
            <div key={t} className="rounded-2xl border border-border bg-card/60 p-4 text-sm">{t}</div>
          ))}
        </div>
      </main>
    </div>
  ),
});
