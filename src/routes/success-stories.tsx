import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, TrendingUp, Users, PlayCircle, Quote } from "lucide-react";

export const Route = createFileRoute("/success-stories")({
  head: () => ({
    meta: [
      { title: "قصص نجاح حقيقية من IDEA BUSINESS" },
      { name: "description", content: "مشاريع موّلت ونجحت عبر منصة IDEA BUSINESS — قصص مرئية بأرقام حقيقية." },
      { property: "og:title", content: "قصص نجاح من IDEA BUSINESS" },
      { property: "og:description", content: "كيف موّل أصحاب الأفكار مشاريعهم وحقّقوا عوائد ملموسة." },
    ],
  }),
  component: SuccessStoriesPage,
});

const STORIES = [
  {
    name: "مطعم الواحة",
    owner: "خالد العتيبي",
    city: "الرياض",
    raised: "١.٢ مليون ر.س",
    investors: 84,
    roi: "+٣٢٪",
    duration: "١٤ شهراً",
    quote: "تمويل سلس وشفافية كاملة — افتتحنا الفرع الثاني خلال سنة.",
    color: "from-orange-500/20 to-amber-500/10",
  },
  {
    name: "تطبيق سار للتوصيل",
    owner: "نوال الزهراني",
    city: "جدة",
    raised: "٨٥٠ ألف ر.س",
    investors: 56,
    roi: "+٤٧٪",
    duration: "٩ أشهر",
    quote: "المستثمرون كانوا شركاء فعليين — قدّموا خبرة لا مالاً فقط.",
    color: "from-blue-500/20 to-cyan-500/10",
  },
  {
    name: "مزرعة الفرسان",
    owner: "محمد القحطاني",
    city: "القصيم",
    raised: "٢.٤ مليون ر.س",
    investors: 142,
    roi: "+٢٨٪",
    duration: "١٨ شهراً",
    quote: "ضمان بنكي + توثيق رسمي أعطى المستثمرين ثقة كاملة.",
    color: "from-green-500/20 to-emerald-500/10",
  },
  {
    name: "متجر حرفيات",
    owner: "سارة المالكي",
    city: "الدمام",
    raised: "٣٢٠ ألف ر.س",
    investors: 38,
    roi: "+٥٢٪",
    duration: "٦ أشهر",
    quote: "بدأت بمشروع صغير وأصبح علامة معروفة بفضل المجتمع.",
    color: "from-pink-500/20 to-rose-500/10",
  },
];

function SuccessStoriesPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <PageHeader
          icon={<Trophy className="h-6 w-6" />}
          title="قصص نجاح حقيقية"
          subtitle="أصحاب أفكار حقّقوا أحلامهم — وأصحاب رؤوس أموال وجدوا فرصاً مجزية."
        />

        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={<TrendingUp />} value="١٢٠+" label="مشروع ممول" />
          <Stat icon={<Users />} value="٤٫٧K" label="مستثمر نشط" />
          <Stat icon={<Trophy />} value="٤٢ مليون" label="إجمالي تمويل" />
          <Stat icon={<TrendingUp />} value="٣٤٪" label="متوسط العائد" />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {STORIES.map((s) => (
            <Card key={s.name} className={`overflow-hidden bg-gradient-to-br ${s.color} border-border/60`}>
              <div className="aspect-video relative bg-gradient-to-br from-foreground/5 to-foreground/10">
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={() => {
                      import("sonner").then(({ toast }) => toast.info(s.name, { description: "الفيديو قيد التحرير وسيُتاح قريباً." }));
                    }}
                    aria-label={`شاهد قصة ${s.name}`}
                    className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg transition hover:scale-110"
                  >
                    <PlayCircle className="h-8 w-8" />
                  </button>
                </div>
                <div className="absolute bottom-2 end-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                  ٢:٣٤
                </div>
              </div>
              <CardContent className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xl font-black">{s.name}</h3>
                  <span className="rounded-md bg-green-verified/15 px-2 py-0.5 text-xs font-extrabold text-green-verified">
                    {s.roi}
                  </span>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {s.owner} · {s.city} · {s.duration}
                </p>
                <blockquote className="mb-3 flex gap-2 rounded-lg bg-card/60 p-3 text-sm italic">
                  <Quote className="h-4 w-4 shrink-0 text-primary" />
                  {s.quote}
                </blockquote>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/40 p-2">
                    <div className="text-muted-foreground">المبلغ المُجمَّع</div>
                    <div className="font-black text-primary">{s.raised}</div>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <div className="text-muted-foreground">المستثمرون</div>
                    <div className="font-black">{s.investors}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
          <h2 className="text-xl font-black">قصتك القادمة</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            انضم لمئات المؤسسين والمستثمرين الذين بنوا نجاحاتهم هنا.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link to="/projects/new" search={{ edit: undefined }}><Button className="font-extrabold">اطرح مشروعك</Button></Link>
            <Link to="/market"><Button variant="outline" className="font-extrabold">تصفّح الفرص</Button></Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 text-center">
      <div className="mx-auto mb-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="text-xl font-black">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
