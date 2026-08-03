import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { TrendingUp, Users, Briefcase, Wallet } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { getPlatformStats } from "@/lib/platform-stats.functions";

function useCountUp(target: number, duration = 1200) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const ease = 1 - Math.pow(1 - k, 3);
      setN(Math.round(target * ease));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
}

function StatCard({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: number; suffix?: string }) {
  const n = useCountUp(value);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-black tabular-nums">{n.toLocaleString("ar")}{suffix}</div>
        <div className="text-xs font-bold text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

/** Live platform counters (#45). */
export function LiveCounters() {
  const fn = useServerFn(getPlatformStats);
  const { data } = useQuery({
    queryKey: ["home", "platform-stats"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
  });
  const s = data ?? { investors: 0, projects: 0, funded_usd: 0, trades: 0 };
  return (
    <Reveal>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="مستثمر مسجّل" value={s.investors} />
        <StatCard icon={<Briefcase className="h-5 w-5" />} label="مشروع نشط" value={s.projects} />
        <StatCard icon={<Wallet className="h-5 w-5" />} label="تمويل (USD)" value={s.funded_usd} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="صفقة تداول" value={s.trades} />
      </div>
    </Reveal>
  );
}
