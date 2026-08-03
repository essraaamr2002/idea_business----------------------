import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, RefreshCcw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { initOrGetTwin, setTwinStrategy, rebalanceTwin } from "@/lib/twin.functions";
import { toast } from "sonner";
import { SaveToHistoryButton } from "@/components/SaveToHistoryButton";
import { PdfExportButton } from "@/components/PdfExportButton";

export const Route = createFileRoute("/twin")({
  head: () => ({ meta: [
    { title: "التوأم الرقمي | IDEA BUSINESS" },
    { name: "description", content: "محفظة موازية تتنافس معك أسبوعياً وتُقدّم لك دروساً استثمارية." },
  ]}),
  component: TwinPage,
});

function TwinPage() {
  const init = useServerFn(initOrGetTwin);
  const setStrat = useServerFn(setTwinStrategy);
  const reb = useServerFn(rebalanceTwin);
  const qc = useQueryClient();
  const { data: t } = useQuery({ queryKey: ["twin"], queryFn: () => init() });
  const mSet = useMutation({
    mutationFn: (s: "conservative" | "balanced" | "aggressive") => setStrat({ data: { strategy: s } as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["twin"] }),
  });
  const mReb = useMutation({
    mutationFn: () => reb(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["twin"] }); toast.success("تمّت إعادة الموازنة"); },
    onError: (e: any) => toast.error(e?.message || "خطأ"),
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Users className="h-6 w-6" />} title="توأمك الرقمي" subtitle="محفظة افتراضية تتعلّم أمامك." />
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">رصيد افتراضي</div>
              <div className="text-2xl font-bold">{Number(t?.virtual_balance ?? 0).toLocaleString("ar-SA")}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">الأداء التراكمي</div>
              <div className={`text-2xl font-bold ${Number(t?.performance_pct ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {Number(t?.performance_pct ?? 0).toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            {(["conservative", "balanced", "aggressive"] as const).map((s) => (
              <Button key={s} variant={t?.strategy === s ? "default" : "outline"} size="sm" onClick={() => mSet.mutate(s)}>
                {s === "conservative" ? "محافظ" : s === "balanced" ? "متوازن" : "جريء"}
              </Button>
            ))}
          </div>
          <Button className="w-full" onClick={() => mReb.mutate()} disabled={mReb.isPending}>
            <RefreshCcw className="h-4 w-4 me-2" /> إعادة موازنة أسبوعية
          </Button>
          {t?.last_lesson && (
            <Card className="p-3 bg-muted text-sm">
              <span className="font-bold">درس اليوم: </span>{t.last_lesson}
            </Card>
          )}
          {t && (
            <div className="flex gap-2 justify-center pt-2 border-t">
              <SaveToHistoryButton
                tool="twin"
                title={`لقطة التوأم الرقمي — ${t.strategy ?? "balanced"}`}
                summary={`رصيد ${Number(t.virtual_balance ?? 0).toLocaleString("ar-SA")} — أداء ${Number(t.performance_pct ?? 0).toFixed(2)}%`}
                payload={{ snapshot: t }}
              />
              <PdfExportButton
                title="تقرير التوأم الرقمي"
                subtitle={new Date().toLocaleString("ar-SA")}
                sections={[
                  { heading: "الاستراتيجية", body: String(t.strategy ?? "-") },
                  { heading: "الرصيد الافتراضي", body: Number(t.virtual_balance ?? 0).toLocaleString("ar-SA") },
                  { heading: "الأداء التراكمي", body: `${Number(t.performance_pct ?? 0).toFixed(2)}%` },
                  { heading: "درس اليوم", body: String(t.last_lesson ?? "-") },
                ]}
                filename="twin-report.pdf"
              />
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
