import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Compass } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "كيف تعمل المنصة | IDEA BUSINESS" },
      { name: "description", content: "تعرّف خطوة بخطوة كيف تطرح فكرتك، تستثمر في المشاريع، وتدير محفظتك على IDEA BUSINESS." },
      { property: "og:title", content: "كيف تعمل المنصة — IDEA BUSINESS" },
    ],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  { n: 1, t: "أنشئ حساباً", d: "تسجيل سريع وتحقق KYC لضمان الموثوقية." },
  { n: 2, t: "اكتشف المشاريع", d: "تصفّح فرص استثمارية مدروسة مع تقييم ذكي." },
  { n: 3, t: "استثمر بأمان", d: "ادفع عبر المحفظة، الضمانات تحمي الطرفين." },
  { n: 4, t: "تابع وتداول", d: "تابع الأداء وتداول حصصك في السوق الموازي." },
];

function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader icon={<Compass className="h-6 w-6" />} title="كيف تعمل المنصة؟" subtitle="من الفكرة إلى الاستثمار في 4 خطوات." />
        <ol className="mt-2 grid gap-4 md:grid-cols-2">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">{s.n}</div>
              <h3 className="mt-3 text-lg font-black">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/projects/new" search={{ edit: undefined }} className="rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary/90">اطرح فكرتك</Link>
          <Link to="/" className="rounded-md border border-border px-4 py-2 text-sm font-bold hover:border-primary">استكشف المشاريع</Link>
        </div>
      </main>
    </div>
  );
}
