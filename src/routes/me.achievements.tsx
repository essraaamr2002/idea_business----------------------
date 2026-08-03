import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Flame, Trophy, Star, Target, Crown } from "lucide-react";

export const Route = createFileRoute("/me/achievements")({
  head: () => ({ meta: [{ title: "إنجازاتي — IDEA BUSINESS" }] }),
  component: MyAchievements,
});

const ACH = [
  { icon: Star, name: "أول استثمار", desc: "أكملت أول استثمار لك", unlocked: true },
  { icon: Flame, name: "موجة نشاط", desc: "7 أيام متتالية", unlocked: true },
  { icon: Target, name: "هدف الشهر", desc: "أكملت 5 استثمارات هذا الشهر", unlocked: false },
  { icon: Trophy, name: "بطل التمويل", desc: "موّلت مشروعاً وصل لهدفه", unlocked: true },
  { icon: Crown, name: "نخبة المنصة", desc: "ضمن أعلى 1% مستثمرين", unlocked: false },
  { icon: Award, name: "100 إحالة", desc: "دعوت 100 صديق ناجح", unlocked: false },
];

function MyAchievements() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black">إنجازاتي الشخصية</h1>
      <p className="mt-2 text-sm text-muted-foreground">كل إنجاز يفتح <Link to="/certificates" className="text-primary underline">شهادة قابلة للتنزيل</Link>.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACH.map((a) => {
          const I = a.icon;
          return (
            <Card key={a.name} className={a.unlocked ? "" : "opacity-50"}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-full p-3 ${a.unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><I className="h-6 w-6" /></div>
                <div>
                  <div className="font-bold">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.desc}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
