import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getOwnerInsights } from "@/lib/project-intel.functions";
import { Eye, Heart, Users, Handshake, CheckCircle2, BarChart3 } from "lucide-react";

export function OwnerInsightsPanel({ projectId }: { projectId: string }) {
  const fn = useServerFn(getOwnerInsights);
  const { data, isLoading } = useQuery({
    queryKey: ["owner-insights", projectId],
    queryFn: () => fn({ data: { project_id: projectId } }) as Promise<any>,
  });

  if (isLoading) return <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">جارٍ تحميل التحليلات…</div>;
  if (!data) return null;

  const cards = [
    { icon: <Eye className="h-3 w-3" />, label: "مشاهدات", value: data.views ?? 0 },
    { icon: <Heart className="h-3 w-3" />, label: "إعجابات", value: data.likes ?? 0 },
    { icon: <Users className="h-3 w-3" />, label: "مستثمرون فريدون", value: data.unique_investors ?? 0 },
    { icon: <Handshake className="h-3 w-3" />, label: "عروض معلّقة", value: data.pending_offers ?? 0 },
    { icon: <CheckCircle2 className="h-3 w-3" />, label: "عروض مقبولة", value: data.accepted_offers ?? 0 },
    { icon: <BarChart3 className="h-3 w-3" />, label: "طلبات شراكة", value: data.partnership_requests ?? 0 },
  ];

  return (
    <div className="rounded-xl border border-border bg-background/40 p-3 space-y-3">
      <div className="text-[11px] font-bold text-muted-foreground">تحليلات المؤسس</div>
      <div className="grid grid-cols-3 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border/60 bg-card p-2 text-center">
            <div className="mb-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">{c.icon}{c.label}</div>
            <div className="text-base font-extrabold">{Number(c.value).toLocaleString("ar")}</div>
          </div>
        ))}
      </div>
      {Array.isArray(data.top_countries) && data.top_countries.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-bold text-muted-foreground">أعلى الدول للمستثمرين</div>
          <div className="flex flex-wrap gap-1.5">
            {data.top_countries.map((c: any) => (
              <span key={c.country} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
                {c.country} · {c.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
