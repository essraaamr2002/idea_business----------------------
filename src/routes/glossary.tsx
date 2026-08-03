import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { BookOpen, Search } from "lucide-react";

export const Route = createFileRoute("/glossary")({
  head: () => ({
    meta: [
      { title: "المسرد | IDEA BUSINESS" },
      { name: "description", content: "مصطلحات الاستثمار والتمويل الجماعي مشروحة ببساطة." },
      { property: "og:title", content: "المسرد — IDEA BUSINESS" },
    ],
  }),
  component: GlossaryPage,
});

const TERMS: { t: string; d: string }[] = [
  { t: "التمويل الجماعي", d: "جمع رأس مال من عدد كبير من المستثمرين بمبالغ صغيرة لكل مشروع." },
  { t: "حصة المشروع", d: "نسبة ملكية يحصل عليها المستثمر مقابل مساهمته في رأس المال." },
  { t: "السوق الموازي", d: "سوق ثانوي يتيح بيع وشراء حصص المشاريع بين المستثمرين." },
  { t: "KYC", d: "إجراءات التحقق من هوية العميل لمنع الاحتيال." },
  { t: "ROI", d: "العائد على الاستثمار، مقياس لربحية الاستثمار." },
  { t: "Escrow", d: "حساب ضمان يحتفظ بالأموال حتى تتحقق شروط الصفقة." },
  { t: "Cap Table", d: "جدول يوضح هيكل ملكية المشروع بين المؤسسين والمستثمرين." },
  { t: "Valuation", d: "تقييم القيمة السوقية للمشروع قبل أو بعد الجولة." },
  { t: "Pre-money", d: "تقييم المشروع قبل ضخ التمويل الجديد." },
  { t: "Post-money", d: "تقييم المشروع بعد ضخ التمويل." },
];

function GlossaryPage() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => TERMS.filter((x) => (x.t + x.d).toLowerCase().includes(q.toLowerCase())), [q]);
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<BookOpen className="h-6 w-6" />} title="المسرد" subtitle="مصطلحات الاستثمار مشروحة ببساطة." />
        <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-card/60 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن مصطلح…" className="w-full bg-transparent text-sm outline-none" />
        </div>
        <dl className="divide-y divide-border rounded-2xl border border-border bg-card/60">
          {filtered.map((x) => (
            <div key={x.t} className="px-4 py-3">
              <dt className="text-sm font-black text-foreground">{x.t}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{x.d}</dd>
            </div>
          ))}
          {filtered.length === 0 ? <div className="px-4 py-6 text-center text-sm text-muted-foreground">لا توجد نتائج</div> : null}
        </dl>
      </main>
    </div>
  );
}
