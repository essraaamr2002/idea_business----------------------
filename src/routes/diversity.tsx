import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Users } from "lucide-react";

export const Route = createFileRoute("/diversity")({
  head: () => ({
    meta: [
      { title: "التنوع والشمول | IDEA BUSINESS" },
      { name: "description", content: "التزامنا بالتنوع والشمول داخل الفريق وفي المشاريع." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Users className="h-6 w-6" />} title="التنوع والشمول" subtitle="فريق يعكس مجتمعنا، ومشاريع تخدم الجميع." />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { v: "48%", l: "نساء في الفريق" },
            { v: "12", l: "جنسيات مختلفة" },
            { v: "35%", l: "مشاريع تقودها نساء" },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card/60 p-5 text-center">
              <div className="text-3xl font-bold text-primary">{s.v}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  ),
});
