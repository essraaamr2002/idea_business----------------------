import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTopOracleSignals } from "@/lib/oracle.functions";
import { SaveToHistoryButton } from "@/components/SaveToHistoryButton";
import { PdfExportButton } from "@/components/PdfExportButton";

export const Route = createFileRoute("/oracle")({
  head: () => ({ meta: [
    { title: "محرك الأوراكل | IDEA BUSINESS" },
    { name: "description", content: "بصمة استثمارية مبنية على 12 معاملاً، قيمة عادلة، وإشارات undervalued/overvalued." },
  ]}),
  component: OraclePage,
});

function OraclePage() {
  const fn = useServerFn(listTopOracleSignals);
  const { data, isLoading } = useQuery({
    queryKey: ["oracle-top"],
    queryFn: () => fn({ data: { limit: 24 } as any }),
    refetchInterval: 60_000,
  });

  const pdfSections = (data ?? []).slice(0, 12).map((s: any) => ({
    heading: `${s.project_id?.slice?.(0, 8) ?? "project"} — ${s.signal}`,
    body: `القيمة العادلة: ${s.fair_value} | سعر السوق: ${s.market_price} | نجاح متوقع: ${s.success_probability}%\n${s.reasoning ?? ""}`,
  }));

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <PageHeader icon={<Brain className="h-6 w-6" />} title="محرك الأوراكل" subtitle="إشارات مبنية على 12 معاملاً + شرح بالذكاء الصناعي." />
          <div className="flex gap-2">
            {data && data.length > 0 && (
              <>
                <SaveToHistoryButton
                  tool="oracle"
                  title={`لقطة الأوراكل — ${data.length} إشارة`}
                  summary={`أعلى ${data.length} إشارة استثمارية بتاريخ ${new Date().toLocaleDateString("ar-SA")}`}
                  payload={{ signals: data }}
                />
                <PdfExportButton
                  title="تقرير محرك الأوراكل"
                  subtitle={`${data.length} إشارة — ${new Date().toLocaleString("ar-SA")}`}
                  sections={pdfSections}
                  filename="oracle-report.pdf"
                />
              </>
            )}
          </div>
        </div>

        {isLoading && <p className="text-muted-foreground">جاري التحميل...</p>}
        {!isLoading && (!data || data.length === 0) && (
          <Card className="p-6 text-center text-muted-foreground">
            لا توجد إشارات بعد. ستُولَّد الإشارات تلقائياً عند نشر المشاريع وتصفحها.
          </Card>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((s: any) => {
            const dna = s.dna ?? {};
            const sig = s.signal;
            const Icon = sig === "undervalued" ? TrendingUp : sig === "overvalued" ? TrendingDown : Minus;
            const color = sig === "undervalued" ? "text-green-600" : sig === "overvalued" ? "text-red-600" : "text-muted-foreground";
            return (
              <Card key={s.project_id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={sig === "undervalued" ? "default" : sig === "overvalued" ? "destructive" : "secondary"}>
                    <Icon className="h-3 w-3 me-1" /> {sig === "undervalued" ? "مقيّم بأقل" : sig === "overvalued" ? "مقيّم بأكثر" : "عادل"}
                  </Badge>
                  <span className={`text-sm font-bold ${color}`}>{Math.round(dna.overall ?? 0)}/100</span>
                </div>
                <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
                  <div>القيمة العادلة: <span className="font-semibold text-foreground">{s.fair_value}</span></div>
                  <div>سعر السوق: <span className="font-semibold text-foreground">{s.market_price}</span></div>
                  <div>نجاح متوقع: <span className="font-semibold text-foreground">{s.success_probability}%</span></div>
                  <div>الجاذبية: <span className="font-semibold text-foreground">{Math.round(dna.virality ?? 0)}</span></div>
                </div>
                {s.reasoning && <p className="text-xs leading-relaxed border-t pt-2">{s.reasoning}</p>}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
