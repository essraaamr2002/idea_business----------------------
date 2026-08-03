import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Loader2 } from "lucide-react";
import { listMyInvoices } from "@/lib/invoices.functions";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";

export const Route = createFileRoute("/invoices")({
  component: InvoicesPage,
  head: () => ({ meta: [{ title: "فواتيري — IDEA BUSINESS" }, { name: "description", content: "سجل الفواتير الصادرة آليا عن عملياتك على منصة IDEA BUSINESS." }] }),
});

function InvoicesPage() {
  const list = useServerFn(listMyInvoices);
  const { data = [], isLoading } = useQuery({ queryKey: ["my-invoices"], queryFn: () => list() });

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-extrabold">فواتيري</h1>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">تصدر الفاتورة تلقائياً عند نجاح أي عملية دفع. يمكنك تحميل نسخة PDF لكل فاتورة.</p>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-3 text-right">رقم الفاتورة</th>
              <th className="p-3 text-right">التاريخ</th>
              <th className="p-3 text-right">الغرض</th>
              <th className="p-3 text-right">المبلغ</th>
              <th className="p-3 text-right">المرجع</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin" /> جاري التحميل…</td></tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">لا توجد فواتير بعد.</td></tr>
            )}
            {data.map((inv: any) => (
              <tr key={inv.id} className="border-t border-border/60">
                <td className="p-3 font-mono text-xs font-bold">{inv.invoice_number}</td>
                <td className="p-3 text-xs">{new Date(inv.issued_at).toLocaleString("ar")}</td>
                <td className="p-3 text-xs">{inv.purpose ?? "—"}</td>
                <td className="p-3 font-bold">{Number(inv.amount).toFixed(2)} {inv.currency}</td>
                <td className="p-3 font-mono text-[10px] text-muted-foreground">{inv.order_id ?? inv.transaction_id ?? "—"}</td>
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
