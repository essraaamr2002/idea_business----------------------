import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, PlayCircle } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runMonteCarlo } from "@/lib/time-machine.functions";
import { toast } from "sonner";
import { SaveToHistoryButton } from "@/components/SaveToHistoryButton";
import { PdfExportButton } from "@/components/PdfExportButton";

export const Route = createFileRoute("/time-machine")({
  head: () => ({ meta: [
    { title: "آلة الزمن | IDEA BUSINESS" },
    { name: "description", content: "شغّل 10,000 محاكاة Monte Carlo لمحفظتك وشاهد سيناريوهات المستقبل." },
  ]}),
  component: TimeMachinePage,
});

function TimeMachinePage() {
  const fn = useServerFn(runMonteCarlo);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({
    principal: 50000, monthly_contribution: 500, years: 5,
    expected_return: 0.12, volatility: 0.25, leverage: 1, simulations: 2000,
  });

  const submit = async () => {
    setBusy(true);
    try {
      const r = await fn({ data: form as any });
      setResult(r);
    } catch (e: any) {
      toast.error(e?.message || "خطأ");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader icon={<Clock className="h-6 w-6" />} title="آلة الزمن" subtitle="محاكاة Monte Carlo لمستقبل محفظتك." />
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-5 space-y-3">
            {[
              { k: "principal", l: "رأس المال (ر.س)" },
              { k: "monthly_contribution", l: "إضافة شهرية" },
              { k: "years", l: "عدد السنوات (1-10)" },
              { k: "expected_return", l: "العائد السنوي المتوقع (0.12 = 12%)" },
              { k: "volatility", l: "التذبذب السنوي (0.25 = 25%)" },
              { k: "leverage", l: "الرافعة المالية (1 = بدون، حتى 1.4)" },
              { k: "simulations", l: "عدد المحاكاة (500 - 10000)" },
            ].map((x) => (
              <div key={x.k}>
                <Label>{x.l}</Label>
                <Input type="number" step="any" value={(form as any)[x.k]}
                  onChange={(e) => setForm({ ...form, [x.k]: parseFloat(e.target.value) || 0 })} />
              </div>
            ))}
            <Button onClick={submit} disabled={busy} className="w-full">
              <PlayCircle className="h-4 w-4 me-2" /> {busy ? "جاري المحاكاة..." : "شغّل المحاكاة"}
            </Button>
          </Card>

          <Card className="p-5">
            {!result && <p className="text-muted-foreground">شغّل محاكاة لترى النتائج هنا.</p>}
            {result && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">نتائج بعد {result.months} شهراً</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Stat label="متشائم (P10)" val={result.p10} />
                  <Stat label="متوسط (P50)" val={result.p50} />
                  <Stat label="متفائل (P90)" val={result.p90} />
                  <Stat label="المتوسط الحسابي" val={result.mean} />
                  <Stat label="احتمال الخسارة" val={`${(result.probability_of_loss * 100).toFixed(1)}%`} highlight={result.probability_of_loss > 0.3} />
                </div>
                <SparkLines paths={result.sample_paths} />
                <div className="flex gap-2 pt-2 border-t">
                  <SaveToHistoryButton
                    tool="time_machine"
                    title={`محاكاة ${form.years} سنوات`}
                    summary={`P50=${Number(result.p50).toLocaleString("ar-SA")} — احتمال الخسارة ${(result.probability_of_loss * 100).toFixed(1)}%`}
                    payload={{ input: form, result }}
                  />
                  <PdfExportButton
                    title="تقرير آلة الزمن"
                    subtitle={`محاكاة ${form.simulations} — ${form.years} سنوات`}
                    sections={[
                      { heading: "المدخلات", body: JSON.stringify(form, null, 2) },
                      { heading: "النتائج الاحتمالية", body: `متشائم P10: ${result.p10}\nمتوسط P50: ${result.p50}\nمتفائل P90: ${result.p90}\nالمتوسط: ${result.mean}\nاحتمال الخسارة: ${(result.probability_of_loss * 100).toFixed(1)}%` },
                      { heading: "التفسير", body: result.probability_of_loss > 0.3 ? "المخاطر مرتفعة — راجع الرافعة أو مدة الاستثمار." : "المخاطر ضمن المقبول لهذه الاستراتيجية." },
                    ]}
                    filename="time-machine-report.pdf"
                  />
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, val, highlight }: { label: string; val: any; highlight?: boolean }) {
  return (
    <div className={`rounded border p-2 ${highlight ? "border-red-500 bg-red-50 dark:bg-red-950" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold">{typeof val === "number" ? val.toLocaleString("ar-SA") : val}</div>
    </div>
  );
}

function SparkLines({ paths }: { paths: number[][] }) {
  if (!paths?.length) return null;
  const all = paths.flat();
  const min = Math.min(...all), max = Math.max(...all);
  const w = 400, h = 120;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {paths.map((p, i) => {
        const d = p.map((v, x) => {
          const px = (x / (p.length - 1)) * w;
          const py = h - ((v - min) / (max - min || 1)) * h;
          return `${x === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
        }).join(" ");
        return <path key={i} d={d} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />;
      })}
    </svg>
  );
}
