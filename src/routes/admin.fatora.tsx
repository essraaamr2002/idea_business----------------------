import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, Wallet, AlertTriangle, RotateCcw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { fatoraSettlements, fatoraSyncPending, fatoraRefund, fatoraRecentFailures } from "@/lib/fatora-admin.functions";

export const Route = createFileRoute("/admin/fatora")({
  component: AdminFatora,
});

function RefundButton({ orderId, defaultAmount, onDone }: { orderId: string; defaultAmount?: number; onDone: () => void }) {
  const refundFn = useServerFn(fatoraRefund);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(defaultAmount ? String(defaultAmount) : "");
  const [reason, setReason] = useState("");
  const m = useMutation({
    mutationFn: () => refundFn({ data: { orderId, amount: amount ? Number(amount) : undefined, reason: reason || undefined } }),
    onSuccess: (r: any) => {
      toast.success(`تم الاسترداد — trace ${String(r.traceId).slice(0, 8)}`);
      setOpen(false); onDone();
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل الاسترداد"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><RotateCcw className="h-3.5 w-3.5 ms-1" /> Refund</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>استرداد عملية {orderId}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>المبلغ (اختياري — كامل افتراضياً)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><Label>السبب</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب الاسترداد" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>تنفيذ الاسترداد</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminFatora() {
  const fetchSettle = useServerFn(fatoraSettlements);
  const syncNow = useServerFn(fatoraSyncPending);
  const fetchFailures = useServerFn(fatoraRecentFailures);
  const qc = useQueryClient();
  const [from, setFrom] = useState<string>(() => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading, error } = useQuery({
    queryKey: ["fatora-settle", from, to],
    queryFn: () => fetchSettle({ data: { from, to, limit: 100 } }),
  });

  const failures = useQuery({
    queryKey: ["fatora-failures"],
    queryFn: () => fetchFailures({ data: { limit: 25 } }),
    refetchInterval: 60_000,
  });

  const sync = useMutation({
    mutationFn: () => syncNow({ data: undefined } as any),
    onSuccess: (r: any) => {
      toast.success(`فحص ${r.scanned} — تأكيد ${r.confirmed} — فشل ${r.failed}`);
      qc.invalidateQueries({ queryKey: ["fatora-settle"] });
      qc.invalidateQueries({ queryKey: ["fatora-failures"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل المزامنة"),
  });

  const failItems = failures.data?.items ?? [];
  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["fatora-settle"] });
    qc.invalidateQueries({ queryKey: ["fatora-failures"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Wallet className="h-6 w-6 text-primary" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">تسويات Fatora</h1>
          <p className="text-sm text-muted-foreground">مزامنة تلقائية كل 15 دقيقة + استرداد فوري وتنبيهات بأي فشل في webhook أو verify.</p>
        </div>
        <Button onClick={() => sync.mutate()} disabled={sync.isPending} variant="outline">
          <RefreshCw className={`h-4 w-4 ms-1 ${sync.isPending ? "animate-spin" : ""}`} />
          مزامنة المعلقة الآن
        </Button>
      </div>

      {failItems.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>تنبيهات Fatora ({failItems.length})</AlertTitle>
          <AlertDescription>
            <div className="mt-2 max-h-64 overflow-auto rounded border bg-background/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">trace_id</TableHead>
                    <TableHead className="text-right">order_id</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">السبب</TableHead>
                    <TableHead className="text-right">وقت</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failItems.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-xs">{f.kind}</TableCell>
                      <TableCell className="font-mono text-xs">{String(f.trace_id ?? "").slice(0, 8)}…</TableCell>
                      <TableCell className="font-mono text-xs">{f.order_id ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{f.status ?? (f.signature_valid === false ? "bad_sig" : "—")}</Badge></TableCell>
                      <TableCell className="text-xs max-w-[280px] truncate" title={f.error_message ?? ""}>{f.error_message ?? "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(f.created_at).toLocaleString("ar")}</TableCell>
                      <TableCell>
                        {f.order_id && (
                          <Link to="/pay" search={{ orderId: f.order_id } as any} className="text-primary inline-flex items-center gap-1 text-xs">
                            تفاصيل <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>الفترة</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div><Label>من</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>إلى</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <Button onClick={refreshAll} variant="secondary">تحديث</Button>
        </CardContent>
      </Card>

      {error && <Card><CardContent className="text-destructive py-4">{(error as any)?.message ?? "تعذّر جلب التسويات"}</CardContent></Card>}

      <Tabs defaultValue="tx">
        <TabsList>
          <TabsTrigger value="tx">العمليات ({data?.transactions?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="po">المدفوعات الصادرة ({data?.payouts?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="tx">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">order_id</TableHead>
                    <TableHead className="text-right">transaction_id</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الحالة (Fatora)</TableHead>
                    <TableHead className="text-right">الحالة المحلية</TableHead>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.transactions ?? []).map((row: any, i: number) => {
                    const r = row.raw, l = row.local;
                    const status = String(r.status ?? r.payment_status ?? "—");
                    const localStatus = l?.status ?? "—";
                    const mismatch = l && status.toUpperCase().includes("SUCCESS") && l.status !== "paid";
                    const refundable = localStatus === "paid" && r.order_id;
                    return (
                      <TableRow key={i} className={mismatch ? "bg-warning/10" : ""}>
                        <TableCell className="font-mono text-xs">{r.order_id ?? r.orderId ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{r.transaction_id ?? r.id ?? "—"}</TableCell>
                        <TableCell className="font-mono">{r.amount ?? "—"} {r.currency ?? ""}</TableCell>
                        <TableCell><Badge>{status}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={localStatus === "paid" ? "default" : localStatus === "refunded" ? "secondary" : "outline"}>{localStatus}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{l?.user_id ? String(l.user_id).slice(0, 8) + "…" : "—"}</TableCell>
                        <TableCell className="text-xs">{r.created_at ?? r.payment_date ?? "—"}</TableCell>
                        <TableCell>
                          {refundable ? (
                            <RefundButton orderId={r.order_id} defaultAmount={Number(r.amount) || undefined} onDone={refreshAll} />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!isLoading && (data?.transactions ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">لا توجد عمليات</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="po">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المعرف</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">المرجع البنكي</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.payouts ?? []).map((p: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{p.id ?? p.payout_id ?? "—"}</TableCell>
                      <TableCell className="font-mono">{p.amount ?? "—"} {p.currency ?? ""}</TableCell>
                      <TableCell><Badge>{p.status ?? "—"}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{p.bank_reference ?? p.reference ?? "—"}</TableCell>
                      <TableCell className="text-xs">{p.created_at ?? p.date ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && (data?.payouts ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">لا توجد مدفوعات صادرة</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
