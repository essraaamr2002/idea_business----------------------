import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { TrendingUp } from "lucide-react";
import { ROICalculator } from "@/components/ROICalculator";

export const Route = createFileRoute("/for-investors")({
  head: () => ({
    meta: [
      { title: "للمستثمرين | IDEA BUSINESS" },
      { name: "description", content: "استثمر في مشاريع موثّقة مع ضمانات قانونية، تنويع آمن، وسوق ثانوي لبيع الحصص." },
      { property: "og:title", content: "للمستثمرين — IDEA BUSINESS" },
    ],
  }),
  component: InvestorsPage,
});

function InvestorsPage() {
  const bullets = [
    "فرص مدروسة مع تقييم ذكي وتقارير دورية.",
    "ضمانات قانونية تحمي رأس مالك.",
    "سوق موازي لبيع حصصك متى أردت.",
    "محفظة آمنة وتقارير ضريبية.",
  ];
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader icon={<TrendingUp className="h-6 w-6" />} title="للمستثمرين" subtitle="نوّع محفظتك في فرص حقيقية بضمانات قانونية." />
        <div className="grid gap-6 md:grid-cols-2">
          <ul className="space-y-2 rounded-2xl border border-border bg-card/60 p-5">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" /> {b}
              </li>
            ))}
            <div className="pt-3">
              <Link to="/" className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary/90">استكشف الفرص</Link>
            </div>
          </ul>
          <ROICalculator />
        </div>
      </main>
    </div>
  );
}
