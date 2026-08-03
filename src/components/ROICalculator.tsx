import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calculator, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function ROICalculator() {
  const { lang } = useI18n();
  const [amount, setAmount] = useState(1000);
  const [years, setYears] = useState(3);
  const [annualReturn, setAnnualReturn] = useState(18);

  const tr = {
    title: lang === "ar" ? "حاسبة العائد المتوقع" : "Expected return calculator",
    amount: lang === "ar" ? "مبلغ الاستثمار (USD)" : "Investment amount (USD)",
    years: lang === "ar" ? "عدد السنوات" : "Years",
    annual: lang === "ar" ? "عائد سنوي متوقع" : "Expected annual return",
    future: lang === "ar" ? "القيمة المستقبلية" : "Future value",
    profit: lang === "ar" ? "صافي الربح" : "Net profit",
    multiple: lang === "ar" ? "مضاعف رأس المال" : "Capital multiple",
    note:
      lang === "ar"
        ? "* الأرقام تقديرية لأغراض توضيحية فقط ولا تمثل ضماناً بالعائد. العوائد الفعلية تختلف حسب أداء كل مشروع."
        : "* Figures are estimates for illustration only and are not a guaranteed return. Actual returns depend on each project's performance.",
  };

  const result = useMemo(() => {
    const r = annualReturn / 100;
    const future = amount * Math.pow(1 + r, years);
    const profit = future - amount;
    return {
      future: Math.round(future),
      profit: Math.round(profit),
      multiple: future / amount,
    };
  }, [amount, years, annualReturn]);

  return (
    <Card className="border-primary/30 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          {tr.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="amt">{tr.amount}</Label>
            <Input id="amt" type="number" min={100} dir="ltr" value={amount} onChange={(e) => setAmount(Math.max(100, Number(e.target.value) || 0))} />
          </div>
          <div className="space-y-2">
            <Label>
              {tr.years}: <span className="font-black text-primary">{years}</span>
            </Label>
            <Slider value={[years]} min={1} max={10} step={1} onValueChange={(v) => setYears(v[0])} />
          </div>
          <div className="space-y-2">
            <Label>
              {tr.annual}: <span className="font-black text-primary">{annualReturn}%</span>
            </Label>
            <Slider value={[annualReturn]} min={5} max={40} step={1} onValueChange={(v) => setAnnualReturn(v[0])} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="text-xs font-bold text-muted-foreground">{tr.future}</div>
            <div className="mt-1 text-2xl font-black tabular-nums">${result.future.toLocaleString("en")}</div>
          </div>
          <div className="rounded-xl border border-success/40 bg-success/10 p-4">
            <div className="flex items-center gap-1 text-xs font-bold text-success">
              <TrendingUp className="h-3.5 w-3.5" /> {tr.profit}
            </div>
            <div className="mt-1 text-2xl font-black tabular-nums text-success">+${result.profit.toLocaleString("en")}</div>
          </div>
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
            <div className="text-xs font-bold text-primary">{tr.multiple}</div>
            <div className="mt-1 text-2xl font-black tabular-nums text-primary">x{result.multiple.toFixed(2)}</div>
          </div>
        </div>

        <p className="text-[11px] font-medium text-muted-foreground">{tr.note}</p>
      </CardContent>
    </Card>
  );
}
