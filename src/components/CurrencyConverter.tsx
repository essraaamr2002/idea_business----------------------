import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";

const RATES: Record<string, number> = { SAR: 1, USD: 0.2666, EUR: 0.2469, AED: 0.9795, EGP: 13.18, GBP: 0.2117 };

export function CurrencyConverter() {
  const [amount, setAmount] = useState(1000);
  const [from, setFrom] = useState("SAR");
  const [to, setTo] = useState("USD");
  const result = (amount / RATES[from]) * RATES[to];
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-black"><ArrowRightLeft className="h-4 w-4 text-primary" /> محوّل العملات</h3>
      <div className="grid grid-cols-3 gap-2">
        <input type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} className="col-span-3 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        <select value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-border bg-background px-2 py-2 text-sm">{Object.keys(RATES).map(c => <option key={c}>{c}</option>)}</select>
        <button onClick={() => { setFrom(to); setTo(from); }} className="rounded-md border border-border bg-card text-sm hover:border-primary">⇄</button>
        <select value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-border bg-background px-2 py-2 text-sm">{Object.keys(RATES).map(c => <option key={c}>{c}</option>)}</select>
      </div>
      <div className="mt-4 text-center">
        <div className="text-xs text-muted-foreground">القيمة المحوّلة</div>
        <div className="text-2xl font-black text-primary">{result.toLocaleString(undefined, { maximumFractionDigits: 2 })} {to}</div>
      </div>
    </div>
  );
}
