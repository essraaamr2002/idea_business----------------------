import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { LayoutGrid, Cpu, Leaf, Building2, ShoppingBag, GraduationCap, Heart, Plane, Utensils } from "lucide-react";

const CATS = [
  { i: Cpu, t: "تقنية", d: "Tech & SaaS" },
  { i: Leaf, t: "بيئة وطاقة", d: "Greentech" },
  { i: Building2, t: "عقارات", d: "Real Estate" },
  { i: ShoppingBag, t: "تجارة إلكترونية", d: "E-commerce" },
  { i: GraduationCap, t: "تعليم", d: "EdTech" },
  { i: Heart, t: "صحة", d: "HealthTech" },
  { i: Plane, t: "سفر وسياحة", d: "Travel" },
  { i: Utensils, t: "أغذية", d: "F&B" },
];

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [
    { title: "تصفّح بحسب القطاع | IDEA BUSINESS" },
    { name: "description", content: "استكشف فرص الاستثمار حسب القطاع المفضل لك." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader icon={<LayoutGrid className="h-6 w-6" />} title="القطاعات" subtitle="استكشف بحسب اهتمامك." />
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {CATS.map((c) => (
            <Link key={c.t} to="/" className="group rounded-2xl border border-border bg-card/60 p-4 text-center hover:border-primary">
              <c.i className="mx-auto h-7 w-7 text-primary" />
              <div className="mt-2 font-extrabold group-hover:text-primary">{c.t}</div>
              <div className="text-xs text-muted-foreground">{c.d}</div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  ),
});
