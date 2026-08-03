import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, FileText, Loader2, Search } from "lucide-react";
import { adminListInvoices } from "@/lib/invoices.functions";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";

export const Route = createFileRoute("/admin/invoices")({
  component: AdminInvoicesPage,
  head: () => ({ meta: [{ title: "فواتير المنصة — لوحة الإدارة" }] }),
});

function AdminInvoicesPage() {
  const list = useServerFn(adminListInvoices);
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-invoices", search],
    queryFn: () => list({ data: { search: search || undefined } }),
  });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-extrabold">فواتير المنصة</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && refetch()}
              placeholder="رقم/مرجع/معاملة…"
              className="rounded-lg border border-border bg-card py-1.5 pr-7 pl-2 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-3 text-right">رقم الفاتورة</th>
              <th className="p-3 text-right">العميل</th>
              <th className="p-3 text-right">التاريخ</th>
              <th className="p-3 text-right">الغرض</th>
              <th className="p-3 text-right">البوابة</th>
              <th className="p-3 text-right">المبلغ</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="p-6 text-center"><Loader2 className="inline h-4 w-4 animate-spin" /></td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">لا توجد فواتير.</td></tr>}
            {rows.map((inv: any) => (
              <tr key={inv.id} className="border-t border-border/60">
                <td className="p-3 font-mono text-xs font-bold">{inv.invoice_number}</td>
                <td className="p-3 font-mono text-[10px] text-muted-foreground">{(inv.user_id ?? "").slice(0, 8)}…</td>
                <td className="p-3 text-xs">{new Date(inv.issued_at).toLocaleString("ar")}</td>
                <td className="p-3 text-xs">{inv.purpose ?? "—"}</td>
                <td className="p-3 text-xs">{inv.provider ?? "—"}</td>
                <td className="p-3 font-bold">{Number(inv.amount).toFixed(2)} {inv.currency}</td>
                <td className="p-3 text-left">
                  <button
                    onClick={() => downloadInvoicePdf(inv)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground"
                  >
                    <Download className="h-3 w-3" /> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
