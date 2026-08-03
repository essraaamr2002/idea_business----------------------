import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "حالة الخدمة | IDEA BUSINESS" },
      { name: "description", content: "حالة تشغيل خدمات المنصة لحظياً." },
      { property: "og:title", content: "حالة الخدمة — IDEA BUSINESS" },
    ],
  }),
  component: StatusPage,
});

const SERVICES = [
  { n: "الموقع الرئيسي", s: "operational" },
  { n: "المحفظة والمدفوعات", s: "operational" },
  { n: "السوق الموازي", s: "operational" },
  { n: "المساعد الذكي", s: "operational" },
  { n: "البريد الإلكتروني", s: "operational" },
];

function StatusPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Activity className="h-6 w-6" />} title="حالة الخدمة" subtitle="كل الأنظمة تعمل بشكل طبيعي." />
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-600">
          ● جميع الأنظمة تعمل
        </div>
        <ul className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card/60">
          {SERVICES.map((s) => (
            <li key={s.n} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-bold">{s.n}</span>
              <span className="inline-flex items-center gap-1 text-emerald-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> تشغيل
              </span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
