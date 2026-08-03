import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Activity, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { getMarketPulse } from "@/lib/mega-pack.functions";

export const Route = createFileRoute("/market-pulse")({
  head: () => ({
    meta: [
      { title: "نبض السوق | IDEA BUSINESS" },
      { name: "description", content: "أكبر الرابحين والخاسرين والأكثر تداولاً خلال 24 ساعة على منصة IDEA BUSINESS." },
      { property: "og:title", content: "نبض السوق - IDEA BUSINESS" },
      { property: "og:description", content: "أكبر الرابحين والخاسرين والأكثر تداولاً خلال 24 ساعة." },
    ],
  }),
  component: MarketPulsePage,
});

function Row({ r }: { r: { id: string; name: string; ticker: string | null; sector: string | null; price: number; change_pct: number; volume: number } }) {
  const up = r.change_pct >= 0;
  return (
    <Link
      to="/project/$id"
      params={{ id: r.id }}
      className="flex items-center justify-between rounded-xl border border-border bg-card/70 px-3 py-2.5 hover:bg-card"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-bold text-foreground">{r.name}</div>
        <div className="text-[11px] text-muted-foreground">{r.ticker || "—"} · {r.sector || "—"}</div>
      </div>
      <div className="text-left">
        <div className="text-sm font-extrabold tabular-nums">{r.price.toFixed(2)}</div>
        <div className={`text-[11px] font-bold ${up ? "text-emerald-500" : "text-rose-500"}`}>{up ? "▲" : "▼"} {Math.abs(r.change_pct).toFixed(2)}%</div>
      </div>
    </Link>
  );
}

function Column({ title, icon, items }: { title: string; icon: React.ReactNode; items: any[] }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">{icon}{title}</div>
      <div className="space-y-2">
        {items.length === 0 && <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">لا توجد بيانات بعد.</div>}
        {items.map((r) => <Row key={r.id} r={r} />)}
      </div>
    </div>
  );
}

function MarketPulsePage() {
  const pulseFn = useServerFn(getMarketPulse);
  const { data, isLoading } = useQuery({
    queryKey: ["market-pulse"],
    queryFn: () => pulseFn(),
    refetchInterval: 30000,
  });
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageHeader icon={<Activity className="h-6 w-6" />} title="نبض السوق" subtitle="آخر 24 ساعة — يتحدث كل 30 ثانية." />
        {isLoading && <div className="rounded-xl border border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">جارٍ التحميل…</div>}
        {data && (
          <div className="grid gap-4 md:grid-cols-3">
            <Column title="أكبر الرابحين" icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} items={data.gainers} />
            <Column title="أكبر الخاسرين" icon={<TrendingDown className="h-4 w-4 text-rose-500" />} items={data.losers} />
            <Column title="الأكثر تداولاً" icon={<Zap className="h-4 w-4 text-amber-500" />} items={data.active} />
          </div>
        )}
      </main>
    </div>
  );
}
