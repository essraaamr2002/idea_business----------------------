import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Sparkles, Check } from "lucide-react";

const STEPS = [
  { t: "أهلاً بك", d: "سنرشدك خلال 3 خطوات لاكتشاف ما يناسبك." },
  { t: "ما هدفك؟", d: "اختر هدفك الرئيسي.", opts: ["استثمار طويل المدى", "دخل دوري", "تنويع المحفظة"] },
  { t: "مستوى المخاطرة", d: "كيف تصف نفسك؟", opts: ["محافظ", "متوازن", "مغامر"] },
];

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [
    { title: "البدء السريع | IDEA BUSINESS" },
    { name: "description", content: "ابدأ رحلتك الاستثمارية في دقائق." },
  ]}),
  component: () => {
    const [i, setI] = useState(0);
    const [pick, setPick] = useState<string[]>([]);
    const done = i >= STEPS.length;
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-2xl px-4 py-10">
          <PageHeader icon={<Sparkles className="h-6 w-6" />} title="البدء السريع" subtitle="3 خطوات لتجربة مخصّصة." />
          <div className="rounded-2xl border border-border bg-card/60 p-6">
            {!done ? (<>
              <div className="mb-2 text-xs font-bold text-primary">خطوة {i + 1} من {STEPS.length}</div>
              <h3 className="text-xl font-black">{STEPS[i].t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{STEPS[i].d}</p>
              {STEPS[i].opts ? (
                <div className="mt-4 grid gap-2">
                  {STEPS[i].opts!.map((o) => (
                    <button key={o} onClick={() => { setPick((p)=>[...p,o]); setI(i+1); }} className="rounded-xl border border-border bg-background px-4 py-3 text-start text-sm font-bold hover:border-primary hover:bg-primary/5">{o}</button>
                  ))}
                </div>
              ) : (
                <button onClick={() => setI(i+1)} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary/90">ابدأ</button>
              )}
            </>) : (
              <div className="text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500"><Check className="h-6 w-6" /></div>
                <h3 className="text-xl font-black">رائع! جهّزنا توصيات لك</h3>
                <p className="mt-1 text-sm text-muted-foreground">بناءً على: {pick.join(" · ")}</p>
                <Link to="/" className="mt-4 inline-block rounded-md bg-primary px-5 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary/90">شاهد الفرص المناسبة</Link>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  },
});
