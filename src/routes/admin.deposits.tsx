import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { adminListDeposits, adminConfirmDeposit, adminRejectDeposit } from "@/lib/wallet-real.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CheckCircle2, XCircle, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/deposits")({
  component: AdminDepositsPage,
});

function fmt(minor: number) {
  return (minor / 100).toLocaleString("ar-SA", { minimumFractionDigits: 2 });
}

function AdminDepositsPage() {
  const list = useServerFn(adminListDeposits);
  const confirm = useServerFn(adminConfirmDeposit);
  const reject = useServerFn(adminRejectDeposit);
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("awaiting_admin");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-deposits", tab],
    queryFn: () => list({ data: { status: tab } }),
  });

  const confirmMut = useMutation({
    mutationFn: async (id: string) => confirm({ data: { id } }),
    onSuccess: () => {
      toast.success("تم اعتماد الإيداع وقيد المبلغ");
      qc.invalidateQueries({ queryKey: ["admin-deposits"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const rejectMut = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => reject({ data: { id, reason } }),
    onSuccess: () => {
      toast.success("تم رفض الإيداع");
      qc.invalidateQueries({ queryKey: ["admin-deposits"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AdminPageShell
      title="طابور الإيداعات البنكية"
      description="اعتماد أو رفض طلبات الإيداع بعد التحقق من التحويل البنكي والرمز المرجعي."
      icon={Wallet}
      badge="مالية"
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="awaiting_admin">بانتظار التحقق</TabsTrigger>
          <TabsTrigger value="confirmed">معتمد</TabsTrigger>
          <TabsTrigger value="rejected">مرفوض</TabsTrigger>
          <TabsTrigger value="expired">منتهي</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin inline" /></div>
      ) : !data?.length ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">لا توجد طلبات في هذه الحالة.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data.map((r: any) => (
            <DepositRow
              key={r.id}
              row={r}
              onConfirm={() => confirmMut.mutate(r.id)}
              onReject={(reason) => rejectMut.mutate({ id: r.id, reason })}
              busy={confirmMut.isPending || rejectMut.isPending}
            />
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}

function DepositRow({ row, onConfirm, onReject, busy }: { row: any; onConfirm: () => void; onReject: (r: string) => void; busy: boolean }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <Card>
      <CardContent className="p-4 grid gap-3 md:grid-cols-[1fr_auto] items-center">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">{row.reference_code}</span>
            <Badge variant={row.status === "awaiting_admin" ? "secondary" : row.status === "confirmed" ? "default" : "destructive"}>{row.status}</Badge>
            <Badge variant="outline">{row.method}</Badge>
            <button
              onClick={() => { navigator.clipboard.writeText(row.reference_code); toast.success("تم النسخ"); }}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Copy className="h-3 w-3" /> نسخ المرجع
            </button>
          </div>
          <div className="text-sm">
            <span className="font-bold text-lg">{fmt(row.amount_minor)}</span> <span className="text-muted-foreground">{row.currency}</span>
          </div>
          <div className="text-xs text-muted-foreground">المستخدم: <span className="font-mono">{row.wallet_user_id.slice(0, 8)}…</span></div>
          <div className="text-xs text-muted-foreground">أُنشئ: {new Date(row.created_at).toLocaleString("ar-SA")} — ينتهي: {new Date(row.expires_at).toLocaleString("ar-SA")}</div>
          {row.rejection_reason && <div className="text-xs text-rose-500">سبب الرفض: {row.rejection_reason}</div>}
        </div>
        {row.status === "awaiting_admin" && (
          <div className="flex flex-col gap-2 min-w-[200px]">
            {!rejecting ? (
              <>
                <Button size="sm" onClick={onConfirm} disabled={busy}>
                  <CheckCircle2 className="h-4 w-4 ml-1" /> اعتماد وقيد الرصيد
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={busy}>
                  <XCircle className="h-4 w-4 ml-1" /> رفض
                </Button>
              </>
            ) : (
              <>
                <Input placeholder="سبب الرفض" value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => onReject(reason)} disabled={!reason || busy}>تأكيد الرفض</Button>
                  <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>إلغاء</Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
