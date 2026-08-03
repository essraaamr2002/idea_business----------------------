import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyGamification, getLeaderboard } from "@/lib/gamification.functions";
import { UserLevelBadge } from "@/components/UserLevelBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Lock, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/gamification")({ component: Page });

function Page() {
  const fn = useServerFn(getMyGamification);
  const lb = useServerFn(getLeaderboard);
  const { data, isLoading } = useQuery({ queryKey: ["my-gamification"], queryFn: () => fn() });
  const { data: leaderboard = [] } = useQuery({ queryKey: ["leaderboard"], queryFn: () => lb({ data: { limit: 20 } }) });

  if (isLoading || !data) return <div className="grid h-[60vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const unlockedIds = new Set((data.unlocked as any[]).map((u: any) => u.achievement_id));

  return (
    <div dir="rtl" className="container mx-auto max-w-5xl py-8">
      <div className="mb-6 flex items-center gap-3">
        <Trophy className="h-7 w-7 text-yellow-500" />
        <div>
          <h1 className="text-2xl font-bold">شاراتي ونقاطي</h1>
          <p className="text-sm text-muted-foreground">اربح نقاطًا بنشاطك على المنصة وافتح شارات حصرية</p>
        </div>
      </div>

      <Card className="mb-6 border-primary/20 bg-gradient-to-l from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">نقاطك الإجمالية</div>
              <div className="text-4xl font-extrabold">{data.points.toLocaleString("ar")}</div>
            </div>
            <UserLevelBadge level={data.level} points={data.points} size="md" />
          </div>
          {data.nextThreshold && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>التقدم للمستوى التالي</span>
                <span>{data.points} / {data.nextThreshold}</span>
              </div>
              <Progress value={data.progress} />
            </div>
          )}
        </CardContent>
      </Card>

      <h2 className="mb-3 text-lg font-bold">الشارات المتاحة ({unlockedIds.size}/{data.all.length})</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data.all as any[]).map((a: any) => {
          const unlocked = unlockedIds.has(a.id);
          return (
            <Card key={a.id} className={unlocked ? "border-primary/30" : "opacity-60"}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {unlocked ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                    <h3 className="font-bold">{a.name_ar}</h3>
                  </div>
                  <UserLevelBadge level={a.tier} />
                </div>
                <p className="text-xs text-muted-foreground">{a.description_ar}</p>
                <div className="text-xs font-bold text-primary">+{a.points} نقطة</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <h2 className="mb-3 text-lg font-bold">قائمة المتصدرين</h2>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {(leaderboard as any[]).map((u) => (
              <li key={u.id} className="flex items-center gap-3 p-3">
                <span className="w-6 text-center text-sm font-bold text-muted-foreground">{u.rank}</span>
                {u.avatar ? (
                  <img src={u.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs">{u.name[0]}</div>
                )}
                <span className="flex-1 font-medium">{u.name}</span>
                <span className="text-sm font-bold text-primary">{u.points.toLocaleString("ar")} نقطة</span>
              </li>
            ))}
            {!leaderboard.length && <li className="p-6 text-center text-sm text-muted-foreground">لا توجد بيانات بعد</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
