export function RiskMeter({ score }: { score: number }) {
  const s = Math.max(0, Math.min(100, score));
  const label = s < 33 ? "منخفض" : s < 66 ? "متوسط" : "عالي";
  const color = s < 33 ? "text-emerald-500" : s < 66 ? "text-amber-500" : "text-rose-500";
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">مستوى المخاطرة</span>
        <span className={`font-extrabold ${color}`}>{label} · {s}/100</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gradient-to-r from-emerald-500/30 via-amber-500/30 to-rose-500/30">
        <div className="h-full bg-foreground/80 transition-all" style={{ width: `${s}%` }} />
      </div>
    </div>
  );
}
