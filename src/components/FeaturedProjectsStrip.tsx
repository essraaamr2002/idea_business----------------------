import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lightbulb, ArrowLeft, TrendingUp, ShieldCheck } from "lucide-react";
import { listFeaturedProjects } from "@/lib/public-projects.functions";
import { TrustBadge } from "@/components/TrustBadge";

type Row = Awaited<ReturnType<typeof listFeaturedProjects>>[number];

export function FeaturedProjectsStrip() {
  const fetcher = useServerFn(listFeaturedProjects);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher({ data: { limit: 6 } })
      .then((r) => setRows(r as Row[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetcher]);

  if (loading) return null;
  if (rows.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/5 via-transparent to-cyan-500/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-amber-500/15 p-2"><Lightbulb className="h-4 w-4 text-amber-400" /></div>
          <div>
            <h2 className="text-sm font-black">أفكار استثمارية حديثة</h2>
            <p className="text-[11px] text-muted-foreground">استثمر مباشرة أو فاوض صاحب الفكرة</p>
          </div>
        </div>
        <Link to="/market" className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:underline">
          الكل <ArrowLeft className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 snap-x">
        {rows.map((p) => {
          const fundedPct = p.shares_total ? Math.round(((p.shares_sold ?? 0) / p.shares_total) * 100) : 0;
          const price = p.current_price ?? p.share_price ?? 0;
          return (
            <Link
              key={p.id}
              to="/projects/$id"
              params={{ id: p.id }}
              className="group relative w-[240px] flex-shrink-0 snap-start overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-28 overflow-hidden bg-muted">
                {p.cover_image_url ? (
                  <img src={p.cover_image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl">💡</div>
                )}
                {p.owner_verified && (
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                    <ShieldCheck className="h-2.5 w-2.5" /> موثّق
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="truncate">{p.owner_name ?? "مؤسس"}</span>
                  <TrustBadge userId={p.owner_id} compact />
                </div>
                <div className="mt-0.5 line-clamp-1 text-sm font-extrabold">{p.name}</div>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <div className="text-[10px] text-muted-foreground">سعر السهم</div>
                    <div className="text-sm font-bold text-primary">{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                    <TrendingUp className="h-2.5 w-2.5" /> {fundedPct}%
                  </span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${fundedPct}%` }} />
                </div>
                <button className="mt-3 w-full rounded-lg bg-primary py-1.5 text-[11px] font-extrabold text-primary-foreground">
                  استثمر الآن
                </button>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
