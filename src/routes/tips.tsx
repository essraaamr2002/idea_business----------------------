import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Lightbulb } from "lucide-react";

const TIPS = [
  "نوّع محفظتك عبر 5+ قطاعات مختلفة لتقليل المخاطر.",
  "لا تستثمر مبلغًا تحتاجه خلال 6 أشهر القادمة.",
  "اقرأ نشرة الإصدار كاملة قبل أي قرار استثماري.",
  "تابع التقارير الربعية للمشاريع التي استثمرت فيها.",
  "ضع حدًا أقصى لخسارتك المقبولة قبل الدخول.",
];

export const Route = createFileRoute("/tips")({
  head: () => ({
    meta: [
      { title: "نصائح الاستثمار | IDEA BUSINESS" },
      { name: "description", content: "نصائح ذكية لتطوير استراتيجيتك الاستثمارية." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader icon={<Lightbulb className="h-6 w-6" />} title="نصائح ذكية للمستثمرين" subtitle="مبادئ بسيطة تحدث فرقًا كبيرًا." />
        <ol className="space-y-3">
          {TIPS.map((t, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-border bg-card/60 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
              <p className="text-sm leading-relaxed">{t}</p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  ),
});
