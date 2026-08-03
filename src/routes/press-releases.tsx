import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Megaphone } from "lucide-react";

const RELEASES = [
  { d: "2026-06-15", t: "IDEA BUSINESS تطلق السوق الموازي للحصص" },
  { d: "2026-05-02", t: "شراكة مع مزود مدفوعات إقليمي رئيسي" },
  { d: "2026-03-18", t: "إطلاق برنامج الإحالة بمكافآت فورية" },
];

export const Route = createFileRoute("/press-releases")({
  head: () => ({ meta: [
    { title: "البيانات الصحفية | IDEA BUSINESS" },
    { name: "description", content: "أحدث البيانات الصحفية والإعلانات الرسمية." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Megaphone className="h-6 w-6" />} title="البيانات الصحفية" subtitle="إعلاناتنا الرسمية." />
        <ul className="space-y-2">
          {RELEASES.map((r) => (
            <li key={r.t} className="flex items-center justify-between rounded-2xl border border-border bg-card/60 p-4">
              <span className="text-sm font-bold">{r.t}</span>
              <span className="text-xs text-muted-foreground">{r.d}</span>
            </li>
          ))}
        </ul>
      </main>
    </div>
  ),
});
