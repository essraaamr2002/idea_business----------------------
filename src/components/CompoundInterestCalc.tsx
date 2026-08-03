import { useState } from "react";
import { LineChart } from "lucide-react";

export function CompoundInterestCalc() {
  const [principal, setP] = useState(10000);
  const [rate, setR] = useState(12);
  const [years, setY] = useState(5);
  const [monthly, setM] = useState(500);
  const r = rate / 100;
  const fv = principal * Math.pow(1 + r, years) + monthly * 12 * ((Math.pow(1 + r, years) - 1) / r);
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <h3 className="inline-flex items-center gap-2 text-sm font-black"><LineChart className="h-4 w-4 text-primary" /> الفائدة المركبة</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <label className="space-y-1"><span className="text-xs text-muted-foreground">رأس المال</span><input type="number" value={principal} onChange={(e) => setP(+e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">إضافة شهرية</span><input type="number" value={monthly} onChange={(e) => setM(+e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">العائد السنوي %</span><input type="number" value={rate} onChange={(e) => setR(+e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="space-y-1"><span className="text-xs text-muted-foreground">عدد السنوات</span><input type="number" value={years} onChange={(e) => setY(+e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" /></label>
      </div>
      <div className="mt-4 rounded-xl bg-primary/10 p-4 text-center">
        <div className="text-xs text-muted-foreground">القيمة المستقبلية</div>
        <div className="text-2xl font-black text-primary">{Math.round(fv).toLocaleString()} ر.س</div>
      </div>
    </div>
  );
}
