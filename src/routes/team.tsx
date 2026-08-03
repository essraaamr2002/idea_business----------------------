import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Users } from "lucide-react";

const TEAM = [
  { name: "أحمد القحطاني", role: "الرئيس التنفيذي" },
  { name: "د. سارة العنزي", role: "رئيس الاستثمار" },
  { name: "م. ليلى الحربي", role: "رئيس التقنية" },
  { name: "خالد العتيبي", role: "رئيس الامتثال" },
  { name: "نورة الزهراني", role: "رئيس التسويق" },
  { name: "محمد السبيعي", role: "رئيس العمليات" },
];

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "الفريق | IDEA BUSINESS" },
      { name: "description", content: "تعرف على الفريق وراء IDEA BUSINESS." },
      { property: "og:title", content: "الفريق — IDEA BUSINESS" },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader icon={<Users className="h-6 w-6" />} title="قيادتنا" subtitle="فريق متنوع يعمل من أجلكم." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((m) => (
            <div key={m.name} className="rounded-2xl border border-border bg-card/60 p-5 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/5" />
              <h3 className="mt-3 font-bold">{m.name}</h3>
              <p className="text-xs text-muted-foreground">{m.role}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  ),
});
