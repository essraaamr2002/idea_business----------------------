import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDownToLine, CheckCircle2, XCircle, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { listPayouts, decidePayout } from "@/lib/admin-accounting.functions";
import { fatoraRefund } from "@/lib/fatora-admin.functions";

export const Route = createFileRoute("/admin/payouts")({
  component: AdminPayouts,
});

function formatMinor(v: number | string | null | undefined) {
  return (Number(v ?? 0) / 100).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AdminPayouts() {
  const list = useServerFn(listPayouts);
  const decide = useServerFn(decidePayout);
  const refundFn = useServerFn(fatoraRefund);
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("pending");

  const { data } = useQuery({
    queryKey: ["admin-payouts", status],
    queryFn: () => list({ data: { status: status === "all" ? undefined : status } }),
  });

  const m = useMutation({
    mutationFn: (input: { payoutId: string; success: boolean; reason?: string }) =>
      decide({ data: input }),
    onSuccess: () => {
      toast.success("تم");
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل التنفيذ"),
  });

  const refund = useMutation({
    mutationFn: (input: { orderId: string; payoutId: string; ticketId?: string; amount?: number; reason?: string }) =>
      refundFn({ data: input }),
    onSuccess: () => { toast.success("تم تنفيذ الاسترداد عبر Fatora"); qc.invalidateQueries({ queryKey: ["admin-payouts"] }); },
    onError: (e: any) => toast.error(e?.message ?? "فشل الاسترداد"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ArrowDownToLine className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">طلبات السحب</h1>
          <p className="text-sm text-muted-foreground">موافقة/رفض السحوبات وإرفاق مرجع التحويل.</p>
        </div>
      </div>

      <Tabs value={status} onValueChange={setStatus}>
        <TabsList>
          <TabsTrigger value="pending">معلقة</TabsTrigger>
          <TabsTrigger value="pending_mfa">بانتظار التحقق</TabsTrigger>
          <TabsTrigger value="completed">مكتملة</TabsTrigger>
          <TabsTrigger value="failed">فشلت</TabsTrigger>
          <TabsTrigger value="all">الكل</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader><CardTitle>القائمة</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">المستخدم</TableHead>
                <TableHead className="text-right">القناة</TableHead>
                <TableHead className="text-right">الوجهة</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">الإفراج (ETA)</TableHead>
                <TableHead className="text-right">تذكرة الدعم</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((p: any) => {
                const eta = p.eta_release_at ? new Date(p.eta_release_at) : null;
                const daysLeft = eta ? Math.ceil((eta.getTime() - Date.now()) / 86400000) : null;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{new Date(p.created_at).toLocaleString("ar-SA")}</TableCell>
                    <TableCell className="font-mono text-xs">{String(p.user_id).slice(0, 8)}…</TableCell>
                    <TableCell><Badge variant="outline">{p.channel}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{p.destination_masked}</TableCell>
                    <TableCell className="font-mono">{formatMinor(p.amount_minor)} {p.currency}</TableCell>
                    <TableCell className="text-xs">
                      {eta ? (
                        <div>
                          <div>{eta.toLocaleDateString("ar-SA")}</div>
                          {daysLeft !== null && daysLeft > 0 && p.status === "pending" && (
                            <span className="text-[10px] text-warning">بعد {daysLeft} يوم</span>
                          )}
                          {daysLeft !== null && daysLeft <= 0 && p.status === "pending" && (
                            <span className="text-[10px] text-success font-extrabold">جاهز للإفراج</span>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.support_ticket_id ? (
                        <a href={`/admin/tickets?id=${p.support_ticket_id}`} className="text-primary hover:underline font-mono">
                          #{String(p.support_ticket_id).slice(0, 8)}
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === "completed" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-2 flex-wrap">
                      {(p.status === "pending" || p.status === "pending_mfa") && (
                        <>
                          <DecideDialog kind="approve" onConfirm={(reason) => m.mutate({ payoutId: p.id, success: true, reason })} />
                          <DecideDialog kind="reject" onConfirm={(reason) => m.mutate({ payoutId: p.id, success: false, reason })} />
                        </>
                      )}
                      {p.status !== "refunded" && (
                        <RefundDialog
                          payoutId={p.id}
                          ticketId={p.support_ticket_id ?? undefined}
                          pending={refund.isPending}
                          onConfirm={(orderId, amount, reason) =>
                            refund.mutate({ payoutId: p.id, ticketId: p.support_ticket_id ?? undefined, orderId, amount, reason })
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">لا توجد طلبات</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DecideDialog({ kind, onConfirm }: { kind: "approve" | "reject"; onConfirm: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const isOk = kind === "approve";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={isOk ? "default" : "destructive"}>
          {isOk ? <CheckCircle2 className="h-4 w-4 ms-1" /> : <XCircle className="h-4 w-4 ms-1" />}
          {isOk ? "تم التحويل" : "رفض"}
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>{isOk ? "تأكيد إتمام التحويل" : "رفض الطلب"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{isOk ? "مرجع التحويل" : "سبب الرفض"}</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={() => { onConfirm(reason.trim()); setOpen(false); setReason(""); }}>تأكيد</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RefundDialog({
  payoutId, ticketId, pending, onConfirm,
}: {
  payoutId: string;
  ticketId?: string;
  pending: boolean;
  onConfirm: (orderId: string, amount: number | undefined, reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Undo2 className="h-4 w-4 ms-1" />
          استرداد Fatora
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>استرداد عبر Fatora</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">طلب السحب: <span className="font-mono">{payoutId.slice(0, 8)}</span>{ticketId ? <> — تذكرة: <span className="font-mono">{ticketId.slice(0, 8)}</span></> : null}</div>
          <div>
            <Label>order_id الخاص بعملية الإيداع (Fatora)</Label>
            <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="wallet_topup-1717..." />
          </div>
          <div>
            <Label>المبلغ (اختياري — اتركه فارغاً لاسترداد كامل)</Label>
            <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>السبب</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="customer_request" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button
            disabled={pending || !orderId.trim()}
            onClick={() => {
              onConfirm(orderId.trim(), amount ? Number(amount) : undefined, reason.trim());
              setOpen(false);
            }}
          >تأكيد الاسترداد</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
