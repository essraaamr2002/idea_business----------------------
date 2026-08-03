import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Sparkles, Brain, Clock, Users, Mic, Link2, Zap } from "lucide-react";

const items = [
  { to: "/oracle", i: Brain, t: "محرك الأوراكل", d: "بصمة استثمارية لكل مشروع، قيمة عادلة، واحتمال نجاح مبني على الذكاء الصناعي." },
  { to: "/time-machine", i: Clock, t: "آلة الزمن", d: "محاكاة Monte Carlo لآلاف السيناريوهات لمحفظتك خلال السنوات القادمة." },
  { to: "/twin", i: Users, t: "التوأم الرقمي", d: "محفظة موازية ذكية تتعلّم أمامك وتُقدّم دروساً أسبوعية." },
  { to: "/trust-chain", i: Link2, t: "سلسلة الثقة", d: "ختم يومي بـ Merkle Root علني — أي شخص يُثبت عدم التلاعب." },
  { to: "/voice-trader", i: Mic, t: "التداول الصوتي", d: "نفّذ صفقاتك بأمر صوتي عربي — يفهمك الذكاء الصناعي." },
];

export const Route = createFileRoute("/future-lab")({
  head: () => ({ meta: [
    { title: "مختبر المستقبل | IDEA BUSINESS" },
    { name: "description", content: "ميزات سابقة لعصرها: أوراكل، محاكاة زمنية، توأم رقمي، سلسلة ثقة، تداول صوتي." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader icon={<Sparkles className="h-6 w-6" />} title="مختبر المستقبل" subtitle="تقنيات لم يسبقنا إليها أحد — كلها فعّالة الآن." />
        <div className="mb-6 flex justify-end">
          <Link to="/future-lab/history" className="text-sm text-primary hover:underline">📚 عرض سجل نتائجي المحفوظة</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((x) => (
            <Link key={x.to} to={x.to} className="group">
              <Card className="p-5 hover:border-primary transition-all h-full">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
                    <x.i className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">{x.t} <Zap className="h-4 w-4 text-yellow-500" /></h3>
                    <p className="text-sm text-muted-foreground mt-1">{x.d}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  ),
});
