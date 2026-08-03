import { Trophy, Award, Medal, Star } from "lucide-react";

const STYLES: Record<string, { icon: any; bg: string; text: string; label: string }> = {
  bronze:   { icon: Medal,  bg: "bg-amber-700/20",  text: "text-amber-700", label: "برونزي" },
  silver:   { icon: Award,  bg: "bg-slate-400/20",  text: "text-slate-600", label: "فضي" },
  gold:     { icon: Trophy, bg: "bg-yellow-500/20", text: "text-yellow-600", label: "ذهبي" },
  platinum: { icon: Star,   bg: "bg-purple-500/20", text: "text-purple-600", label: "بلاتيني" },
};

export function UserLevelBadge({ level, points, size = "sm" }: { level: string; points?: number; size?: "sm" | "md" }) {
  const s = STYLES[level] || STYLES.bronze;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${s.bg} ${s.text} ${size === "md" ? "text-sm" : "text-xs"}`}>
      <Icon className={size === "md" ? "h-4 w-4" : "h-3 w-3"} />
      {s.label}{points !== undefined && ` · ${points.toLocaleString("ar")}`}
    </span>
  );
}
