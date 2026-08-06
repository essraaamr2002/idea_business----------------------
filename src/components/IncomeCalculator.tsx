import { useMemo, useState } from "react";
import { Banknote, CircleAlert, PiggyBank, ReceiptText, TrendingUp } from "lucide-react";

function safeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value);
}

function MoneyInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 pe-14 text-sm font-bold tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">ر.س</span>
      </div>
    </label>
  );
}

export function IncomeCalculator() {
  const [salary, setSalary] = useState("10000");
  const [business, setBusiness] = useState("0");
  const [otherIncome, setOtherIncome] = useState("0");
  const [fixedExpenses, setFixedExpenses] = useState("4500");
  const [variableExpenses, setVariableExpenses] = useState("1500");
  const [debtPayments, setDebtPayments] = useState("0");
  const [reserveRate, setReserveRate] = useState("20");

  const result = useMemo(() => {
    const grossMonthly = safeNumber(salary) + safeNumber(business) + safeNumber(otherIncome);
    const expensesMonthly = safeNumber(fixedExpenses) + safeNumber(variableExpenses) + safeNumber(debtPayments);
    const netMonthly = grossMonthly - expensesMonthly;
    const safeNet = Math.max(0, netMonthly);
    const reservePercent = Math.min(100, safeNumber(reserveRate));
    const emergencyReserve = safeNet * (reservePercent / 100);
    const investableMonthly = Math.max(0, safeNet - emergencyReserve);
    return {
      grossMonthly,
      expensesMonthly,
      netMonthly,
      emergencyReserve,
      investableMonthly,
      annualIncome: grossMonthly * 12,
      annualNet: netMonthly * 12,
      annualInvestable: investableMonthly * 12,
      expenseRatio: grossMonthly > 0 ? (expensesMonthly / grossMonthly) * 100 : 0,
      savingsRatio: grossMonthly > 0 ? (safeNet / grossMonthly) * 100 : 0,
    };
  }, [salary, business, otherIncome, fixedExpenses, variableExpenses, debtPayments, reserveRate]);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 md:col-span-2" aria-labelledby="income-calculator-title">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Banknote className="h-5 w-5" /></div>
        <div>
          <h2 id="income-calculator-title" className="text-lg font-black">حاسبة الدخل والقدرة الاستثمارية</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">أدخل متوسطاتك الشهرية لمعرفة صافي دخلك والمبلغ المتاح للاستثمار بعد المصروفات واحتياطي الطوارئ.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-300"><TrendingUp className="h-4 w-4" /> الدخل الشهري</h3>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <MoneyInput label="الراتب" value={salary} onChange={setSalary} />
            <MoneyInput label="دخل الأعمال" value={business} onChange={setBusiness} />
            <MoneyInput label="دخل إضافي" value={otherIncome} onChange={setOtherIncome} />
          </div>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-rose-700 dark:text-rose-300"><ReceiptText className="h-4 w-4" /> المصروفات والالتزامات الشهرية</h3>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <MoneyInput label="مصروفات ثابتة" value={fixedExpenses} onChange={setFixedExpenses} />
            <MoneyInput label="مصروفات متغيرة" value={variableExpenses} onChange={setVariableExpenses} />
            <MoneyInput label="أقساط وديون" value={debtPayments} onChange={setDebtPayments} />
          </div>
        </div>
      </div>

      <label className="mt-5 block rounded-xl border border-border bg-muted/40 p-4">
        <span className="flex items-center justify-between gap-3 text-sm font-black"><span className="flex items-center gap-2"><PiggyBank className="h-4 w-4 text-primary" /> احتياطي الطوارئ من صافي الدخل</span><strong className="text-primary">{Math.min(100, safeNumber(reserveRate)).toFixed(0)}%</strong></span>
        <input type="range" min="0" max="100" step="1" value={Math.min(100, safeNumber(reserveRate))} onChange={(event) => setReserveRate(event.target.value)} className="mt-3 w-full accent-primary" />
      </label>

      {result.netMonthly < 0 && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-bold text-destructive">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> المصروفات تتجاوز الدخل بمقدار {formatMoney(Math.abs(result.netMonthly))} شهريًا. لا توجد قدرة استثمارية آمنة حاليًا.
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Result label="إجمالي الدخل الشهري" value={formatMoney(result.grossMonthly)} />
        <Result label="صافي الدخل الشهري" value={formatMoney(result.netMonthly)} negative={result.netMonthly < 0} />
        <Result label="احتياطي الطوارئ" value={formatMoney(result.emergencyReserve)} />
        <Result label="المتاح للاستثمار شهريًا" value={formatMoney(result.investableMonthly)} highlight />
      </div>

      <div className="mt-3 grid gap-3 rounded-xl bg-slate-950 p-4 text-slate-100 sm:grid-cols-2 lg:grid-cols-4">
        <Result label="الدخل السنوي" value={formatMoney(result.annualIncome)} dark />
        <Result label="صافي الدخل السنوي" value={formatMoney(result.annualNet)} dark negative={result.annualNet < 0} />
        <Result label="المتاح للاستثمار سنويًا" value={formatMoney(result.annualInvestable)} dark highlight />
        <Result label="نسبة الادخار / المصروفات" value={`${result.savingsRatio.toFixed(1)}% / ${result.expenseRatio.toFixed(1)}%`} dark />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">النتائج تقديرية وتعتمد على البيانات المدخلة، ولا تشمل الضرائب الشخصية أو تقلب الدخل أو الالتزامات غير المسجلة. يُفضّل الاحتفاظ باحتياطي طوارئ قبل الاستثمار.</p>
    </section>
  );
}

function Result({ label, value, highlight, negative, dark }: { label: string; value: string; highlight?: boolean; negative?: boolean; dark?: boolean }) {
  return (
    <div className={`min-w-0 rounded-xl border p-3 ${dark ? "border-slate-700 bg-slate-900" : highlight ? "border-primary/30 bg-primary/10" : "border-border bg-background"}`}>
      <div className={`text-[11px] font-bold ${dark ? "text-slate-300" : "text-muted-foreground"}`}>{label}</div>
      <div className={`mt-1 break-words text-base font-black tabular-nums ${negative ? "text-destructive" : highlight ? "text-primary" : dark ? "text-white" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
