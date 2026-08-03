import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/whats-new")({
  head: () => ({
    meta: [
      { title: "الجديد | IDEA BUSINESS" },
      { name: "description", content: "آخر الميزات والتحديثات على المنصة." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Sparkles className="h-6 w-6" />} title="ما الجديد؟" subtitle="آخر التحديثات والميزات." />
        <div className="space-y-4">
          {[
            { v: "v5.0", t: "150+ تحسين شامل", d: "إعادة هيكلة كاملة لتجربة المستخدم، صفحات جديدة، حاسبات، تكاملات، وأكثر." },
            { v: "v4.2", t: "مساعد الذكاء الاصطناعي", d: "احصل على توصيات استثمارية مخصصة." },
            { v: "v4.1", t: "السوق الموازي", d: "اشترِ وبع حصص المشاريع بسهولة." },
          ].map((r) => (
            <article key={r.v} className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{r.v}</div>
              <h3 className="mt-2 font-bold">{r.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{r.d}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  ),
});
