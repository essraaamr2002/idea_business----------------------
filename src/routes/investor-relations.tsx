import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/investor-relations")({
  head: () => ({ meta: [
    { title: "علاقات المستثمرين | IDEA BUSINESS" },
    { name: "description", content: "معلومات لمساهمي وشركاء IDEA BUSINESS." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<TrendingUp className="h-6 w-6" />} title="علاقات المستثمرين" subtitle="شفافية ونمو مستدام." />
        <div className="grid gap-4 md:grid-cols-3">
          {[{l:"إجمالي الممول",v:"+ 38M ر.س"},{l:"عدد المستثمرين",v:"24,500"},{l:"المشاريع النشطة",v:"180+"}].map((k) => (
            <div key={k.l} className="rounded-2xl border border-border bg-card/60 p-5 text-center">
              <div className="text-xs text-muted-foreground">{k.l}</div>
              <div className="mt-1 text-2xl font-black text-primary">{k.v}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-card/60 p-5 text-sm">
          للاستفسارات: <a href="mailto:ir@busniss.org" className="font-extrabold text-primary hover:underline">ir@busniss.org</a>
        </div>
      </main>
    </div>
  ),
});
