import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { LiveTicker } from "@/components/LiveTicker";
import { ArrowDownToLine, ArrowUpFromLine, Send, Lock, Inbox, Copy, Check, Landmark, Loader2, ShieldCheck, LifeBuoy, Clock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { generateBankIban, verifyMyLedger } from "@/lib/bank-iban.functions";
import { listMyPayouts } from "@/lib/payout.functions";
import { listOtherUsers } from "@/lib/wallet.functions";
import { suggestTopupAmounts, smartPayoutRequest, openWalletTicket, p2pTransfer } from "@/lib/wallet-actions.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PushNotificationsCard } from "@/components/PushNotificationsCard";
import { WalletExportButtons } from "@/components/WalletExportButtons";
import { WalletTopupStatus } from "@/components/WalletTopupStatus";
import { WalletBalanceBreakdown } from "@/components/WalletBalanceBreakdown";
import { Link } from "@tanstack/react-router";
import { History } from "lucide-react";

export const Route = createFileRoute("/wallet")({
  component: WalletPage,
  validateSearch: (s: Record<string, unknown>) => ({ topup: s.topup === "1" || s.topup === 1 ? 1 : undefined }) as { topup?: 1 },
  head: () => ({
    meta: [
      { title: "المحفظة — IDEA BUSINESS" },
      { name: "description", content: "محفظتك الرقمية على IDEA BUSINESS: شحن آمن، تحويل بين الأعضاء، وسحب موثّق." },
    ],
  }),
});

type Wallet = { balance: number; held: number; currency: string; bank_iban: string | null };
type PayoutRow = { id: string; channel: string; destination_masked: string | null; amount_minor: number; status: string; created_at: string; eta_release_at?: string | null; reference?: string };
type UserOpt = { id: string; display_name: string | null };

function WalletPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const [wallet, setWallet] = useState<Wallet>({ balance: 0, held: 0, currency: "SAR", bank_iban: null });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Topup
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<number>(100);
  const [smartAmounts, setSmartAmounts] = useState<number[]>([50, 100, 250, 500, 1000]);
  useEffect(() => { if (search.topup === 1) setDepositOpen(true); }, [search.topup]);

  // Transfer (P2P)
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<number>(50);
  const [transferPin, setTransferPin] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [recipients, setRecipients] = useState<UserOpt[]>([]);

  // Support ticket
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketCategory, setTicketCategory] = useState<"wallet_issue" | "topup_problem" | "transfer_problem" | "withdrawal_problem" | "other">("wallet_issue");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  // Payout
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutChannel, setPayoutChannel] = useState<"vodafone_cash" | "barq" | "bank_iban">("bank_iban");
  const [payoutDest, setPayoutDest] = useState("");
  const [payoutAmount, setPayoutAmount] = useState<number>(100);
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);

  // Server fns
  const generateIban = useServerFn(generateBankIban);
  const verifyLedger = useServerFn(verifyMyLedger);
  const fetchPayouts = useServerFn(listMyPayouts);
  const fetchSuggest = useServerFn(suggestTopupAmounts);
  const fetchUsers = useServerFn(listOtherUsers);
  const doSmartPayout = useServerFn(smartPayoutRequest);
  const doTicket = useServerFn(openWalletTicket);
  const doTransfer = useServerFn(p2pTransfer);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const r = await verifyLedger();
      if (r.secure) toast.success("✓ سجل المعاملات سليم — لم يُكتشف أي تلاعب");
      else toast.error(`⚠ تحذير أمني: تم رصد تلاعب في القيد ${r.tamperedId ?? ""}`);
    } catch { toast.error("تعذّر التحقق"); }
    finally { setVerifying(false); }
  };

  const handleSmartPayout = async () => {
    if (!payoutDest.trim() || payoutAmount < 10) { toast.error("الحد الأدنى للسحب 10 ر.س"); return; }
    setPayoutSubmitting(true);
    try {
      const res = await doSmartPayout({ data: {
        channel: payoutChannel,
        destination: payoutDest.trim(),
        amountMinor: Math.round(payoutAmount * 100),
        currency: "SAR",
      }});
      const eta = new Date(res.eta_release_at).toLocaleDateString("ar-SA");
      toast.success(`تم إنشاء طلب السحب ${res.reference} — تذكرة #${res.ticket_id.slice(0,8)} — الإفراج: ${eta}`, { duration: 6000 });
      setPayoutOpen(false);
      setPayoutDest("");
      await Promise.all([loadPayouts(), loadWallet()]);
    } catch (e: any) {
      toast.error(e?.message ?? "تعذّر إنشاء طلب السحب");
    } finally { setPayoutSubmitting(false); }
  };

  const handleTransfer = async () => {
    if (!transferTo) { toast.error("اختر المستلم"); return; }
    if (transferAmount < 1) { toast.error("أدخل مبلغاً صحيحاً"); return; }
    if (transferPin.length < 4) { toast.error("أدخل رمز PIN المحفظة"); return; }
    setTransferSubmitting(true);
    try {
      const res = await doTransfer({ data: {
        toUserId: transferTo,
        amountMinor: Math.round(transferAmount * 100),
        pin: transferPin,
        note: transferNote || undefined,
      }});
      toast.success(`تم التحويل بنجاح — المرجع: ${res.reference}`);
      setTransferOpen(false);
      setTransferPin("");
      setTransferNote("");
      await loadWallet();
    } catch (e: any) {
      toast.error(e?.message ?? "تعذّر التحويل");
    } finally { setTransferSubmitting(false); }
  };

  const handleOpenTicket = async () => {
    if (ticketSubject.trim().length < 3) { toast.error("أدخل عنواناً واضحاً"); return; }
    if (ticketMessage.trim().length < 10) { toast.error("اشرح المشكلة (10 أحرف على الأقل)"); return; }
    setTicketSubmitting(true);
    try {
      const res = await doTicket({ data: { subject: ticketSubject.trim(), message: ticketMessage.trim(), category: ticketCategory } });
      toast.success(`تم إنشاء التذكرة #${res.ticket_id.slice(0,8)} — ستصلك إجابة الدعم قريباً`);
      setTicketOpen(false);
      setTicketSubject("");
      setTicketMessage("");
    } catch (e: any) {
      toast.error(e?.message ?? "تعذّر فتح التذكرة");
    } finally { setTicketSubmitting(false); }
  };

  const loadPayouts = async () => {
    try { const rows = await fetchPayouts(); setPayouts(rows as any); } catch { /* silent */ }
  };

  const loadWallet = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("wallets")
      .select("balance, held, currency, bank_iban")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setWallet({
        balance: Number(data.balance) || 0,
        held: Number(data.held) || 0,
        currency: data.currency || "SAR",
        bank_iban: data.bank_iban ?? null,
      });
    }
    setLoading(false);
  };

  const loadSuggestions = async () => {
    try {
      const r = await fetchSuggest();
      if (r?.suggestions?.length) {
        const uniq = Array.from(new Set(r.suggestions.map((n) => Math.max(10, Math.round(Number(n)))))).slice(0, 5);
        setSmartAmounts(uniq);
        if (r.last_amount) setDepositAmount(Math.round(Number(r.last_amount)));
      }
    } catch { /* silent */ }
  };

  const loadRecipients = async () => {
    try {
      const list = await fetchUsers();
      setRecipients(list.slice(0, 200) as any);
    } catch { /* silent */ }
  };

  useEffect(() => {
    let active = true;
    (async () => { if (active) { await Promise.all([loadWallet(), loadPayouts(), loadSuggestions()]); } })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleGenerateIban = async () => {
    if (!user) { toast.error("يجب تسجيل الدخول أولاً"); return; }
    setGenerating(true);
    try {
      const res = await generateIban();
      if (res.ok) { setWallet((w) => ({ ...w, bank_iban: res.iban })); toast.success("تم توليد IBAN بنجاح"); }
      else toast.error(res.error);
    } catch (e: any) { console.error(e); toast.error("حدث خطأ غير متوقع"); }
    finally { setGenerating(false); }
  };

  const handleCopy = async () => {
    if (!wallet.bank_iban) return;
    try {
      await navigator.clipboard.writeText(wallet.bank_iban);
      setCopied(true);
      toast.success("تم نسخ IBAN");
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("تعذّر النسخ"); }
  };

  const handleDeposit = async () => {
    if (!user) { toast.error("سجّل الدخول أولاً"); return; }
    if (!depositAmount || depositAmount < 10) { toast.error("الحد الأدنى للشحن 10 ر.س"); return; }
    setDepositOpen(false);
    // No balance is credited here. Balance is only added after the gateway
    // webhook confirms the payment landed in the company account.
    window.location.href = `/pay?amount=${encodeURIComponent(depositAmount)}&currency=SAR&purpose=wallet_topup`;
  };

  const openTransferDialog = async () => {
    setTransferOpen(true);
    if (recipients.length === 0) await loadRecipients();
  };

  return (
    <div className="min-h-screen bg-background">
      <WorkspaceShell ticker={<LiveTicker />}>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-black text-foreground">محفظتي</h1>

        <div className="rounded-3xl gradient-primary p-7 text-primary-foreground shadow-elevated">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-extrabold opacity-80">الرصيد المتاح</div>
              <div className="num mt-2 text-5xl font-black">{loading ? "—" : wallet.balance.toFixed(2)}</div>
              <div className="mt-1 text-sm font-bold opacity-90">ريال سعودي (SAR)</div>
            </div>
            <div className="text-end">
              <div className="text-xs font-extrabold opacity-80">محجوز</div>
              <div className="num mt-2 text-2xl font-black">{loading ? "—" : wallet.held.toFixed(2)}</div>
              <div className="mt-1 text-[10px] opacity-75">طلبات سحب قيد المعالجة</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <button
              onClick={() => setDepositOpen(true)}
              className="group relative overflow-hidden rounded-2xl bg-white px-3 sm:px-5 py-4 text-foreground shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)] transition hover:scale-[1.02]"
            >
              <span className="pointer-events-none absolute -inset-1 bg-[conic-gradient(from_0deg,theme(colors.primary.DEFAULT),#22d3ee,#a78bfa,theme(colors.primary.DEFAULT))] opacity-70 blur-md transition group-hover:opacity-100" aria-hidden />
              <span className="relative flex items-center justify-center gap-1 sm:gap-2 rounded-xl bg-white py-2 text-[11px] sm:text-sm font-black">
                <ArrowDownToLine className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span>شحن المحفظة</span>
              </span>
            </button>
            <ActionBtn icon={<ArrowUpFromLine className="h-4 w-4 sm:h-5 sm:w-5" />} label="طلب سحب" onClick={() => setPayoutOpen(true)} />
            <ActionBtn icon={<Send className="h-4 w-4 sm:h-5 sm:w-5" />} label="تحويل لعضو" onClick={openTransferDialog} />
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold opacity-80">
            <Lock className="h-3 w-3" /> لا يُضاف أي رصيد إلا بعد تأكيد وصول المبلغ لحساب الشركة عبر بوابة الدفع
          </div>
        </div>

        {/* Live topup status */}
        <div className="mt-4"><WalletTopupStatus /></div>

        {/* Detailed balance breakdown (available / held + per-operation) */}
        <div className="mt-4">
          <WalletBalanceBreakdown
            balanceMinor={Math.round((wallet.balance ?? 0) * 100)}
            heldMinor={Math.round((wallet.held ?? 0) * 100)}
            currency={wallet.currency ?? "SAR"}
          />
        </div>


        {/* Wallet support button */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setTicketOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/50 p-4 text-sm font-extrabold text-foreground transition hover:bg-card hover:border-primary/40"
          >
            <LifeBuoy className="h-4 w-4 text-primary" />
            هل واجهت مشكلة في المحفظة؟ افتح تذكرة دعم
          </button>
          <Link
            to="/wallet/history"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/50 p-4 text-sm font-extrabold text-foreground transition hover:bg-card hover:border-primary/40"
          >
            <History className="h-4 w-4 text-primary" />
            سجل المحفظة الكامل (شحن • تحويل • قبض • حجز • خصم)
          </Link>
        </div>

        {/* Bank IBAN card */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />
            <div className="text-sm font-extrabold text-foreground">رقم الآيبان البنكي (IBAN)</div>
          </div>

          {wallet.bank_iban ? (
            <div className="flex flex-wrap items-center gap-3">
              <div dir="ltr" className="num flex-1 min-w-[220px] rounded-xl border border-border bg-muted/40 px-4 py-3 text-base font-extrabold tracking-wider text-foreground select-all">
                {wallet.bank_iban}
              </div>
              <button onClick={handleCopy} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-3 text-xs font-extrabold text-primary-foreground transition hover:bg-primary/90">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "تم النسخ" : "نسخ"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-muted-foreground">لم يتم توليد IBAN بعد. اضغط الزر لإصدار رقم آيبان خاص بمحفظتك من البنك بشكل آمن.</p>
              <button onClick={handleGenerateIban} disabled={generating || loading || !user} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-extrabold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
                {generating ? "جاري التوليد..." : "أنشئ IBAN الخاص بي"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div className="text-sm font-extrabold text-foreground">سجل المعاملات</div>
            <button onClick={handleVerify} disabled={verifying} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-extrabold text-foreground transition hover:bg-muted disabled:opacity-50" title="فحص سلسلة الهاش لكشف أي تلاعب">
              {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 text-success" />}
              تحقق من السلامة
            </button>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/50" />
            <div className="text-sm font-extrabold text-foreground">لا توجد معاملات بعد</div>
            <div className="text-xs font-medium text-muted-foreground">ستظهر معاملاتك هنا فور أول عملية شحن أو شراء.</div>
          </div>
        </div>

        <div className="mt-6"><PushNotificationsCard /></div>

        {payouts.length > 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-card shadow-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-5">
              <div className="text-sm font-extrabold text-foreground">طلبات السحب</div>
              <WalletExportButtons rows={payouts as any} filename="payouts" />
            </div>
            <ul className="divide-y divide-border">
              {payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 p-4 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-extrabold text-foreground">
                      {p.channel === "vodafone_cash" ? "فودافون كاش" : p.channel === "barq" ? "برق" : "تحويل بنكي"}
                    </span>
                    <span className="num text-muted-foreground" dir="ltr">{p.destination_masked}</span>
                    {p.eta_release_at && p.status === "pending" && (
                      <span className="flex items-center gap-1 text-[10px] text-warning">
                        <Clock className="h-3 w-3" /> الإفراج: {new Date(p.eta_release_at).toLocaleDateString("ar-SA")}
                      </span>
                    )}
                  </div>
                  <div className="num font-black text-foreground">{(p.amount_minor / 100).toFixed(2)} ر.س</div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    p.status === "completed" ? "bg-success/15 text-success" :
                    p.status === "failed" ? "bg-destructive/15 text-destructive" :
                    "bg-warning/15 text-warning"
                  }`}>{p.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      </WorkspaceShell>

      {/* ============ شحن المحفظة ============ */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>شحن المحفظة</DialogTitle>
            <DialogDescription>
              ستنتقل إلى صفحة دفع آمنة. لن يُضاف أي رصيد قبل تأكيد وصول المبلغ لحساب الشركة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>المبلغ (SAR)</Label>
            <Input type="number" min={10} value={depositAmount} onChange={(e) => setDepositAmount(Number(e.target.value))} />
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
              <Sparkles className="h-3 w-3" /> اقتراحات ذكية بناءً على عاداتك
            </div>
            <div className="flex flex-wrap gap-2">
              {smartAmounts.map((v) => (
                <button key={v} onClick={() => setDepositAmount(v)} className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-bold hover:bg-muted">
                  {v} ر.س
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              تدعم بطاقات مدى/Visa/Mastercard وApple Pay وGoogle Pay. التحويل يتم مباشرة لحساب الشركة، ثم يُضاف الرصيد آلياً.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(false)}>إلغاء</Button>
            <Button onClick={handleDeposit}>متابعة الدفع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ تحويل لعضو آخر ============ */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحويل من محفظتي لعضو آخر</DialogTitle>
            <DialogDescription>
              يُستخدم لشراء أسهم أو حصص من أعضاء آخرين. سيتم خصم المبلغ من محفظتك وإضافته فوراً لمحفظة المستلم.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>المستلم</Label>
            <Select value={transferTo} onValueChange={setTransferTo}>
              <SelectTrigger><SelectValue placeholder="اختر عضواً..." /></SelectTrigger>
              <SelectContent>
                {recipients.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.display_name || r.id.slice(0,8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Label>المبلغ (SAR)</Label>
            <Input type="number" min={1} value={transferAmount} onChange={(e) => setTransferAmount(Number(e.target.value))} />

            <Label>رمز PIN المحفظة</Label>
            <Input type="password" maxLength={12} value={transferPin} onChange={(e) => setTransferPin(e.target.value)} placeholder="••••" dir="ltr" />

            <Label>ملاحظة (اختياري)</Label>
            <Input maxLength={280} value={transferNote} onChange={(e) => setTransferNote(e.target.value)} placeholder="مثال: شراء حصة من مشروع X" />

            <p className="text-[11px] text-muted-foreground">
              🔒 العملية ذرية ومسجّلة في دفتر الأستاذ بسلسلة هاش SHA-256 — يستحيل التراجع أو التلاعب بعد التأكيد.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)} disabled={transferSubmitting}>إلغاء</Button>
            <Button onClick={handleTransfer} disabled={transferSubmitting}>
              {transferSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              تأكيد التحويل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ طلب سحب ============ */}
      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>طلب سحب من المحفظة</DialogTitle>
            <DialogDescription>
              يتم حجز المبلغ ومراجعة الطلب من قبل الإدارة. مدة الإفراج النظامية: 14 يوماً.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>القناة</Label>
            <Select value={payoutChannel} onValueChange={(v) => setPayoutChannel(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_iban">تحويل بنكي (IBAN)</SelectItem>
                <SelectItem value="vodafone_cash">فودافون كاش</SelectItem>
                <SelectItem value="barq">برق</SelectItem>
              </SelectContent>
            </Select>

            <Label>
              {payoutChannel === "vodafone_cash" ? "رقم فودافون" : payoutChannel === "barq" ? "رقم محفظة برق" : "رقم الآيبان"}
            </Label>
            <Input dir="ltr" value={payoutDest} onChange={(e) => setPayoutDest(e.target.value)} placeholder={payoutChannel === "bank_iban" ? "SA00 .... ...." : "01xxxxxxxxx"} />

            <Label>المبلغ (SAR) — الحد الأدنى 10</Label>
            <Input type="number" min={10} value={payoutAmount} onChange={(e) => setPayoutAmount(Number(e.target.value))} />

            <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-[11px] font-semibold text-warning-foreground">
              <div className="flex items-center gap-1.5 mb-1"><Clock className="h-3.5 w-3.5" /> مدة الإفراج: 14 يوماً</div>
              تُحجز المبالغ تلقائياً من رصيدك المتاح، وتنشأ تذكرة دعم خاصة بطلبك للتواصل المباشر مع الإدارة.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutOpen(false)} disabled={payoutSubmitting}>إلغاء</Button>
            <Button onClick={handleSmartPayout} disabled={payoutSubmitting}>
              {payoutSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              تأكيد طلب السحب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ تذكرة دعم للمحفظة ============ */}
      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>الإبلاغ عن مشكلة في المحفظة</DialogTitle>
            <DialogDescription>سيتم فتح تذكرة دعم مرتبطة بحسابك، وسيرد عليك الفريق المختص.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>نوع المشكلة</Label>
            <Select value={ticketCategory} onValueChange={(v) => setTicketCategory(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="topup_problem">مشكلة في الشحن</SelectItem>
                <SelectItem value="transfer_problem">مشكلة في التحويل</SelectItem>
                <SelectItem value="withdrawal_problem">مشكلة في السحب</SelectItem>
                <SelectItem value="wallet_issue">مشكلة عامة بالمحفظة</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>

            <Label>عنوان مختصر</Label>
            <Input maxLength={200} value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} placeholder="مثال: لم يُضاف الرصيد بعد الدفع" />

            <Label>تفاصيل المشكلة</Label>
            <Textarea rows={5} maxLength={5000} value={ticketMessage} onChange={(e) => setTicketMessage(e.target.value)} placeholder="اشرح المشكلة بالتفصيل مع رقم العملية إن وُجد..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTicketOpen(false)} disabled={ticketSubmitting}>إلغاء</Button>
            <Button onClick={handleOpenTicket} disabled={ticketSubmitting}>
              {ticketSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              إرسال التذكرة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="relative flex flex-col items-center gap-1 rounded-xl bg-background/15 py-3 font-extrabold backdrop-blur transition hover:bg-background/25 disabled:opacity-50 disabled:cursor-not-allowed">
      <div className="h-5 w-5">{icon}</div>
      <span className="text-xs">{label}</span>
    </button>
  );
}
