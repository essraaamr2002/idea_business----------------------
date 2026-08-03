import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Sparkles, FileText, TrendingUp, Target, Zap } from "lucide-react";
import { getAdAnalytics, getAdAIRecommendations } from "@/lib/ads-advanced.functions";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/ads/$id/analytics")({
  head: () => ({ meta: [{ title: "تحليلات الإعلان" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { id } = Route.useParams();
  const fetchAnalytics = useServerFn(getAdAnalytics);
  const fetchAi = useServerFn(getAdAIRecommendations);

  const { data, isLoading } = useQuery({
    queryKey: ["ad-analytics", id],
    queryFn: () => fetchAnalytics({ data: { id, days: 30 } }),
  });

  const aiMut = useMutation({
    mutationFn: () => fetchAi({ data: { id } }),
    onError: (e: any) => toast.error(e.message),
  });

  const heatmaxValue = useMemo(() => Math.max(1, ...(data?.byHour ?? [])), [data]);

  const exportPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const c: any = data?.campaign;
    doc.setFontSize(18); doc.text("Ad Performance Report", 14, 18);
    doc.setFontSize(11); doc.text(`Campaign: ${c?.headline ?? "-"}`, 14, 28);
    doc.text(`Status: ${c?.status} | Quality: ${c?.quality_score}/100`, 14, 36);
    doc.text(`Impressions: ${c?.impressions} | Clicks: ${c?.clicks} | CTR: ${data?.totals.ctr}%`, 14, 44);
    doc.text(`Conversions: ${c?.conversions_count} | Spent: ${c?.spent} ${c?.currency}`, 14, 52);
    doc.text(`CPC: ${data?.totals.cpc} | Conv Rate: ${data?.totals.convRate}%`, 14, 60);
    doc.text("Daily Performance (last 30 days):", 14, 72);
    let y = 80;
    (data?.series ?? []).slice(-14).forEach(s => {
      doc.text(`${s.date}: ${s.impressions} imp, ${s.clicks} clk, ${s.conversions} conv`, 14, y);
      y += 6;
    });
    doc.save(`ad-${id}-report.pdf`);
    toast.success("تم تصدير التقرير");
  };

  if (isLoading) return <WorkspaceShell><main className="mx-auto max-w-6xl px-4 py-8 space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></main></WorkspaceShell>;
  if (!data) return null;
  const c: any = data.campaign;

  return (
    <WorkspaceShell>
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/ads"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div>
              <h1 className="text-2xl font-extrabold">{c.headline}</h1>
              <p className="text-sm text-muted-foreground">تحليلات مفصّلة لآخر 30 يوم</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPdf}><FileText className="h-4 w-4" /> تقرير PDF</Button>
            <Button size="sm" onClick={() => aiMut.mutate()} disabled={aiMut.isPending}>
              <Sparkles className="h-4 w-4" /> اقتراحات الذكاء الاصطناعي
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="الظهور" value={c.impressions?.toLocaleString("ar")} />
          <KpiCard icon={<Target className="h-4 w-4" />} label="النقرات" value={c.clicks?.toLocaleString("ar")} />
          <KpiCard label="CTR" value={`${data.totals.ctr}%`} />
          <KpiCard label="التحويلات" value={String(c.conversions_count)} />
          <KpiCard icon={<Zap className="h-4 w-4 text-amber-500" />} label="جودة الإعلان" value={`${c.quality_score}/100`}
            tone={c.quality_score >= 70 ? "good" : c.quality_score >= 40 ? "warn" : "bad"} />
        </div>

        {aiMut.data && (
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> اقتراحات لتحسين الأداء</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              {aiMut.data.suggestions.map((s, i) => <p key={i} className="leading-relaxed">{s}</p>)}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">الأداء اليومي</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="impressions" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="ظهور" />
                <Line type="monotone" dataKey="clicks" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="نقرات" />
                <Line type="monotone" dataKey="conversions" stroke="#16a34a" strokeWidth={2} dot={false} name="تحويلات" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">حسب الدولة</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byCountry}>
                  <XAxis dataKey="country" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="impressions" fill="hsl(var(--primary))" />
                  <Bar dataKey="clicks" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">الخريطة الحرارية (نقرات حسب الساعة)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-1">
                {data.byHour.map((v, h) => {
                  const intensity = v / heatmaxValue;
                  return (
                    <div key={h} className="aspect-square rounded text-center text-[9px] flex flex-col items-center justify-center"
                      style={{ background: `hsl(var(--primary) / ${0.1 + intensity * 0.8})`, color: intensity > 0.5 ? "white" : "inherit" }}
                      title={`الساعة ${h}: ${v} نقرة`}>
                      <div>{h}</div><div className="font-bold">{v}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">الميزانية والإنفاق</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>المنفق</span><strong>{Number(c.spent).toFixed(2)} / {Number(c.total_budget).toFixed(2)} {c.currency}</strong></div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, (Number(c.spent) / Number(c.total_budget)) * 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>CPC: {data.totals.cpc} {c.currency}</span>
              <span>معدل التحويل: {data.totals.convRate}%</span>
            </div>
            {Number(c.spent) / Number(c.total_budget) > 0.8 && (
              <Badge variant="destructive" className="mt-2">⚠️ الميزانية على وشك النفاد</Badge>
            )}
          </CardContent>
        </Card>
      </main>
    </WorkspaceShell>
  );
}

function KpiCard({ icon, label, value, tone }: { icon?: React.ReactNode; label: string; value: string; tone?: "good" | "warn" | "bad" }) {
  const toneClass = tone === "good" ? "border-green-500/40 bg-green-500/5" : tone === "warn" ? "border-amber-500/40 bg-amber-500/5" : tone === "bad" ? "border-destructive/40 bg-destructive/5" : "";
  return (
    <Card className={toneClass}>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="text-xl font-extrabold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
