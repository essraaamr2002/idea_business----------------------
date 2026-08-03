import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { pingStreak, getStreak } from "@/lib/loyalty";
import { cn } from "@/lib/utils";

export function StreakBar({ className }: { className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    pingStreak();
    setN(getStreak());
  }, []);
  if (n <= 0) return null;
  const dots = Array.from({ length: 7 }, (_, i) => i < Math.min(n, 7));
  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1", className)}>
      <Flame className="h-3.5 w-3.5 text-orange-500" />
      <span className="text-xs font-black text-orange-600 dark:text-orange-400">{n} يوم متتالي</span>
      <span className="flex gap-0.5">
        {dots.map((on, i) => (
          <span key={i} className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-orange-500" : "bg-orange-500/20")} />
        ))}
      </span>
    </div>
  );
}
