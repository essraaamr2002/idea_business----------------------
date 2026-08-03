import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Briefcase } from "lucide-react";

const PLAYS = [
  { name: "البداية الآمنة", desc: "20% نقد، 60% مشاريع منخفضة المخاطر، 20% متوسطة." },
  { name: "النمو المتوازن", desc: "10% نقد، 40% منخفضة، 35% متوسطة، 15% مرتفعة." },
  { name: "العدواني", desc: "5% نقد، 20% منخفضة، 35% متوسطة، 40% مرتفعة." },
];

export const Route = createFileRoute("/playbooks")({
  head: () => ({
    meta: [
      { title: "نماذج المحافظ | IDEA BUSINESS" },
      { name: "description", content: "نماذج جاهزة لتوزيع محفظتك حسب أهدافك." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Briefcase className="h-6 w-6" />} title="نماذج المحافظ الجاهزة" subtitle="ابدأ من نموذج مجرّب ثم خصصه." />
        <div className="grid gap-4 sm:grid-cols-3">
          {PLAYS.map((p) => (
            <div key={p.name} className="rounded-2xl border border-border bg-card/60 p-5">
              <h3 className="font-bold">{p.name}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  ),
});
