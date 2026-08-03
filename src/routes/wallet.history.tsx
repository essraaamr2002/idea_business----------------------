import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Filter, Loader2, FileDown } from "lucide-react";
import { getMyLedgerPaged, countMyLedger } from "@/lib/wallet.functions";
import { WalletExportButtons } from "@/components/WalletExportButtons";
import { downloadWalletReceipt } from "@/lib/wallet-receipt-pdf";

export const Route = createFileRoute("/wallet/history")({
  component: WalletHistoryPage,
  head: () => ({
    meta: [
      { title: "سجل المحفظة — IDEA BUSINESS" },
      { name: "description", content: "كل عمليات الشحن، التحويل، القبض، الحجز، والخصم في محفظتك." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const TYPES: Array<{ value: string; label: string }> = [
  { value: "all", label: "كل الأنواع" },
  { value: "deposit", label: "شحن (إيداع)" },
  { value: "withdraw", label: "سحب" },
  { value: "investment", label: "استثمار" },
  { value: "share_trade", label: "تداول أسهم" },
  { value: "subscription", label: "اشتراك" },
  { value: "escrow", label: "ضمان" },
  { value: "hold", label: "حجز مبلغ" },
  { value: "release", label: "إفراج" },
  { value: "fee", label: "عمولة" },
];

const STATUSES = ["all", "completed", "pending", "failed", "reversed"];
const LIMIT = 20;

function typeLabel(t: string) {
  return TYPES.find((x) => x.value === t)?.label ?? t;
}

function WalletHistoryPage() {
  const list = useServerFn(getMyLedgerPaged);
  const countFn = useServerFn(countMyLedger);
  const [typeFilter, setTypeFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [searchRef, setSearchRef] = useState("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(0);

  const filters = useMemo(() => ({
    typeFilter: typeFilter === "all" ? undefined : typeFilter,
    searchRef: searchRef || undefined,
    minAmount: minAmount ? Math.round(Number(minAmount) * 100) : undefined,
    maxAmount: maxAmount ? Math.round(Number(maxAmount) * 100) : undefined,
    startDate: startDate ? new Date(startDate).toISOString() : undefined,
    endDate: endDate ? new Date(endDate).toISOString() : undefined,
  }), [typeFilter, searchRef, minAmount, maxAmount, startDate, endDate]);

  const { data: rowsRaw = [], isFetching } = useQuery({
    queryKey: ["wallet-history", filters, page],
    queryFn: () => list({ data: { ...filters, offset: page * LIMIT, limit: LIMIT, sortOrder: "desc" } }),
  });
  const { data: total = 0 } = useQuery({
    queryKey: ["wallet-history-count", filters],
    queryFn: () => countFn({ data: filters }),
  });

  const rows = (rowsRaw as any[]).filter((r) => status === "all" ? true : r.status === status);

  const exportRows = rows.map((r) => ({
    التاريخ: new Date(r.created_at).toLocaleString("ar-SA"),
    النوع: typeLabel(r.type),
    المبلغ: (Number(r.amount) / 100).toFixed(2),
    الرصيد_بعد: (Number(r.balance_after) / 100).toFixed(2),
    الحالة: r.status,
    المرجع: r.reference,
  }));

  return (
    <WorkspaceShell>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">سجل المحفظة</h1>
            <p className="text-xs text-muted-foreground">كل عمليات الشحن والتحويل والقبض والحجز والخصم — موثّقة في دفتر الأستاذ.</p>
          </div>
          <Link to="/wallet" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> العودة للمحفظة
          </Link>
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Filter className="h-4 w-4" /> الفلاتر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">النوع</Label>
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">الحالة</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s === "all" ? "الكل" : s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">بحث في المرجع</Label>
                <Input value={searchRef} onChange={(e) => { setSearchRef(e.target.value); setPage(0); }} placeholder="REF..." />
              </div>
              <div>
                <Label className="text-xs">من تاريخ</Label>
                <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(0); }} />
              </div>
              <div>
                <Label className="text-xs">إلى تاريخ</Label>
                <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(0); }} />
              </div>
              <div>
                <Label className="text-xs">أقل مبلغ (ر.س)</Label>
                <Input type="number" value={minAmount} onChange={(e) => { setMinAmount(e.target.value); setPage(0); }} />
              </div>
              <div>
                <Label className="text-xs">أعلى مبلغ (ر.س)</Label>
                <Input type="number" value={maxAmount} onChange={(e) => { setMaxAmount(e.target.value); setPage(0); }} />
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" className="w-full" onClick={() => {
                  setTypeFilter("all"); setStatus("all"); setSearchRef(""); setMinAmount(""); setMaxAmount("");
                  setStartDate(""); setEndDate(""); setPage(0);
                }}>إعادة تعيين</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">العمليات ({total})</CardTitle>
            <WalletExportButtons rows={exportRows} filename="wallet-history" />
          </CardHeader>
          <CardContent>
            {isFetching && rows.length === 0 ? (
              <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
            ) : rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">لا توجد عمليات مطابقة للفلاتر</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr className="text-right">
                      <th className="p-2">التاريخ</th>
                      <th className="p-2">النوع</th>
                      <th className="p-2">المبلغ</th>
                      <th className="p-2">الرصيد بعد</th>
                      <th className="p-2">المرجع</th>
                      <th className="p-2">الحالة</th>
                      <th className="p-2">إيصال</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => {
                      const amount = Number(r.amount) / 100;
                      const isPositive = amount >= 0;
                      return (
                        <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                          <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("ar-SA")}</td>
                          <td className="p-2"><Badge variant="outline">{typeLabel(r.type)}</Badge></td>
                          <td className={`p-2 num font-bold ${isPositive ? "text-success" : "text-destructive"}`}>
                            {isPositive ? "+" : ""}{amount.toFixed(2)}
                          </td>
                          <td className="p-2 num">{(Number(r.balance_after) / 100).toFixed(2)}</td>
                          <td className="p-2 font-mono text-[10px]">{r.reference}</td>
                          <td className="p-2"><Badge variant={r.status === "completed" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{r.status}</Badge></td>
                          <td className="p-2">
                            <Button size="sm" variant="ghost" className="h-7 px-2"
                              onClick={() => downloadWalletReceipt({
                                id: r.reference ?? r.id,
                                trace_id: r.trace_id ?? r.meta?.trace_id ?? null,
                                kind: r.type,
                                status: r.status,
                                amount_minor: Number(r.amount),
                                currency: r.currency ?? "SAR",
                                created_at: r.created_at,
                                balance_after_minor: r.balance_after != null ? Number(r.balance_after) : null,
                                counterparty: r.counterparty ?? r.meta?.counterparty ?? null,
                                note: r.note ?? r.meta?.note ?? null,
                              })}>
                              <FileDown className="h-3.5 w-3.5" /> PDF
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between text-xs">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>السابق</Button>
              <span>صفحة {page + 1} من {Math.max(1, Math.ceil(total / LIMIT))}</span>
              <Button size="sm" variant="outline" disabled={(page + 1) * LIMIT >= total} onClick={() => setPage((p) => p + 1)}>التالي</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </WorkspaceShell>
  );
}
