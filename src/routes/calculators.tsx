import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Calculator } from "lucide-react";
import { ROICalculator } from "@/components/ROICalculator";
import { CompoundInterestCalc } from "@/components/CompoundInterestCalc";
import { CurrencyConverter } from "@/components/CurrencyConverter";

export const Route = createFileRoute("/calculators")({
  head: () => ({ meta: [
    { title: "الحاسبات | IDEA BUSINESS" },
    { name: "description", content: "حاسبات العائد، الفائدة المركبة، والعملات لاتخاذ قرارات استثمارية أفضل." },
    { property: "og:title", content: "حاسبات الاستثمار — IDEA BUSINESS" },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader icon={<Calculator className="h-6 w-6" />} title="الحاسبات" subtitle="أدوات مالية تساعدك على اتخاذ القرار." />
        <div className="grid gap-4 md:grid-cols-2">
          <ROICalculator />
          <CompoundInterestCalc />
          <div className="md:col-span-2"><CurrencyConverter /></div>
        </div>
      </main>
    </div>
  ),
});
