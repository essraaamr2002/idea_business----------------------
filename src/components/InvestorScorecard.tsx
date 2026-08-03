import { Award } from "lucide-react";

export function InvestorScorecard({ name = "أنت", level = 3, xp = 720, next = 1000 }: { name?: string; level?: number; xp?: number; next?: number }) {
  const pct = Math.min(100, Math.round((xp / next) * 100));
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary"><Award className="h-6 w-6" /></div>
          <div>
            <div className="text-sm text-muted-foreground">المستثمر</div>
            <div className="font-black">{name}</div>
          </div>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold text-primary">المستوى {level}</div>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">التقدّم للمستوى التالي</span>
          <span className="font-bold">{xp}/{next} XP</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
