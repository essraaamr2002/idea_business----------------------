import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { LineChart, TrendingUp, Users, DollarSign, Activity } from "lucide-react";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "الإحصاءات | IDEA BUSINESS" },
      { name: "description", content: "نظرة سريعة على أداء المنصة والقطاعات." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader icon={<LineChart className="h-6 w-6" />} title="الإحصاءات والتحليلات" subtitle="بيانات حية عن أداء المنصة والقطاعات الرائدة." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<DollarSign className="h-4 w-4" />} label="إجمالي التمويل" value="84M SAR" hint="منذ التأسيس" />
          <StatCard icon={<Users className="h-4 w-4" />} label="المستثمرون" value="12,430" hint="+8.2% الشهر الماضي" />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="متوسط العائد" value="18.4%" hint="آخر 12 شهرًا" />
          <StatCard icon={<Activity className="h-4 w-4" />} label="المشاريع النشطة" value="237" />
        </div>
      </main>
    </div>
  ),
});
