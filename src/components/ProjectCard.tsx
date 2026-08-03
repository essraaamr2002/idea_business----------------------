import { Link } from "@tanstack/react-router";
import { Project } from "@/lib/mockData";
import { TrendingUp, TrendingDown, ShieldCheck, Users } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { VerifiedBadge } from "./VerifiedBadge";
import { TrustBadge } from "./TrustBadge";

import { QualityBadges } from "./MarketFeatures";

export function ProjectCard({ p }: { p: Project }) {
  const up = p.change24h >= 0;
  const trendData = p.trend.map((v, i) => ({ i, v }));

  return (
    <Link
      to="/projects/$id"
      params={{ id: p.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-elevated"
    >
      <div className="relative h-40 overflow-hidden">
        <img src={p.image} alt={p.name} loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 text-[11px] font-extrabold shadow-soft">
            <ShieldCheck className="h-3 w-3 text-success" />
            {p.guaranteeType}
          </div>
          
        </div>
        <div className="absolute right-3 bottom-3 left-3 flex items-end justify-between text-background">
          <div>
            <div className="font-mono text-[10px] font-bold opacity-90">{p.countryFlag} {p.ticker}</div>
            <div className="text-base font-extrabold leading-tight drop-shadow">{p.name}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <QualityBadges badges={(p as any).quality_badges} />
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold text-muted-foreground">سعر السهم</div>
            <div className="num text-xl font-extrabold">
              {p.sharePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-xs font-bold text-muted-foreground"> {p.currency}</span>
            </div>
          </div>
          <div className={`num inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-extrabold ${
            up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          }`}>
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {up ? "+" : ""}{p.change24h.toFixed(2)}%
          </div>
        </div>

        <div className="h-12 -mx-1" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <Line type="monotone" dataKey="v" stroke={up ? "var(--color-success)" : "var(--color-destructive)"}
                strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-[11px] font-bold">
            <span className="text-muted-foreground">التمويل</span>
            <span className="num">{p.fundedPercent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full gradient-primary rounded-full" style={{ width: `${p.fundedPercent}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <span className="truncate max-w-[100px]">{p.ownerName}</span>
            <VerifiedBadge blue={p.ownerVerified} green={p.ownerKyc} />
            <TrustBadge userId={(p as any).ownerId} compact />
          </div>
          <div className="flex items-center gap-1 font-bold text-muted-foreground">
            <Users className="h-3 w-3" />
            <span className="num">{p.investors}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
