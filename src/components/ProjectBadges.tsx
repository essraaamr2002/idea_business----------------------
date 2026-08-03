import { Badge } from "@/components/ui/badge";
import { Flame, Sparkles, Shield, Crown } from "lucide-react";

/**
 * Smart status badges for project cards (#57 + #60).
 * Inputs already on the project record; nothing computed server-side.
 */
export function ProjectBadges({
  createdAt,
  sharesSold,
  sharesTotal,
  hasBankGuarantee,
  featured,
}: {
  createdAt?: string | null;
  sharesSold?: number | null;
  sharesTotal?: number | null;
  hasBankGuarantee?: boolean;
  featured?: boolean;
}) {
  const badges: { key: string; label: string; icon: any; cls: string }[] = [];
  const ageDays = createdAt ? (Date.now() - new Date(createdAt).getTime()) / 86400_000 : 999;
  if (ageDays < 7) badges.push({ key: "new", label: "جديد", icon: Sparkles, cls: "bg-primary/15 text-primary border-primary/30" });
  const pct = sharesTotal ? (sharesSold ?? 0) / sharesTotal : 0;
  if (pct >= 0.7 && pct < 1) badges.push({ key: "hot", label: "محتدم", icon: Flame, cls: "bg-orange-500/15 text-orange-500 border-orange-500/30" });
  if (featured) badges.push({ key: "feat", label: "مميّز", icon: Crown, cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" });
  if (hasBankGuarantee) badges.push({ key: "bg", label: "ضمان بنكي", icon: Shield, cls: "bg-success/15 text-success border-success/30" });

  if (badges.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {badges.map((b) => {
        const Icon = b.icon;
        return (
          <Badge key={b.key} variant="outline" className={`gap-1 px-1.5 py-0.5 text-[10px] font-extrabold ${b.cls}`}>
            <Icon className="h-3 w-3" />
            {b.label}
          </Badge>
        );
      })}
    </div>
  );
}
