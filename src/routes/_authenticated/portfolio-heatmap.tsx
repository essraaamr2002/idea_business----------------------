import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { LayoutGrid } from "lucide-react";
import { getPortfolioHeatmap } from "@/lib/mega-pack.functions";

export const Route = createFileRoute("/_authenticated/portfolio-heatmap")({
  head: () => ({ meta: [{ title: "خريطة حرارية للمحفظة | IDEA BUSINESS" }] }),
  component: HeatmapPage,
});

function cellColor(pnl: number) {
  const clamp = Math.max(-30, Math.min(30, pnl));
  if (clamp >= 0) {
    const a = 0.15 + (clamp / 30) * 0.55;
    return `rgba(16,185,129,${a.toFixed(2)})`;
  }
  const a = 0.15 + (Math.abs(clamp) / 30) * 0.55;
  return `rgba(244,63,94,${a.toFixed(2)})`;
}

function HeatmapPage() {
  const fn = useServerFn(getPortfolioHeatmap);
  const { data, isLoading } = useQuery({ queryKey: ["portfolio-heatmap"], queryFn: () => fn() });
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageHeader icon={<LayoutGrid className="h-6 w-6" />} title="خريطة حرارية للمحفظة" subtitle="أداء استثماراتك موزعاً حسب القطاع." />
        {isLoading && <div className="rounded-xl border border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">جارٍ التحميل…</div>}
        {data && data.cells.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            لا توجد استثمارات بعد. ابدأ بشراء أسهم من صفحة المشاريع.
          </div>
        )}
        {data && data.cells.length > 0 && (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card/60 p-3">
                <div className="text-xs text-muted-foreground">إجمالي المستثمر</div>
                <div className="text-lg font-extrabold tabular-nums">{data.total_invested.toLocaleString()} </div>
              </div>
              <div className="rounded-xl border border-border bg-card/60 p-3">
                <div className="text-xs text-muted-foreground">القيمة الحالية</div>
                <div className="text-lg font-extrabold tabular-nums">{data.total_value.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-border bg-card/60 p-3">
                <div className="text-xs text-muted-foreground">الأداء الكلي</div>
                <div className={`text-lg font-extrabold ${data.total_value >= data.total_invested ? "text-emerald-500" : "text-rose-500"}`}>
                  {data.total_invested ? (((data.total_value - data.total_invested) / data.total_invested) * 100).toFixed(2) : "0.00"}%
                </div>
              </div>
            </div>

            <h2 className="mb-2 text-sm font-extrabold text-foreground">حسب القطاع</h2>
            <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {data.sectors.map((s) => (
                <div key={s.sector} className="rounded-xl border border-border p-3" style={{ background: cellColor(s.pnl_pct) }}>
                  <div className="text-xs font-bold text-foreground">{s.sector}</div>
                  <div className="text-[11px] text-muted-foreground">{s.value.toLocaleString()}</div>
                  <div className={`text-xs font-extrabold ${s.pnl_pct >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{s.pnl_pct.toFixed(2)}%</div>
                </div>
              ))}
            </div>

            <h2 className="mb-2 text-sm font-extrabold text-foreground">كل المراكز</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {data.cells.map((c) => (
                <div key={c.project_id as string} className="rounded-xl border border-border p-3" style={{ background: cellColor(c.pnl_pct) }}>
                  <div className="truncate text-xs font-bold text-foreground">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.ticker || "—"}</div>
                  <div className="mt-1 text-[11px] tabular-nums">قيمة: {c.value.toLocaleString()}</div>
                  <div className={`text-xs font-extrabold ${c.pnl_pct >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{c.pnl_pct.toFixed(2)}%</div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
