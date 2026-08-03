import { useMemo, useState } from "react";

export function ZakatCalculator() {
  const [cash, setCash] = useState(0);
  const [gold, setGold] = useState(0);
  const [investments, setInvestments] = useState(0);
  const [debts, setDebts] = useState(0);
  const nisab = 25000; // SAR approx
  const total = cash + gold + investments - debts;
  const zakat = useMemo(() => (total >= nisab ? total * 0.025 : 0), [total]);

  const Field = ({ label, value, set }: { label: string; value: number; set: (n: number) => void }) => (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => set(Number(e.target.value) || 0)}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
    </label>
  );

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <h3 className="mb-3 text-lg font-bold">حاسبة الزكاة</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="النقد والودائع (SAR)" value={cash} set={setCash} />
        <Field label="قيمة الذهب والفضة (SAR)" value={gold} set={setGold} />
        <Field label="الاستثمارات والأسهم (SAR)" value={investments} set={setInvestments} />
        <Field label="الديون المستحقة (SAR)" value={debts} set={setDebts} />
      </div>
      <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="text-xs text-muted-foreground">الزكاة المستحقة (2.5%)</div>
        <div className="mt-1 text-2xl font-bold text-primary">{zakat.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} SAR</div>
        {total < nisab && <div className="mt-1 text-xs text-muted-foreground">المجموع أقل من النصاب ({nisab.toLocaleString()} SAR) — لا زكاة.</div>}
      </div>
    </div>
  );
}
