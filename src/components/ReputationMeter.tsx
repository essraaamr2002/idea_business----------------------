import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  score: number; // 0-100
  className?: string;
  showLabel?: boolean;
}

const LEVELS = [
  { min: 0,  label: "مبتدئ",      color: "bg-slate-400" },
  { min: 30, label: "موثوق",      color: "bg-blue-500" },
  { min: 55, label: "مؤثر",       color: "bg-primary" },
  { min: 75, label: "نخبة",       color: "bg-amber-500" },
  { min: 90, label: "أسطورة",     color: "bg-gradient-to-r from-amber-400 to-rose-500" },
];

export function ReputationMeter({ score, className, showLabel = true }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const level = [...LEVELS].reverse().find((l) => clamped >= l.min) ?? LEVELS[0];
  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 font-extrabold">
            <Star className="h-3 w-3 text-amber-500" /> سمعة المجتمع
          </span>
          <span className="font-black">{clamped} · {level.label}</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full transition-all", level.color)} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
