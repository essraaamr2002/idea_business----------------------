import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Brain } from "lucide-react";

const QS: { q: string; opts: { t: string; s: number }[] }[] = [
  { q: "كيف تتصرف لو هبط استثمارك 20%؟", opts: [{ t: "أبيع فوراً", s: 1 }, { t: "أنتظر وأراقب", s: 2 }, { t: "أشتري المزيد", s: 3 }] },
  { q: "أفقك الزمني؟", opts: [{ t: "أقل من سنة", s: 1 }, { t: "1-3 سنوات", s: 2 }, { t: "أكثر من 3 سنوات", s: 3 }] },
  { q: "هدفك الأساسي؟", opts: [{ t: "الحفاظ على رأس المال", s: 1 }, { t: "نمو متوازن", s: 2 }, { t: "أقصى نمو", s: 3 }] },
  { q: "خبرتك في الاستثمار؟", opts: [{ t: "مبتدئ", s: 1 }, { t: "متوسط", s: 2 }, { t: "متقدم", s: 3 }] },
];

export const Route = createFileRoute("/quiz")({
  head: () => ({ meta: [
    { title: "اختبار ملف المخاطرة | IDEA BUSINESS" },
    { name: "description", content: "اكتشف ملف المخاطرة الاستثماري المناسب لك في دقيقة." },
  ]}),
  component: () => {
    const [i, setI] = useState(0);
    const [score, setScore] = useState(0);
    const done = i >= QS.length;
    const profile = score <= 6 ? { t: "محافظ", c: "text-emerald-500" } : score <= 9 ? { t: "متوازن", c: "text-primary" } : { t: "مغامر", c: "text-amber-500" };
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-xl px-4 py-10">
          <PageHeader icon={<Brain className="h-6 w-6" />} title="ملف المخاطرة" subtitle="اختبار سريع في 4 أسئلة." />
          <div className="rounded-2xl border border-border bg-card/60 p-6">
            {!done ? (<>
              <div className="mb-2 text-xs font-bold text-primary">سؤال {i + 1} / {QS.length}</div>
              <h3 className="text-lg font-black">{QS[i].q}</h3>
              <div className="mt-4 grid gap-2">
                {QS[i].opts.map((o) => (
                  <button key={o.t} onClick={() => { setScore(score + o.s); setI(i + 1); }} className="rounded-xl border border-border bg-background px-4 py-3 text-start text-sm font-bold hover:border-primary hover:bg-primary/5">{o.t}</button>
                ))}
              </div>
            </>) : (
              <div className="text-center">
                <h3 className="text-xl font-black">ملفك: <span className={profile.c}>{profile.t}</span></h3>
                <p className="mt-2 text-sm text-muted-foreground">سنُظهر لك توصيات مناسبة لمستوى المخاطرة لديك.</p>
                <Link to="/" className="mt-4 inline-block rounded-md bg-primary px-5 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary/90">شاهد المشاريع المناسبة</Link>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  },
});
