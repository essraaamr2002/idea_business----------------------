import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { useAuth } from "@/hooks/useAuth";
import { listMyCampaigns, pauseAdCampaign, resumeAdCampaign, cancelAdCampaign } from "@/lib/ads.functions";
import { duplicateAdCampaign } from "@/lib/ads-advanced.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pause, Play, BarChart3, Megaphone, Copy, LifeBuoy, Zap, X } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  pending_payment: "بانتظار الدفع",
  active: "نشطة",
  paused: "متوقفة",
  completed: "منتهية",
  rejected: "مرفوضة",
  canceled: "ملغاة",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  pending_payment: "secondary",
  active: "default",
  paused: "secondary",
  completed: "outline",
  rejected: "destructive",
  canceled: "destructive",
};

export function AdsDashboard() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const list = useServerFn(listMyCampaigns);
  const pauseFn = useServerFn(pauseAdCampaign);
  const resumeFn = useServerFn(resumeAdCampaign);
  const cancelFn = useServerFn(cancelAdCampaign);
  const dupFn = useServerFn(duplicateAdCampaign);
  const { data, refetch } = useQuery({
    queryKey: ["my-ads"], queryFn: () => list(),
    enabled: !!user,
  });

  if (loading) return null;
  if (!user) {
    return (
      <WorkspaceShell>
        <div className="mx-auto max-w-md p-10 text-center">
          <p className="text-muted-foreground">سجّل الدخول لإدارة إعلاناتك.</p>
          <Link to="/auth" className="mt-4 inline-block"><Button>تسجيل الدخول</Button></Link>
        </div>
      </WorkspaceShell>
    );
  }

  const items = data?.items ?? [];
  return (
    <WorkspaceShell>
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3"><Megaphone className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-extrabold">إعلاناتي</h1>
              <p className="text-sm text-muted-foreground">أنشئ وأدر حملاتك الإعلانية المستهدفة.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/ads/support"><LifeBuoy className="h-4 w-4" /> الدعم</Link></Button>
            <Button asChild className="gradient-primary text-primary-foreground font-bold">
              <Link to="/ads/new"><Plus className="h-4 w-4" /> أنشئ إعلانًا جديدًا</Link>
            </Button>
          </div>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Megaphone className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">لا توجد حملات بعد. ابدأ بإنشاء أول إعلان لك.</p>
              <Button asChild className="font-bold"><Link to="/ads/new">أنشئ إعلانك الأول</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((c: any) => {
              const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0.00";
              return (
                <Card key={c.id} className="overflow-hidden">
                  {c.media_url && c.media_type === "image" && (
                    <img src={c.media_url} alt="" className="h-32 w-full object-cover" />
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{c.headline}</CardTitle>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={STATUS_VARIANTS[c.status]}>{STATUS_LABELS[c.status]}</Badge>
                        {typeof c.quality_score === "number" && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Zap className="h-3 w-3 text-amber-500" /> {c.quality_score}/100
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <Stat label="الظهور" value={c.impressions?.toLocaleString("ar") ?? "0"} />
                      <Stat label="النقرات" value={c.clicks?.toLocaleString("ar") ?? "0"} />
                      <Stat label="CTR" value={`${ctr}%`} />
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                      <span>المنفق: <strong>{Number(c.spent).toFixed(2)} / {Number(c.total_budget).toFixed(2)} {c.currency}</strong></span>
                      <span>{c.duration_days} يوم</span>
                    </div>
                    <div className="flex gap-2 pt-1 flex-wrap">
                      {c.status === "active" && (
                        <Button size="sm" variant="outline" onClick={async () => {
                          await pauseFn({ data: { id: c.id } });
                          toast.success("تم إيقاف الإعلان");
                          qc.invalidateQueries({ queryKey: ["my-ads"] });
                        }}><Pause className="h-3 w-3" /> إيقاف</Button>
                      )}
                      {c.status === "paused" && (
                        <Button size="sm" variant="outline" onClick={async () => {
                          await resumeFn({ data: { id: c.id } });
                          toast.success("تم استئناف الإعلان");
                          qc.invalidateQueries({ queryKey: ["my-ads"] });
                        }}><Play className="h-3 w-3" /> استئناف</Button>
                      )}
                      {c.status === "pending_payment" && (
                        <Link to="/wallet"><Button size="sm" variant="default">شحن المحفظة</Button></Link>
                      )}
                      <Link to="/ads/$id/analytics" params={{ id: c.id }}>
                        <Button size="sm" variant="ghost"><BarChart3 className="h-3 w-3" /> تحليلات</Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        try {
                          await dupFn({ data: { id: c.id } });
                          toast.success("تم تكرار الحملة كمسودة");
                          refetch();
                        } catch (e: any) { toast.error(e.message); }
                      }}><Copy className="h-3 w-3" /> تكرار</Button>
                      {["draft", "pending_payment", "paused"].includes(c.status) && (
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={async () => {
                          if (!confirm("هل أنت متأكد من إلغاء هذه الحملة؟")) return;
                          try {
                            await cancelFn({ data: { id: c.id } });
                            toast.success("تم إلغاء الحملة");
                            qc.invalidateQueries({ queryKey: ["my-ads"] });
                          } catch (e: any) { toast.error(e.message); }
                        }}><X className="h-3 w-3" /> إلغاء</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </WorkspaceShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2">
      <div className="text-base font-extrabold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}