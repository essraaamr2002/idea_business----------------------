import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Gauge } from "lucide-react";

// Lightweight client-side estimator for project listing pages.
export function SuccessProbability({ fundedPercent = 0, daysLeft = 0, backers = 0, hasVideo = false, updatesCount = 0 }: { fundedPercent?: number; daysLeft?: number; backers?: number; hasVideo?: boolean; updatesCount?: number }) {
  const speed = daysLeft > 0 ? Math.min(100, (fundedPercent / Math.max(1, 30 - daysLeft)) * 30) : fundedPercent;
  const social = Math.min(100, backers * 1.5);
  const trust = (hasVideo ? 20 : 0) + Math.min(40, updatesCount * 5) + 20;
  const score = Math.round(Math.min(99, speed * 0.4 + social * 0.3 + trust * 0.3));
  const label = score >= 75 ? "احتمال نجاح مرتفع" : score >= 50 ? "احتمال نجاح جيد" : score >= 30 ? "يحتاج دفعة" : "مخاطر مرتفعة";
  const color = score >= 75 ? "text-emerald-500" : score >= 50 ? "text-primary" : score >= 30 ? "text-amber-500" : "text-destructive";
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Gauge className="h-4 w-4" /> احتمال النجاح</CardTitle></CardHeader>
      <CardContent>
        <div className={`text-3xl font-black ${color}`}>{score}%</div>
        <Progress value={score} className="mt-2" />
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
