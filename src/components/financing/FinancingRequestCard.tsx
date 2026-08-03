import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileCheck2, AlertOctagon, Clock, CheckCircle2, XCircle, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  submitFinancingRequest,
  listMyFinancingRequests,
  cancelFinancingRequest,
  requestWithdrawCash,
} from "@/lib/financing-requests.functions";

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  pending:       { label: "قيد مراجعة الإدارة", cls: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: Clock },
  auto_rejected: { label: "رفض تلقائي",        cls: "bg-red-500/15 text-red-600 border-red-500/30",     icon: AlertOctagon },
  approved:      { label: "موافَق عليه",       cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  rejected:      { label: "مرفوض من الإدارة",  cls: "bg-red-500/15 text-red-600 border-red-500/30",     icon: XCircle },
  cancelled:     { label: "أُلغي بواسطتك",     cls: "bg-muted text-muted-foreground border-border",     icon: Ban },
};

export function FinancingRequestCard() {
  const submit = useServerFn(submitFinancingRequest);
  const cancel = useServerFn(cancelFinancingRequest);
  const withdraw = useServerFn(requestWithdrawCash);
  const qc = useQueryClient();

  const [deposit, setDeposit] = useState<number>(10000);
  const [loan, setLoan] = useState<number>(7000);
  const [busy, setBusy] = useState(false);
  const [withdrawAmt, setWithdrawAmt] = useState<number>(0);

  const list = useQuery({
    queryKey: ["financing-requests", "me"],
    queryFn: () => listMyFinancingRequests(),
  });

  const required = loan * 1.4;
  const localOk = deposit >= 10000 && required <= deposit;

  async function onSubmit() {
    setBusy(true);
    try {
      const r = await submit({ data: { deposit_amount: deposit, requested_loan: loan } });
      if (r.ok) toast.success("تم إرسال طلبك للإدارة للمراجعة");
      else toast.error("رُفض تلقائياً — راجع الأسباب أدناه");
      qc.invalidateQueries({ queryKey: ["financing-requests"] });
    } catch (e: any) {
      toast.error(e?.message ?? "تعذّر إرسال الطلب");
    } finally { setBusy(false); }
  }

  async function onCancel(id: string) {
    try {
      await cancel({ data: { id } });
      toast.success("أُلغي الطلب");
      qc.invalidateQueries({ queryKey: ["financing-requests"] });
    } catch (e: any) { toast.error(e?.message ?? "تعذّر الإلغاء"); }
  }

  async function onWithdraw() {
    if (withdrawAmt <= 0) return;
    try {
      const r = await withdraw({ data: { amount: withdrawAmt } });
      if (r.ok) toast.success(`سُحب ${r.withdrawn} ر.س — المتبقي كفائض ${r.remaining_surplus?.toFixed(2)}`);
      else {
        toast.error(
          `لا يمكن السحب: الفائض المتاح ${r.withdrawable_surplus?.toFixed(2) ?? 0} ر.س فقط ` +
          `(الرصيد ${r.cash?.toFixed(2)} — الضمان المطلوب ${r.required_collateral?.toFixed(2)})`
        );
      }
    } catch (e: any) { toast.error(e?.message ?? "فشل السحب"); }
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-primary" /> تقديم طلب تمويل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <div className="font-semibold mb-2">شروط قبول الطلب</div>
            <ul className="list-disc pr-5 space-y-1 text-muted-foreground">
              <li>حساب موثّق بهوية معتمدة (KYC).</li>
              <li>حد أدنى للإيداع: <b>10,000 ر.س</b>.</li>
              <li>الرافعة المالية القصوى <b>140٪</b> (الضمان ≥ 1.4 × القرض).</li>
              <li>حساب سوق موازي نشط ورصيد نقدي فعلي يغطي الضمان.</li>
              <li>لا يمكن سحب رأس المال من السوق الموازي إلا <b>الفائض</b> عن متطلب الرافعة.</li>
            </ul>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>مبلغ الإيداع (الضمان) — ر.س</Label>
              <Input type="number" min={0} value={deposit}
                onChange={e => setDeposit(Math.max(0, Number(e.target.value)))}
                className="font-mono mt-1" />
            </div>
            <div>
              <Label>مبلغ التمويل المطلوب — ر.س</Label>
              <Input type="number" min={0} value={loan}
                onChange={e => setLoan(Math.max(0, Number(e.target.value)))}
                className="font-mono mt-1" />
            </div>
          </div>

          <div className={`rounded-lg border p-3 text-sm ${localOk ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
            {localOk ? (
              <>مبدئياً مؤهل — الضمان المطلوب {required.toFixed(0)} ر.س ≤ إيداعك {deposit.toFixed(0)} ر.س.</>
            ) : (
              <>غير مؤهل مبدئياً — الضمان المطلوب {required.toFixed(0)} ر.س. عدّل الأرقام قبل الإرسال.</>
            )}
          </div>

          <Button onClick={onSubmit} disabled={busy} className="w-full">
            {busy ? "جارٍ الإرسال..." : "إرسال الطلب للإدارة"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">طلباتي السابقة</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {list.isLoading && <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>}
          {list.data && list.data.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد طلبات بعد.</p>
          )}
          {list.data?.map((r: any) => {
            const s = STATUS[r.status] ?? STATUS.pending;
            const Icon = s.icon;
            return (
              <div key={r.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className={s.cls}><Icon className="w-3 h-3 me-1" />{s.label}</Badge>
                    <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</span>
                  </div>
                  {r.status === "pending" && (
                    <Button size="sm" variant="ghost" onClick={() => onCancel(r.id)}>إلغاء</Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Info k="الإيداع" v={`${Number(r.deposit_amount).toFixed(0)} ر.س`} />
                  <Info k="القرض" v={`${Number(r.requested_loan).toFixed(0)} ر.س`} />
                  <Info k="الرافعة" v={`${(Number(r.leverage_pct) * 100).toFixed(0)}٪`} />
                </div>
                {r.auto_reasons?.length > 0 && (
                  <div className="text-xs bg-red-500/5 border border-red-500/30 rounded p-2">
                    <div className="font-semibold text-red-600 mb-1">أسباب الرفض التلقائي:</div>
                    <ul className="list-disc pr-5 space-y-0.5 text-muted-foreground">
                      {r.auto_reasons.map((x: string, i: number) => <li key={i}>{x}</li>)}
                    </ul>
                  </div>
                )}
                {r.admin_notes && (
                  <div className="text-xs bg-muted/40 rounded p-2">
                    <b>ملاحظات الإدارة:</b> {r.admin_notes}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">سحب النقد (فائض فقط)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            يُسمح فقط بسحب المبلغ الذي يزيد عن متطلب الرافعة (140٪ من إجمالي القروض المفتوحة). حتى رأس مالك محجوز كضمان.
          </p>
          <div className="flex gap-2">
            <Input type="number" min={0} value={withdrawAmt}
              onChange={e => setWithdrawAmt(Math.max(0, Number(e.target.value)))}
              className="font-mono" placeholder="المبلغ" />
            <Button onClick={onWithdraw} disabled={withdrawAmt <= 0}>سحب</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded border bg-background p-2">
      <div className="text-[10px] text-muted-foreground">{k}</div>
      <div className="font-mono font-bold">{v}</div>
    </div>
  );
}
