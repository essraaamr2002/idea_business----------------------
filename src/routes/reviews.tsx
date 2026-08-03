import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Rating } from "@/components/Rating";
import { MessageSquare } from "lucide-react";

const REVIEWS = [
  { name: "فاطمة م.", rate: 5, txt: "تجربة رائعة وسهلة، حصلت على أول استثمار خلال 5 دقائق." },
  { name: "عبدالله ك.", rate: 4, txt: "منصة احترافية، أتمنى توسيع خيارات الدفع." },
  { name: "هند س.", rate: 5, txt: "الدعم الفني سريع وودود جدًا." },
  { name: "ياسر ع.", rate: 5, txt: "أفضل منصة سعودية للتمويل الجماعي حتى الآن." },
];

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "آراء العملاء | IDEA BUSINESS" },
      { name: "description", content: "ماذا يقول المستثمرون والمؤسسون عن منصة IDEA BUSINESS." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<MessageSquare className="h-6 w-6" />} title="آراء عملائنا" subtitle="تقييمات حقيقية من مستخدمين موثقين." />
        <div className="space-y-3">
          {REVIEWS.map((r, i) => (
            <article key={i} className="rounded-xl border border-border bg-card/60 p-4">
              <div className="flex items-center justify-between">
                <strong>{r.name}</strong>
                <Rating value={r.rate} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{r.txt}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  ),
});
