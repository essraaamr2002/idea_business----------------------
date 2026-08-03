import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { History } from "lucide-react";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "سجل التحديثات | IDEA BUSINESS" },
      { name: "description", content: "كل التحديثات والتحسينات الأخيرة على منصة IDEA BUSINESS." },
      { property: "og:title", content: "سجل التحديثات — IDEA BUSINESS" },
    ],
  }),
  component: ChangelogPage,
});

const RELEASES: { v: string; date: string; items: string[] }[] = [
  { v: "v2.3", date: "2026-06-21", items: [
    "لوحة أوامر سريعة (Ctrl/⌘+K) وبحث شامل.",
    "صفحات: من نحن، تواصل، خارطة الطريق، سجل التحديثات.",
    "شريط تقدّم القراءة في الأخبار، أزرار مشاركة جديدة.",
    "نظام Cookies + شريط إعلانات + اشتراك بالنشرة.",
  ]},
  { v: "v2.2", date: "2026-06-20", items: [
    "السوق الموازي، نظام الإحالة، حاسبة العائد.",
    "تصدير المحفظة CSV/JSON/PDF.",
    "خريطة موقع XML وتحسينات SEO.",
  ]},
  { v: "v2.1", date: "2026-06-19", items: [
    "قسم المنازعات، صفحة الأخبار، صفحات إنجليزية.",
    "صور شخصية في بطاقات المشاريع، زر إضافة فكرة.",
  ]},
];

function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<History className="h-6 w-6" />} title="سجل التحديثات" subtitle="شفافية كاملة لما نطلقه." />
        <div className="space-y-6">
          {RELEASES.map((r) => (
            <article key={r.v} className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-black text-primary">{r.v}</h2>
                <span className="text-xs text-muted-foreground">{r.date}</span>
              </div>
              <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-foreground/90">
                {r.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
