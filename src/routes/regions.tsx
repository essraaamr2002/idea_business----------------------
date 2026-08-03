import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { MapPin } from "lucide-react";

const REGIONS = [
  { name: "الرياض", projects: 87, share: "37%" },
  { name: "جدة", projects: 54, share: "23%" },
  { name: "الدمام والشرقية", projects: 41, share: "17%" },
  { name: "مكة", projects: 22, share: "9%" },
  { name: "المدينة", projects: 15, share: "6%" },
  { name: "أخرى", projects: 18, share: "8%" },
];

export const Route = createFileRoute("/regions")({
  head: () => ({
    meta: [
      { title: "المناطق | IDEA BUSINESS" },
      { name: "description", content: "توزيع المشاريع جغرافيًا داخل المملكة." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<MapPin className="h-6 w-6" />} title="المشاريع حسب المنطقة" subtitle="توزيع جغرافي شامل للمشاريع." />
        <ul className="divide-y divide-border rounded-xl border border-border bg-card/60">
          {REGIONS.map((r) => (
            <li key={r.name} className="flex items-center justify-between px-4 py-3">
              <span className="font-medium">{r.name}</span>
              <span className="text-sm text-muted-foreground">{r.projects} مشروع · {r.share}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  ),
});
