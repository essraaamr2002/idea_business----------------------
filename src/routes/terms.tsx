import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ScrollText } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "شروط الاستخدام | IDEA BUSINESS" },
      { name: "description", content: "الشروط والأحكام التي تحكم استخدامك لمنصة IDEA BUSINESS." },
      { property: "og:title", content: "شروط الاستخدام — IDEA BUSINESS" },
    ],
  }),
  component: TermsPage,
});

const T: { h: string; p: string }[] = [
  { h: "قبول الشروط", p: "باستخدامك للمنصة فإنك توافق على هذه الشروط؛ إذا لم توافق، يرجى عدم الاستخدام." },
  { h: "الأهلية", p: "يجب أن تكون كامل الأهلية القانونية لاستخدام خدمات الاستثمار والتمويل." },
  { h: "المخاطر", p: "الاستثمار في المشاريع ينطوي على مخاطر فقدان جزء أو كامل رأس المال. اقرأ الإفصاحات بعناية." },
  { h: "المحتوى المقدّم", p: "أنت مسؤول عن صحّة المحتوى الذي ترفعه. يحق لنا إزالة أي محتوى مخالف." },
  { h: "إنهاء الحساب", p: "نحتفظ بحق تعليق أو إنهاء الحسابات المخالفة وفقاً للسياسات." },
];

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<ScrollText className="h-6 w-6" />} title="شروط الاستخدام" subtitle="اقرأ بعناية قبل استخدام المنصة." />
        <div className="space-y-5">
          {T.map((s) => (
            <section key={s.h} className="rounded-2xl border border-border bg-card/60 p-5">
              <h2 className="text-lg font-black">{s.h}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{s.p}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
