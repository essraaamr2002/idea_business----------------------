import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Wallet, ArrowLeftRight, Plus, Building2, Clock, TrendingUp, Trash2 } from "lucide-react";
import {
  listCurrencies, listMySubWallets, createSubWallet, createRateLock, executeRateLock,
  listMyBankAccounts, addBankAccount, deleteBankAccount, getMyFxTransactions,
} from "@/lib/wallet-fx.functions";

export const Route = createFileRoute("/_authenticated/wallet-multi")({
  component: MultiWalletPage,
});

function formatMinor(minor: number | string, decimals: number) {
  const n = typeof minor === "string" ? Number(minor) : minor;
  const v = n / Math.pow(10, decimals);
  return v.toLocaleString("ar", { maximumFractionDigits: decimals, minimumFractionDigits: decimals > 0 ? Math.min(decimals, 2) : 0 });
}

function MultiWalletPage() {
  const qc = useQueryClient();
  const fnCurrencies = useServerFn(listCurrencies);
  const fnSubs = useServerFn(listMySubWallets);
  const fnCreate = useServerFn(createSubWallet);
  const fnTx = useServerFn(getMyFxTransactions);

  const currencies = useQuery({ queryKey: ["fx-currencies"], queryFn: () => fnCurrencies() });
  const subs = useQuery({ queryKey: ["fx-subs"], queryFn: () => fnSubs() });
  const txs = useQuery({ queryKey: ["fx-tx"], queryFn: () => fnTx() });

  const createMut = useMutation({
    mutationFn: (currency: string) => fnCreate({ data: { currency } }),
    onSuccess: () => { toast.success("تم إنشاء المحفظة"); qc.invalidateQueries({ queryKey: ["fx-subs"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const decimalsByCode = useMemo(() => {
    const m: Record<string, number> = {};
    (currencies.data ?? []).forEach((c: any) => { m[c.code] = c.decimal_places; });
    return m;
  }, [currencies.data]);

  return (
    <div className="container mx-auto max-w-6xl space-y-5 py-6" dir="rtl">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">المحفظة متعددة العملات</h1>
            <p className="text-sm text-muted-foreground">22 عملة عربية · أسعار حية · تحويل لحظي</p>
          </div>
        </div>
        <Badge variant="secondary">EMI Partner Mode</Badge>
      </div>

      <Tabs defaultValue="wallets">
        <TabsList>
          <TabsTrigger value="wallets">المحافظ</TabsTrigger>
          <TabsTrigger value="convert">تحويل عملة</TabsTrigger>
          <TabsTrigger value="banks">حساباتي البنكية</TabsTrigger>
          <TabsTrigger value="history">السجل</TabsTrigger>
        </TabsList>

        {/* WALLETS */}
        <TabsContent value="wallets" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(subs.data ?? []).map((w: any) => {
              const cc = w.currency_config ?? {};
              return (
                <Card key={w.id} className="overflow-hidden">
                  <div className="bg-gradient-to-br from-primary/90 to-primary p-4 text-primary-foreground">
                    <div className="flex items-center justify-between text-xs opacity-90">
                      <span>{cc.flag_emoji} {cc.name_ar}</span>
                      <span className="font-mono">{w.currency}</span>
                    </div>
                    <div className="mt-3 text-2xl font-bold tracking-tight">
                      {formatMinor(w.available_minor, cc.decimal_places ?? 2)} <span className="text-sm font-normal">{cc.symbol}</span>
                    </div>
                    {Number(w.held_minor) > 0 && (
                      <div className="text-[11px] opacity-80 mt-1">محجوز: {formatMinor(w.held_minor, cc.decimal_places ?? 2)}</div>
                    )}
                  </div>
                  <CardContent className="p-3 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">الكود</span><span className="font-mono">{w.sub_wallet_code}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">حساب افتراضي</span><span className="font-mono text-[10px]">{w.virtual_account_number}</span></div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" />إضافة محفظة عملة</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(currencies.data ?? []).map((c: any) => {
                  const exists = (subs.data ?? []).some((s: any) => s.currency === c.code);
                  return (
                    <Button
                      key={c.code}
                      size="sm"
                      variant={exists ? "secondary" : "outline"}
                      disabled={exists || createMut.isPending}
                      onClick={() => createMut.mutate(c.code)}
                    >
                      {c.flag_emoji} {c.code} {c.tier === 3 && <Badge variant="outline" className="me-1 text-[9px]">استقبال فقط</Badge>}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONVERT */}
        <TabsContent value="convert">
          <ConvertPanel currencies={currencies.data ?? []} subs={subs.data ?? []} decimalsByCode={decimalsByCode} />
        </TabsContent>

        {/* BANKS */}
        <TabsContent value="banks">
          <BankAccountsPanel currencies={currencies.data ?? []} />
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle className="text-base">آخر العمليات</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr><th className="p-2 text-start">التاريخ</th><th className="p-2">النوع</th><th className="p-2">من</th><th className="p-2">إلى</th><th className="p-2">السعر</th><th className="p-2">المرجع</th></tr>
                  </thead>
                  <tbody>
                    {(txs.data ?? []).map((t: any) => (
                      <tr key={t.id} className="border-t">
                        <td className="p-2 text-xs">{new Date(t.executed_at).toLocaleString("ar")}</td>
                        <td className="p-2 text-center"><Badge variant="outline">{t.kind}</Badge></td>
                        <td className="p-2 text-center">{formatMinor(t.from_amount_minor, decimalsByCode[t.from_currency] ?? 2)} {t.from_currency}</td>
                        <td className="p-2 text-center">{formatMinor(t.to_amount_minor, decimalsByCode[t.to_currency] ?? 2)} {t.to_currency}</td>
                        <td className="p-2 text-center font-mono text-xs">{Number(t.rate_applied).toFixed(4)}</td>
                        <td className="p-2 text-center font-mono text-xs">{t.reference}</td>
                      </tr>
                    ))}
                    {!(txs.data ?? []).length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">لا توجد عمليات بعد</td></tr>}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConvertPanel({ currencies, subs, decimalsByCode }: { currencies: any[]; subs: any[]; decimalsByCode: Record<string, number> }) {
  const qc = useQueryClient();
  const fnLock = useServerFn(createRateLock);
  const fnExec = useServerFn(executeRateLock);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [lock, setLock] = useState<any>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!lock) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(lock.expires_at).getTime() - Date.now()) / 1000));
      setSeconds(left);
      if (left === 0) setLock(null);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lock]);

  const fromDec = decimalsByCode[from] ?? 2;
  const toDec = decimalsByCode[to] ?? 2;

  const lockMut = useMutation({
    mutationFn: () =>
      fnLock({ data: { from, to, fromAmountMinor: Math.round(Number(amount) * Math.pow(10, fromDec)) } }),
    onSuccess: (data) => setLock(data),
    onError: (e: any) => toast.error(e.message),
  });

  const execMut = useMutation({
    mutationFn: () => fnExec({ data: { lockId: lock.id } }),
    onSuccess: () => {
      toast.success("تم التحويل بنجاح");
      setLock(null); setAmount("");
      qc.invalidateQueries({ queryKey: ["fx-subs"] });
      qc.invalidateQueries({ queryKey: ["fx-tx"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowLeftRight className="h-4 w-4" />تحويل بين عملاتي</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>من عملة</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
              <SelectContent>
                {subs.map((s: any) => (
                  <SelectItem key={s.currency} value={s.currency}>
                    {s.currency_config?.flag_emoji} {s.currency} — متاح: {formatMinor(s.available_minor, s.currency_config?.decimal_places ?? 2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>إلى عملة</Label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
              <SelectContent>
                {currencies.filter((c: any) => c.code !== from).map((c: any) => (
                  <SelectItem key={c.code} value={c.code}>{c.flag_emoji} {c.code} — {c.name_ar}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>المبلغ ({from || "—"})</Label>
            <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>

        {!lock && (
          <Button onClick={() => lockMut.mutate()} disabled={!from || !to || !amount || lockMut.isPending}>
            <TrendingUp className="h-4 w-4 me-2" />اعرض السعر (قفل 60 ثانية)
          </Button>
        )}

        {lock && (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">سعر مقفل</span>
                <Badge variant="default" className="flex items-center gap-1"><Clock className="h-3 w-3" />{seconds}s</Badge>
              </div>
              <div className="flex justify-between"><span>ترسل</span><span className="font-bold">{formatMinor(lock.from_amount_minor, fromDec)} {lock.from_currency}</span></div>
              <div className="flex justify-between"><span>الرسوم</span><span>{formatMinor(lock.fee_minor, fromDec)} {lock.from_currency}</span></div>
              <div className="flex justify-between"><span>سعر الصرف</span><span className="font-mono">1 = {Number(lock.locked_rate).toFixed(6)}</span></div>
              <div className="flex justify-between border-t pt-2"><span>تستلم</span><span className="font-bold text-primary">{formatMinor(lock.to_amount_minor, toDec)} {lock.to_currency}</span></div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => execMut.mutate()} disabled={execMut.isPending || seconds === 0}>تأكيد التحويل</Button>
                <Button variant="outline" onClick={() => setLock(null)}>إلغاء</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}

function BankAccountsPanel({ currencies }: { currencies: any[] }) {
  const qc = useQueryClient();
  const fnList = useServerFn(listMyBankAccounts);
  const fnAdd = useServerFn(addBankAccount);
  const fnDel = useServerFn(deleteBankAccount);
  const list = useQuery({ queryKey: ["my-banks"], queryFn: () => fnList() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ bank_name: "", account_holder_name: "", iban: "", swift_code: "", currency: "", country_code: "", nickname: "" });

  const addMut = useMutation({
    mutationFn: () => fnAdd(form as any),
    onSuccess: () => { toast.success("تم إضافة الحساب"); setOpen(false); qc.invalidateQueries({ queryKey: ["my-banks"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => fnDel({ data: { id } }),
    onSuccess: () => { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["my-banks"] }); },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />حساباتي البنكية</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 me-1" />إضافة</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {(list.data ?? []).map((b: any) => (
            <div key={b.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <div className="font-medium">{b.nickname || b.bank_name} · <span className="text-muted-foreground">{b.currency}</span></div>
                <div className="text-xs text-muted-foreground font-mono">{b.iban || b.account_number} · {b.account_holder_name}</div>
              </div>
              <div className="flex items-center gap-2">
                {b.is_verified ? <Badge>موثّق</Badge> : <Badge variant="outline">قيد التحقق</Badge>}
                <Button size="icon" variant="ghost" onClick={() => delMut.mutate(b.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {!(list.data ?? []).length && <p className="text-sm text-muted-foreground text-center py-6">لا توجد حسابات</p>}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إضافة حساب بنكي</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>اسم البنك</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
            <div><Label>اسم صاحب الحساب</Label><Input value={form.account_holder_name} onChange={(e) => setForm({ ...form, account_holder_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>IBAN</Label><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} /></div>
              <div><Label>SWIFT</Label><Input value={form.swift_code} onChange={(e) => setForm({ ...form, swift_code: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>العملة</Label>
                <Select value={form.currency} onValueChange={(v) => {
                  const c = currencies.find((x) => x.code === v);
                  setForm({ ...form, currency: v, country_code: c?.country_code || form.country_code });
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    {currencies.map((c: any) => <SelectItem key={c.code} value={c.code}>{c.flag_emoji} {c.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>كود الدولة</Label><Input maxLength={2} value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })} /></div>
            </div>
            <div><Label>اسم مختصر (اختياري)</Label><Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button onClick={() => addMut.mutate()} disabled={addMut.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
