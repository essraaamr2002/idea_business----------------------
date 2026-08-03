import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { AchievementCard } from "@/components/AchievementCard";
import { Award, Rocket, Users, TrendingUp, ShieldCheck, Star, Crown } from "lucide-react";

export const Route = createFileRoute("/achievements")({
  head: () => ({ meta: [
    { title: "الإنجازات | IDEA BUSINESS" },
    { name: "description", content: "اكسب شارات بإنجازاتك الاستثمارية." },
  ]}),
  component: () => {
    const list = [
      { i: Rocket, t: "أول استثمار", d: "أكمل أول استثمار لك", u: true },
      { i: Users, t: "5 إحالات", d: "ادعُ 5 أصدقاء", u: true },
      { i: TrendingUp, t: "مضاعفة المحفظة", d: "ضاعف رأس مالك", u: false },
      { i: ShieldCheck, t: "موثّق KYC", d: "أكمل التحقق", u: true },
      { i: Star, t: "نشاط ثابت", d: "30 يوم متواصل", u: false },
      { i: Crown, t: "VIP", d: "اشترك بالعضوية المميزة", u: false },
    ];
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-4xl px-4 py-10">
          <PageHeader icon={<Award className="h-6 w-6" />} title="الإنجازات" subtitle="اكسب شارات وأظهر تقدّمك." />
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {list.map((a) => <AchievementCard key={a.t} icon={a.i} title={a.t} desc={a.d} unlocked={a.u} />)}
          </div>
        </main>
      </div>
    );
  },
});
