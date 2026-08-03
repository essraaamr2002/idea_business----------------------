import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

type Props = {
  sharePrice: number;
  currency: string;
  remaining: number;
  targetRoiPct?: number | null;
};

export function ROISlider({ sharePrice, currency, remaining, targetRoiPct }: Props) {
  const minAmount = Math.max(sharePrice, 100);
  const maxAmount = Math.max(minAmount, Math.floor(sharePrice * Math.max(remaining, 1)));
  const [amount, setAmount] = useState(Math.min(minAmount * 10, maxAmount));

  const roi = Math.max(0, Number(targetRoiPct ?? 15));
  const result = useMemo(() => {
    const shares = Math.floor(amount / Math.max(sharePrice, 0.01));
    const yearly = (amount * roi) / 100;
    return { shares, yearly };
  }, [amount, sharePrice, roi]);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-primary" />
          حاسبة العوائد التقديرية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">مبلغ الاستثمار</span>
          <strong className="text-lg">{amount.toLocaleString("ar")} {currency}</strong>
        </div>
        <input
          type="range"
          min={minAmount}
          max={maxAmount}
          step={Math.max(1, Math.round(sharePrice))}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-xl border border-border bg-card/60 p-3">
            <div className="text-[11px] text-muted-foreground">عدد الأسهم</div>
            <div className="text-xl font-extrabold">{result.shares.toLocaleString("ar")}</div>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="text-[11px] text-emerald-700">العائد السنوي التقديري ({roi}%)</div>
            <div className="text-xl font-extrabold text-emerald-700">
              {result.yearly.toLocaleString("ar", { maximumFractionDigits: 0 })} {currency}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          * الأرقام تقديرية بناءً على ما أدخله صاحب المشروع، ولا تُعدّ ضمانة للعوائد الفعلية.
        </p>
      </CardContent>
    </Card>
  );
}
