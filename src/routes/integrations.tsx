import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Plug } from "lucide-react";

const INTEGRATIONS = [
  { name: "Slack", desc: "إشعارات فورية لفريقك", category: "إنتاجية" },
  { name: "Zapier", desc: "وصل مع 5000+ تطبيق", category: "أتمتة" },
  { name: "Google Sheets", desc: "تصدير بياناتك تلقائيًا", category: "بيانات" },
  { name: "Notion", desc: "زامن مشاريعك ومحفظتك", category: "إنتاجية" },
  { name: "Mada", desc: "مدفوعات سعودية مباشرة", category: "مدفوعات" },
  { name: "STC Pay", desc: "محفظة رقمية محلية", category: "مدفوعات" },
];

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "التكاملات | IDEA BUSINESS" },
      { name: "description", content: "اربط IDEA BUSINESS بأدواتك المفضلة." },
    ],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader icon={<Plug className="h-6 w-6" />} title="التكاملات" subtitle="اربط منصتك بأدواتك المفضلة." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((it) => (
            <div key={it.name} className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="mb-2 inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px]">{it.category}</div>
              <h3 className="font-bold">{it.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{it.desc}</p>
              <button
                onClick={() => toast.info(`${it.name}`, { description: "سيتم إعلامك عند تفعيل هذا التكامل." })}
                className="mt-3 w-full rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
              >
                اتصل
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
