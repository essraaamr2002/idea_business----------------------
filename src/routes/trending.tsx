import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Flame } from "lucide-react";

export const Route = createFileRoute("/trending")({
  head: () => ({ meta: [
    { title: "الأكثر رواجاً | IDEA BUSINESS" },
    { name: "description", content: "أكثر المشاريع تمويلاً وتفاعلاً هذا الأسبوع." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Flame className="h-6 w-6" />} title="الأكثر رواجاً" subtitle="رصد لحظي للمشاريع الساخنة." />
        <div className="rounded-2xl border border-border bg-card/60 p-6 text-center">
          <p className="text-sm text-muted-foreground">قريباً — مرتبط مباشرة بحركة التمويل.</p>
          <Link to="/" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary/90">تصفّح المشاريع</Link>
        </div>
      </main>
    </div>
  ),
});
