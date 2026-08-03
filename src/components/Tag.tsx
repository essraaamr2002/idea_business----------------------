export function Tag({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "warning" | "danger" | "info" }) {
  const tones: Record<string, string> = {
    default: "border-border bg-muted/40 text-foreground",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-500",
    danger: "border-red-500/30 bg-red-500/10 text-red-500",
    info: "border-primary/30 bg-primary/10 text-primary",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tones[tone]}`}>{children}</span>;
}
