import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Gift, Crown, Loader2 } from "lucide-react";
import { GoldReferralBadge } from "@/components/GoldReferralBadge";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Period = "week" | "month" | "all";

type Row = {
  rank: number;
  referrer_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  country: string | null;
  membership: string | null;
  verified_gold: boolean | null;
  verified_diamond: boolean | null;
  referrals_count: number;
  reward_total: number;
};

const PROGRAMS = [
  { value: "all", label: "كل البرامج" },
  { value: "free", label: "مجاني" },
  { value: "silver", label: "فضي" },
  { value: "gold", label: "ذهبي" },
  { value: "platinum", label: "بلاتيني" },
  { value: "diamond", label: "ماسي" },
];

export const Route = createFileRoute("/referral-leaderboard")({
  head: () => ({
    meta: [
      { title: "متصدّرو الإحالات | IDEA BUSINESS" },
      { name: "description", content: "الترتيب الأسبوعي والشهري للأكثر دعوة، مع فلترة حسب الدولة والبرنامج." },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [country, setCountry] = useState<string>("all");
  const [program, setProgram] = useState<string>("all");

  const countriesQ = useQuery({
    queryKey: ["referral-leaderboard-countries"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("referral_leaderboard_countries" as any);
      if (error) throw error;
      return (data as Array<{ country: string; cnt: number }>) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const leaderboardQ = useQuery({
    queryKey: ["referral-leaderboard", period, country, program],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("referral_leaderboard" as any, {
        period,
        country_filter: country,
        program_filter: program,
        row_limit: 100,
      });
      if (error) throw error;
      return (data as Row[]) ?? [];
    },
  });

  const rows = leaderboardQ.data ?? [];
  const subtitle = useMemo(() => {
    const p = period === "week" ? "آخر 7 أيام" : period === "month" ? "آخر 30 يوم" : "منذ البداية";
    return `الترتيب — ${p}`;
  }, [period]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader
          icon={<Gift className="h-6 w-6" />}
          title="متصدّرو الإحالات"
          subtitle={subtitle}
        />

        <div className="mb-4 space-y-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="week">أسبوعي</TabsTrigger>
              <TabsTrigger value="month">شهري</TabsTrigger>
              <TabsTrigger value="all">كل الوقت</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-2 gap-2">
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue placeholder="الدولة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الدول</SelectItem>
                {(countriesQ.data ?? []).map((c) => (
                  <SelectItem key={c.country} value={c.country}>
                    {c.country} ({c.cnt})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={program} onValueChange={setProgram}>
              <SelectTrigger>
                <SelectValue placeholder="البرنامج" />
              </SelectTrigger>
              <SelectContent>
                {PROGRAMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {leaderboardQ.isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 py-16 text-center text-sm text-muted-foreground">
            لا توجد إحالات مطابقة لهذه الفلترة بعد. جرّب فترة أوسع أو دولة مختلفة.
          </div>
        ) : (
          <ol className="overflow-hidden rounded-2xl border border-border bg-card/60">
            {rows.map((u) => {
              const rank = Number(u.rank);
              const name = u.display_name || u.username || "عضو";
              return (
                <li key={u.referrer_id} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                        rank === 1
                          ? "bg-yellow-500/20 text-yellow-500"
                          : rank === 2
                          ? "bg-slate-400/20 text-slate-300"
                          : rank === 3
                          ? "bg-amber-700/20 text-amber-500"
                          : "bg-muted"
                      }`}
                    >
                      {rank === 1 ? <Crown className="h-4 w-4" /> : rank}
                    </span>
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : null}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate font-bold">
                        <span className="truncate">@{u.username || name}</span>
                        <GoldReferralBadge rank={rank} />
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {u.country ? <span>{u.country}</span> : null}
                        {u.membership && u.membership !== "free" ? (
                          <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{u.membership}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="text-end text-xs">
                    <div className="font-extrabold text-primary">{u.referrals_count} إحالة</div>
                    <div className="text-muted-foreground">+ {Number(u.reward_total).toLocaleString()} ر.س</div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
