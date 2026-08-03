import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ZakatCalculator } from "@/components/ZakatCalculator";
import { Coins } from "lucide-react";

export const Route = createFileRoute("/zakat")({
  head: () => ({
    meta: [
      { title: "حاسبة الزكاة | IDEA BUSINESS" },
      { name: "description", content: "احسب زكاة أموالك واستثماراتك بسهولة وفق النصاب الشرعي." },
      { property: "og:title", content: "حاسبة الزكاة — IDEA BUSINESS" },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader icon={<Coins className="h-6 w-6" />} title="حاسبة الزكاة" subtitle="احسب زكاة أموالك وفق النصاب الشرعي (2.5%)." />
        <ZakatCalculator />
      </main>
    </div>
  ),
});
