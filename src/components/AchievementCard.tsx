import { LucideIcon } from "lucide-react";

export function AchievementCard({ icon: Icon, title, desc, unlocked }: { icon: LucideIcon; title: string; desc: string; unlocked: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 transition ${unlocked ? "border-primary/40 bg-primary/5" : "border-border bg-card/40 opacity-70"}`}>
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${unlocked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h4 className="mt-2 text-sm font-black">{title}</h4>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      <div className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold ${unlocked ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
        {unlocked ? "مفتوح" : "مقفل"}
      </div>
    </div>
  );
}
