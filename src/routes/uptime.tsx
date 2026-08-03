import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Activity } from "lucide-react";

const ENDPOINTS = [
  { name: "Web App", status: "operational" },
  { name: "Auth API", status: "operational" },
  { name: "Payments", status: "operational" },
  { name: "Search Index", status: "degraded" },
  { name: "Realtime", status: "operational" },
];

const color = (s: string) => s === "operational" ? "bg-emerald-500" : s === "degraded" ? "bg-amber-500" : "bg-red-500";
const label = (s: string) => s === "operational" ? "يعمل" : s === "degraded" ? "أداء متدنٍ" : "متوقف";

export const Route = createFileRoute("/uptime")({
  head: () => ({
    meta: [
      { title: "حالة الخدمة | IDEA BUSINESS" },
      { name: "description", content: "نظرة حية على حالة خدمات المنصة." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader icon={<Activity className="h-6 w-6" />} title="حالة الخدمة" subtitle="مراقبة حية لجميع الأنظمة." />
        <ul className="divide-y divide-border rounded-xl border border-border bg-card/60">
          {ENDPOINTS.map((e) => (
            <li key={e.name} className="flex items-center justify-between px-4 py-3">
              <span className="font-medium">{e.name}</span>
              <span className="inline-flex items-center gap-2 text-sm">
                <span className={`h-2 w-2 rounded-full ${color(e.status)}`} />
                {label(e.status)}
              </span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  ),
});
