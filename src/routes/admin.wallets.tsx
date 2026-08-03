import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import {
  findUserAndWallet, adjustWallet, listLedger,
} from "@/lib/admin-accounting.functions";

export const Route = createFileRoute("/admin/wallets")({
  component: AdminWallets,
});

function formatMinor(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return (n / 100).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AdminWallets() {
  const find = useServerFn(findUserAndWallet);
  const ledger = useServerFn(listLedger);
  const adjust = useServerFn(adjustWallet);
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const search = useMutation({
    mutationFn: async (query: string) => find({ data: { query } }),
    onSuccess: () => setSearched(q),
  });

  const ledgerQ = useQuery({
    queryKey: ["admin-ledger", selectedUser],
    queryFn: () => ledger({ data: { userId: selectedUser ?? undefined, limit: 100 } }),
  });

  const adjustM = useMutation({
    mutationFn: (input: { userId: string; deltaMinor: number; reason: string }) =>
      adjust({ data: input }),
    onSuccess: () => {
      toast.success("تمت العملية");
      qc.invalidateQueries({ queryKey: ["admin-ledger"] });
      search.mutate(q);
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل التنفيذ"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Wallet className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">المحاسبة والمحافظ</h1>
          <p className="text-sm text-muted-foreground">بحث محفظة، إيداع/خصم يدوي، عرض سجل المعاملات.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>بحث عن مستخدم/محفظة</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="UUID أو اسم العرض أو رقم الجوال" className="pr-9" />
            </div>
            <Button onClick={() => q.trim() && search.mutate(q.trim())} disabled={search.isPending}>
              بحث
            </Button>
          </div>

          {searched && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">العضوية</TableHead>
                  <TableHead className="text-right">KYC</TableHead>
                  <TableHead className="text-right">الرصيد (ر.س)</TableHead>
                  <TableHead className="text-right">IBAN</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {((search.data ?? []) as any[]).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.display_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">{u.id}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{u.membership}</Badge></TableCell>
                    <TableCell><Badge>{u.kyc_status}</Badge></TableCell>
                    <TableCell className="font-mono">{formatMinor(u.wallet?.balance)}</TableCell>
                    <TableCell className="font-mono text-xs">{u.wallet?.bank_iban ?? u.wallet?.virtual_iban ?? "—"}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedUser(u.id)}>السجل</Button>
                      <AdjustDialog userId={u.id} kind="credit"
                        onConfirm={(amt, reason) => adjustM.mutate({ userId: u.id, deltaMinor: amt, reason })} />
                      <AdjustDialog userId={u.id} kind="debit"
                        onConfirm={(amt, reason) => adjustM.mutate({ userId: u.id, deltaMinor: -amt, reason })} />
                    </TableCell>
                  </TableRow>
                ))}
                {(search.data as any[] | undefined)?.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">لا توجد نتائج</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجل المعاملات {selectedUser ? "(مستخدم محدد)" : "(آخر 100 عملية)"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">المستخدم</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">الرصيد بعد</TableHead>
                <TableHead className="text-right">المرجع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ledgerQ.data?.rows ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("ar-SA")}</TableCell>
                  <TableCell className="font-mono text-xs">{String(r.user_id).slice(0, 8)}…</TableCell>
                  <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                  <TableCell className={`font-mono ${Number(r.amount) < 0 ? "text-destructive" : "text-emerald-600"}`}>
                    {formatMinor(r.amount)}
                  </TableCell>
                  <TableCell className="font-mono">{formatMinor(r.balance_after)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                </TableRow>
              ))}
              {!ledgerQ.isLoading && (ledgerQ.data?.rows ?? []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">لا توجد عمليات</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AdjustDialog({
  userId, kind, onConfirm,
}: { userId: string; kind: "credit" | "debit"; onConfirm: (amountMinor: number, reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const isCredit = kind === "credit";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={isCredit ? "default" : "destructive"}>
          {isCredit ? <ArrowDownCircle className="h-4 w-4 ms-1" /> : <ArrowUpCircle className="h-4 w-4 ms-1" />}
          {isCredit ? "إيداع" : "خصم"}
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>{isCredit ? "إيداع يدوي" : "خصم يدوي"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>المبلغ (ر.س)</Label>
            <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>السبب (إلزامي)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <div className="text-xs text-muted-foreground" dir="ltr">user_id: {userId}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button
            onClick={() => {
              const v = Number(amount);
              if (!v || v <= 0) return;
              if (reason.trim().length < 3) return;
              onConfirm(Math.round(v * 100), reason.trim());
              setOpen(false); setAmount(""); setReason("");
            }}
          >تأكيد</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
