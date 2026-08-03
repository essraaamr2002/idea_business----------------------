import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Wallet, Copy, ArrowDownToLine, ArrowUpFromLine, Send, ShieldCheck, Lock, Unlock,
  CheckCircle2, Clock, Loader2, KeyRound, AlertTriangle, ArrowRight,
} from "lucide-react";
import {
  getMyWalletReal, setWalletPin,
  p2pTransfer, lookupRecipient, freezeWalletSelf, unfreezeWalletSelf,
} from "@/lib/wallet-real.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/wallet-pro")({
  component: WalletProPage,
  head: () => ({
    meta: [
      { title: "المحفظة الرقمية — IDEA BUSINESS" },
      { name: "description", content: "محفظتك بالريال السعودي: إيداع، سحب، تحويلات بين الأعضاء، PIN، تجميد ذاتي، كشف حساب." },
    ],
  }),
});

const PLATFORM = {
  bank: "البنك الأهلي السعودي (SNB)",
  iban: "SA03 8000 0000 6080 1016 7519",
  holder: "شركة IDEA BUSINESS للخدمات المالية",
};

function fmtSar(minorOrSar: number, isMinor = false) {
  const sar = isMinor ? minorOrSar / 100 : minorOrSar;
  return sar.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function WalletProPage() {
  const getFn = useServerFn(getMyWalletReal);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["wallet-real"], queryFn: () => getFn() });

  if (isLoading) return <WorkspaceShell><div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin inline" /></div></WorkspaceShell>;
  const w = data?.wallet;
  if (!w) return <WorkspaceShell><Card><CardContent className="p-10 text-center">لا توجد محفظة بعد. أعد تحميل الصفحة.</CardContent></Card></WorkspaceShell>;

  const balance = Number(w.balance || 0);
  const held = Number(w.held || 0);
  const total = balance + held;
  const frozen = w.self_frozen || w.status === "frozen";

  return (
    <WorkspaceShell>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Wallet className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-bold">المحفظة الرقمية</h1>
              <p className="text-xs text-muted-foreground">بالريال السعودي — نظام آمن متوافق مع SAMA</p>
            </div>
          </div>
          <Badge variant={frozen ? "destructive" : "secondary"} className="text-xs">
            الحالة: {frozen ? "مجمدة" : w.status === "active" ? "نشطة" : w.status}
          </Badge>
        </div>

        {/* Balance card */}
        <Card className="overflow-hidden">
          <CardContent className="p-6 bg-gradient-to-bl from-primary/10 to-transparent">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">الرصيد المتاح</div>
                <div className="text-3xl font-bold">{fmtSar(balance)} <span className="text-sm">SAR</span></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">رصيد محجوز (Escrow)</div>
                <div className="text-3xl font-bold text-amber-500">{fmtSar(held)} <span className="text-sm">SAR</span></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">الإجمالي</div>
                <div className="text-3xl font-bold">{fmtSar(total)} <span className="text-sm">SAR</span></div>
              </div>
            </div>
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <CopyChip label="رقم المحفظة" value={w.wallet_code || "—"} />
              <CopyChip label="IBAN افتراضي" value={w.virtual_iban || "—"} mono />
            </div>
          </CardContent>
        </Card>

        {/* Action tabs */}
        <Tabs defaultValue="deposit">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="deposit"><ArrowDownToLine className="h-4 w-4 ml-1" /> إيداع</TabsTrigger>
            <TabsTrigger value="transfer"><Send className="h-4 w-4 ml-1" /> تحويل</TabsTrigger>
            <TabsTrigger value="withdraw"><ArrowUpFromLine className="h-4 w-4 ml-1" /> سحب</TabsTrigger>
            <TabsTrigger value="history"><Clock className="h-4 w-4 ml-1" /> السجل</TabsTrigger>
            <TabsTrigger value="security"><ShieldCheck className="h-4 w-4 ml-1" /> الأمان</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="mt-4"><DepositTab onSuccess={refetch} /></TabsContent>
          <TabsContent value="transfer" className="mt-4"><TransferTab hasPin={!!w.has_pin} onSuccess={refetch} /></TabsContent>
          <TabsContent value="withdraw" className="mt-4">
            <Card>
              <CardContent className="p-6 text-sm space-y-3">
                <p>طلبات السحب تتم عبر القناة الموجودة في صفحة المحفظة الأساسية بالكامل (يستخدم نفس <code>request_payout</code> مع OTP).</p>
                <Button asChild><Link to="/wallet">الذهاب إلى صفحة السحب الكاملة</Link></Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history" className="mt-4"><HistoryTab ledger={data?.ledger || []} /></TabsContent>
          <TabsContent value="security" className="mt-4"><SecurityTab hasPin={!!w.has_pin} frozen={frozen} onChange={refetch} /></TabsContent>
        </Tabs>
      </div>
    </WorkspaceShell>
  );
}

function CopyChip({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); toast.success("تم النسخ"); }}
      className="text-right rounded-lg border bg-background p-3 hover:border-primary transition-colors"
    >
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-semibold flex items-center justify-between gap-2 ${mono ? "font-mono tracking-wider" : ""}`}>
        <span className="truncate">{value}</span>
        <Copy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </div>
    </button>
  );
}

function DepositTab({ onSuccess: _onSuccess }: { onSuccess: () => void }) {
  const [amount, setAmount] = useState("");

  const start = () => {
    const v = Number(amount);
    if (!v || v < 1) { toast.error("أدخل مبلغاً صالحاً"); return; }
    window.location.href = `/pay?amount=${encodeURIComponent(String(v))}&currency=SAR&purpose=wallet_topup`;
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">شحن المحفظة بالدفع الإلكتروني</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label>المبلغ (SAR)</Label>
          <Input type="number" min="1" placeholder="مثال: 500" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button onClick={start} disabled={!Number(amount)} className="w-full">
            متابعة إلى بوابة الدفع الآمنة
          </Button>
          <p className="text-xs text-muted-foreground">يُضاف الرصيد تلقائياً فور تأكيد البوابة للدفع (Webhook). لا يوجد شحن يدوي أو تحويل بنكي.</p>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/40">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> جدار حماية المحفظة</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <div>• يُكتب الرصيد فقط بعد تأكيد البوابة (لا قيد قبل الدفع الفعلي).</div>
          <div>• كل عملية تُسجَّل في دفتر الأستاذ (Ledger) مع رصيد قبل/بعد.</div>
          <div>• فاتورة PDF تصدر تلقائياً ويمكنك تنزيلها من <a className="text-primary font-bold" href="/invoices">صفحة فواتيري</a>.</div>
          <div>• تجميد ذاتي ورمز PIN للتحويلات + فترة انتظار 14 يوماً للسحب.</div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v, mono, highlight }: { k: string; v: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{k}</span>
      <button
        onClick={() => { navigator.clipboard.writeText(v); toast.success("تم النسخ"); }}
        className={`text-right text-sm font-semibold flex items-center gap-1.5 hover:text-primary ${mono ? "font-mono tracking-wider" : ""} ${highlight ? "text-primary text-base" : ""}`}
      >
        {v} <Copy className="h-3 w-3 opacity-50" />
      </button>
    </div>
  );
}

function TransferTab({ hasPin, onSuccess }: { hasPin: boolean; onSuccess: () => void }) {
  const lookupFn = useServerFn(lookupRecipient);
  const transferFn = useServerFn(p2pTransfer);
  const [code, setCode] = useState("");
  const [recipient, setRecipient] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [note, setNote] = useState("");

  const lookup = useMutation({
    mutationFn: async () => lookupFn({ data: { walletCode: code.toUpperCase() } }),
    onSuccess: (r) => { if (!r) toast.error("لم يتم العثور على المحفظة"); setRecipient(r); },
    onError: (e: any) => toast.error(e.message),
  });
  const transfer = useMutation({
    mutationFn: async () => transferFn({ data: { toUserId: recipient.user_id, amountSar: Number(amount), pin, note: note || undefined } }),
    onSuccess: (r: any) => { toast.success(`تم التحويل — مرجع ${r?.reference || "—"}`); setAmount(""); setPin(""); setNote(""); setRecipient(null); setCode(""); onSuccess(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!hasPin) {
    return (
      <Card><CardContent className="p-6 text-sm space-y-3">
        <div className="flex items-center gap-2 text-amber-500"><AlertTriangle className="h-5 w-5" /> يجب تعيين PIN قبل إجراء التحويلات.</div>
        <p className="text-muted-foreground">انتقل إلى تبويب "الأمان" وعيّن رمز PIN مكوّن من 6 أرقام.</p>
      </CardContent></Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="grid sm:grid-cols-[1fr_auto] gap-2">
          <div>
            <Label>رقم محفظة المستلم (IDB-XXXXXXXX)</Label>
            <Input placeholder="IDB-12345678" value={code} onChange={(e) => setCode(e.target.value)} className="font-mono mt-1" />
          </div>
          <Button className="self-end" onClick={() => lookup.mutate()} disabled={!/^IDB-\d{8}$/i.test(code) || lookup.isPending}>
            {lookup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "بحث"}
          </Button>
        </div>

        {recipient && (
          <div className="rounded-lg border p-3 flex items-center justify-between bg-muted/30">
            <div>
              <div className="text-xs text-muted-foreground">المستلم</div>
              <div className="font-semibold">{recipient.masked_name}</div>
              <div className="text-xs font-mono">{recipient.wallet_code}</div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
        )}

        {recipient && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>المبلغ (SAR)</Label>
                <Input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>ملاحظة (اختياري)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" maxLength={140} />
              </div>
            </div>
            <div>
              <Label>رمز PIN (6 أرقام)</Label>
              <Input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} className="mt-1 font-mono tracking-widest" />
            </div>
            <Button onClick={() => transfer.mutate()} disabled={!Number(amount) || pin.length !== 6 || transfer.isPending} className="w-full">
              {transfer.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تأكيد التحويل <ArrowRight className="h-4 w-4 mr-1" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryTab({ ledger }: { ledger: any[] }) {
  if (!ledger.length) return <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">لا توجد عمليات بعد.</CardContent></Card>;
  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b">
            <tr className="text-right">
              <th className="p-3">النوع</th><th>المرجع</th><th>المبلغ</th><th>الرصيد بعد</th><th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((l) => (
              <tr key={l.id} className="border-b last:border-0">
                <td className="p-3"><Badge variant="outline" className="font-normal">{l.type}</Badge></td>
                <td className="font-mono text-xs">{l.reference || "—"}</td>
                <td className={l.amount < 0 ? "text-rose-500 font-semibold" : "text-emerald-500 font-semibold"}>
                  {l.amount > 0 ? "+" : ""}{fmtSar(l.amount, true)}
                </td>
                <td>{fmtSar(l.balance_after, true)}</td>
                <td className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("ar-SA")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function SecurityTab({ hasPin, frozen, onChange }: { hasPin: boolean; frozen: boolean; onChange: () => void }) {
  const setPinFn = useServerFn(setWalletPin);
  const freezeFn = useServerFn(freezeWalletSelf);
  const unfreezeFn = useServerFn(unfreezeWalletSelf);
  const qc = useQueryClient();

  const [pinOpen, setPinOpen] = useState(false);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [otp, setOtp] = useState("");
  const [unfreezeOpen, setUnfreezeOpen] = useState(false);

  const pinMut = useMutation({
    mutationFn: async () => setPinFn({ data: { oldPin: hasPin ? oldPin : undefined, newPin } }),
    onSuccess: () => { toast.success("تم تحديث رمز PIN"); setPinOpen(false); setOldPin(""); setNewPin(""); qc.invalidateQueries({ queryKey: ["wallet-real"] }); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  const freezeMut = useMutation({
    mutationFn: async () => freezeFn({ data: {} }),
    onSuccess: () => { toast.success("تم تجميد المحفظة"); qc.invalidateQueries({ queryKey: ["wallet-real"] }); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  const unfreezeMut = useMutation({
    mutationFn: async () => unfreezeFn({ data: { otp } }),
    onSuccess: () => { toast.success("تم فك التجميد"); setUnfreezeOpen(false); setOtp(""); qc.invalidateQueries({ queryKey: ["wallet-real"] }); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> رمز PIN للمحفظة</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">رمز مستقل عن كلمة سر الحساب — مطلوب لكل تحويل. القفل التلقائي بعد 3 محاولات خاطئة لمدة 15 دقيقة.</p>
          <div className="flex items-center gap-2">
            <Badge variant={hasPin ? "default" : "secondary"}>{hasPin ? "مفعّل" : "غير مفعّل"}</Badge>
            <Button size="sm" onClick={() => setPinOpen(true)}>{hasPin ? "تغيير PIN" : "تعيين PIN"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" /> التجميد الذاتي للمحفظة</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">في حال فقد الهاتف — اضغط لتجميد محفظتك فوراً ومنع أي عمليات.</p>
          {!frozen ? (
            <Button variant="destructive" size="sm" onClick={() => freezeMut.mutate()} disabled={freezeMut.isPending}>
              <Lock className="h-4 w-4 ml-1" /> تجميد المحفظة الآن
            </Button>
          ) : (
            <div className="space-y-2">
              <Badge variant="destructive">المحفظة مجمدة</Badge>
              <Button size="sm" variant="outline" onClick={() => setUnfreezeOpen(true)}>
                <Unlock className="h-4 w-4 ml-1" /> فك التجميد عبر OTP
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Set/Change PIN dialog */}
      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{hasPin ? "تغيير رمز PIN" : "تعيين رمز PIN"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {hasPin && (
              <div>
                <Label>الرمز الحالي</Label>
                <Input type="password" inputMode="numeric" maxLength={6} value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))} className="mt-1 font-mono tracking-widest" />
              </div>
            )}
            <div>
              <Label>الرمز الجديد (6 أرقام)</Label>
              <Input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} className="mt-1 font-mono tracking-widest" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => pinMut.mutate()} disabled={newPin.length !== 6 || (hasPin && oldPin.length !== 6) || pinMut.isPending}>
              {pinMut.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unfreeze dialog */}
      <Dialog open={unfreezeOpen} onOpenChange={setUnfreezeOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>فك التجميد</DialogTitle></DialogHeader>
          <div>
            <Label>أدخل رمز OTP المرسل لرقمك</Label>
            <Input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} className="mt-1 font-mono tracking-widest" />
            <p className="text-xs text-muted-foreground mt-2">للأغراض التجريبية: أي 6 أرقام مقبولة.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => unfreezeMut.mutate()} disabled={otp.length !== 6 || unfreezeMut.isPending}>تأكيد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
