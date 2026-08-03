import jsPDF from "jspdf";

export type InvoiceInput = {
  invoice_number: string;
  amount: number | string;
  currency: string;
  purpose?: string | null;
  provider?: string | null;
  order_id?: string | null;
  transaction_id?: string | null;
  issued_at: string;
};

const PURPOSE_AR: Record<string, string> = {
  wallet_topup: "شحن المحفظة",
  checkout: "عملية شراء",
  membership: "اشتراك عضوية",
  seriousness_deposit: "وديعة جدية",
};

export function downloadInvoicePdf(inv: InvoiceInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 56;

  // Header band
  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("INVOICE / فاتورة", 40, 50);
  doc.setFontSize(11);
  doc.text("Haraj Al-Mashare3 — IDEA BUSINESS", 40, 72);

  y = 130;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Invoice #: ${inv.invoice_number}`, 40, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const rows: [string, string][] = [
    ["Issued at", new Date(inv.issued_at).toLocaleString("en-GB")],
    ["Purpose", PURPOSE_AR[inv.purpose ?? ""] ?? inv.purpose ?? "—"],
    ["Provider", inv.provider ?? "—"],
    ["Order ID", inv.order_id ?? "—"],
    ["Transaction ID", inv.transaction_id ?? "—"],
  ];
  for (const [k, v] of rows) {
    doc.setTextColor(100, 116, 139);
    doc.text(k, 40, y);
    doc.setTextColor(15, 23, 42);
    doc.text(String(v), 200, y);
    y += 18;
  }

  // Amount box
  y += 16;
  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(1.2);
  doc.roundedRect(40, y, W - 80, 70, 8, 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text("Total amount", 60, y + 28);
  doc.setFontSize(22);
  doc.setTextColor(13, 148, 136);
  const amt = `${Number(inv.amount).toFixed(2)} ${inv.currency}`;
  doc.text(amt, W - 60, y + 44, { align: "right" });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("هذه الفاتورة صادرة آليا عن منصة IDEA BUSINESS — صالحة بدون توقيع.", W / 2, 780, { align: "center" });
  doc.text("This invoice was generated automatically. No signature required.", W / 2, 794, { align: "center" });

  doc.save(`${inv.invoice_number}.pdf`);
}
