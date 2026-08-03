import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listBlockedIps, blockIp, unblockIp,
  listWalletPolicies, setWalletLockdown, updateWalletPolicy,
} from "@/lib/security-admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ban, Lock, Unlock, ShieldOff, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/firewall")({
  component: FirewallPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">{String(error?.message || error)}</div>,
  notFoundComponent: () => <div className="p-6">غير موجود</div>,
});

function FirewallPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ShieldOff className="h-6 w-6 text-primary" />
        جدار الحماية (WAF + جدار المحافظ)
      </h1>
      <Tabs defaultValue="ips">
        <TabsList>
          <TabsTrigger value="ips">حظر IPs</TabsTrigger>
          <TabsTrigger value="wallets">سياسات المحافظ</TabsTrigger>
        </TabsList>
        <TabsContent value="ips"><IpBlocklist /></TabsContent>
        <TabsContent value="wallets"><WalletPolicies /></TabsContent>
      </Tabs>
    </div>
  );
}

function IpBlocklist() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBlockedIps);
  const blockFn = useServerFn(blockIp);
  const unblockFn = useServerFn(unblockIp);

  const { data = [] } = useQuery({ queryKey: ["blocked-ips"], queryFn: () => listFn() });
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [minutes, setMinutes] = useState<string>("");

  const block = useMutation({
    mutationFn: () => blockFn({ data: { ip: ip.trim(), reason, minutes: minutes ? Number(minutes) : null } }),
    onSuccess: () => { toast.success("تم حظر IP"); setIp(""); setReason(""); setMinutes(""); qc.invalidateQueries({ queryKey: ["blocked-ips"] }); },
    onError: (e: any) => toast.error(e?.message ?? "فشل"),
  });
  const unblock = useMutation({
    mutationFn: (p: string) => unblockFn({ data: { ip: p } }),
    onSuccess: () => { toast.success("تم رفع الحظر"); qc.invalidateQueries({ queryKey: ["blocked-ips"] }); },
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">قائمة IPs المحظورة</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4">
          <Input placeholder="عنوان IP" value={ip} onChange={(e) => setIp(e.target.value)} />
          <Input placeholder="السبب" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Input placeholder="مدة بالدقائق (فارغ = دائم)" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          <Button onClick={() => block.mutate()} disabled={!ip.trim() || !reason.trim() || block.isPending}>
            <Plus className="h-4 w-4 ml-1" /> حظر
          </Button>
        </div>

        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b">
            <tr><th className="text-right p-2">IP</th><th className="text-right p-2">السبب</th><th className="text-right p-2">حتى</th><th className="text-right p-2"></th></tr>
          </thead>
          <tbody>
            {data.map((r: any) => (
              <tr key={r.id} className="border-b">
                <td className="p-2 font-mono">{r.ip}</td>
                <td className="p-2">{r.reason ?? "—"}</td>
                <td className="p-2">{r.blocked_until ? new Date(r.blocked_until).toLocaleString("ar") : <Badge variant="destructive">دائم</Badge>}</td>
                <td className="p-2 text-left">
                  <Button size="sm" variant="ghost" onClick={() => unblock.mutate(r.ip)}>رفع</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.length && <p className="text-center text-muted-foreground py-4">لا توجد IPs محظورة.</p>}
      </CardContent>
    </Card>
  );
}

function WalletPolicies() {
  const qc = useQueryClient();
  const listFn = useServerFn(listWalletPolicies);
  const lockFn = useServerFn(setWalletLockdown);
  const updateFn = useServerFn(updateWalletPolicy);
  const [lockOnly, setLockOnly] = useState(false);

  const { data = [] } = useQuery({
    queryKey: ["wallet-policies", lockOnly],
    queryFn: () => listFn({ data: { lockdownOnly: lockOnly } }),
  });

  const lock = useMutation({
    mutationFn: (p: { userId: string; locked: boolean; reason?: string }) =>
      lockFn({ data: p }),
    onSuccess: () => { toast.success("تم"); qc.invalidateQueries({ queryKey: ["wallet-policies"] }); },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">سياسات أمان المحافظ</CardTitle>
        <Button size="sm" variant={lockOnly ? "default" : "outline"} onClick={() => setLockOnly((x) => !x)}>
          المقفلة فقط
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b">
            <tr>
              <th className="text-right p-2">المستخدم</th>
              <th className="text-right p-2">حد يومي</th>
              <th className="text-right p-2">حد العملية</th>
              <th className="text-right p-2">عتبة OTP</th>
              <th className="text-right p-2">الحالة</th>
              <th className="text-right p-2"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((p: any) => (
              <PolicyRow key={p.user_id} p={p} onLock={(locked, reason) => lock.mutate({ userId: p.user_id, locked, reason })} onUpdate={(d) => updateFn({ data: { userId: p.user_id, ...d } }).then(() => { toast.success("حُفظت"); qc.invalidateQueries({ queryKey: ["wallet-policies"] }); })} />
            ))}
          </tbody>
        </table>
        {!data.length && <p className="text-center text-muted-foreground py-4">لا توجد سياسات.</p>}
      </CardContent>
    </Card>
  );
}

function PolicyRow({ p, onLock, onUpdate }: { p: any; onLock: (locked: boolean, reason?: string) => void; onUpdate: (d: { dailyLimitMinor: number; perTxLimitMinor: number; requireOtpAboveMinor: number }) => void }) {
  const [daily, setDaily] = useState(String(p.daily_limit_minor));
  const [perTx, setPerTx] = useState(String(p.per_tx_limit_minor));
  const [otp, setOtp] = useState(String(p.require_otp_above_minor));
  return (
    <tr className="border-b">
      <td className="p-2 font-mono text-xs">{p.user_id.slice(0, 8)}…</td>
      <td className="p-2"><Input className="w-28" value={daily} onChange={(e) => setDaily(e.target.value)} /></td>
      <td className="p-2"><Input className="w-28" value={perTx} onChange={(e) => setPerTx(e.target.value)} /></td>
      <td className="p-2"><Input className="w-28" value={otp} onChange={(e) => setOtp(e.target.value)} /></td>
      <td className="p-2">
        {p.lockdown
          ? <Badge variant="destructive" title={p.lockdown_reason ?? ""}><Lock className="h-3 w-3 ml-1" /> مقفل</Badge>
          : <Badge variant="secondary"><Unlock className="h-3 w-3 ml-1" /> نشط</Badge>}
      </td>
      <td className="p-2 text-left space-x-1 space-x-reverse">
        <Button size="sm" variant="outline" onClick={() => onUpdate({ dailyLimitMinor: Number(daily), perTxLimitMinor: Number(perTx), requireOtpAboveMinor: Number(otp) })}>حفظ</Button>
        {p.lockdown
          ? <Button size="sm" variant="ghost" onClick={() => onLock(false)}>فك</Button>
          : <Button size="sm" variant="destructive" onClick={() => { const r = prompt("سبب القفل؟") || "manual"; onLock(true, r); }}><Ban className="h-3 w-3" /></Button>}
      </td>
    </tr>
  );
}
