import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export function GoldReferralBadge({ rank = 1, className }: { rank?: number; className?: string }) {
  if (rank > 3) return null;
  const styles = [
    "from-amber-400 to-yellow-600 text-black", // 1
    "from-slate-300 to-slate-500 text-black",  // 2
    "from-orange-400 to-amber-700 text-white", // 3
  ][rank - 1];
  const label = ["ذهبي", "فضي", "برونزي"][rank - 1];
  return (
    <span
      title={`المُحيل ${label} هذا الشهر`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-br px-2 py-0.5 text-[10px] font-black shadow-md",
        styles,
        className,
      )}
    >
      <Crown className="h-3 w-3" />
      {label}
    </span>
  );
}
