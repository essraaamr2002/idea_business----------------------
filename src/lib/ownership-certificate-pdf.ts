import jsPDF from "jspdf";

export type OwnershipCertificate = {
  certificate_no: string;
  issued_at: string;
  project_id: string;
  project_name: string;
  region: string;
  owner_name: string;
  investor_name: string;
  shares: number;
  investment_amount: number;
  avg_buy_price: number;
  guarantees?: { promissory_note?: boolean; trust_receipt?: boolean; other?: string };
  signature_data_url?: string;
  signed_at?: string;
};

/**
 * Generates an Arabic ownership certificate (سند تملك) for project investments.
 * Uses jsPDF basic Latin glyphs for labels and unicode for Arabic via the default
 * font's fallback. Layout mirrors the reference template.
 */
export function downloadOwnershipCertificate(c: OwnershipCertificate) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Outer decorative frame
  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(2);
  doc.rect(28, 28, W - 56, H - 56);
  doc.setLineWidth(0.5);
  doc.setDrawColor(212, 191, 124); // gold
  doc.rect(36, 36, W - 72, H - 72);

  // Header band
  doc.setFillColor(13, 148, 136);
  doc.rect(36, 36, W - 72, 76, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("OWNERSHIP CERTIFICATE", W / 2, 70, { align: "center" });
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Sanad Tamalluk  —  سند تملك", W / 2, 96, { align: "center" });

  // Subtitle
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(11);
  doc.text("IDEA BUSINESS  |  Harraj Almashari", W / 2, 132, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Middle East & North Africa  •  مشاريع دول الشرق الأوسط وشمال إفريقيا", W / 2, 148, { align: "center" });

  // Certificate number + date
  doc.setDrawColor(220);
  doc.line(60, 168, W - 60, 168);
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text(`Certificate No. / رقم السند:  ${c.certificate_no}`, 60, 188);
  doc.text(`Date / التاريخ:  ${new Date(c.issued_at).toLocaleDateString("en-GB")}`, W - 60, 188, { align: "right" });

  // Body fields
  let y = 230;
  const labelX = W - 60;
  const valueX = 60;
  const rowGap = 38;

  const fmtMoney = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} SAR`;

  const rows: Array<{ ar: string; en: string; value: string }> = [
    { ar: "اسم المشروع", en: "Project Name", value: c.project_name },
    { ar: "المنطقة", en: "Region", value: c.region },
    { ar: "اسم صاحب الفكرة / المشروع", en: "Project Owner", value: c.owner_name },
    { ar: "اسم المستثمر", en: "Investor", value: c.investor_name },
    { ar: "مبلغ الاستثمار", en: "Investment Amount", value: fmtMoney(c.investment_amount) },
    { ar: "عدد الأسهم", en: "Shares", value: c.shares.toLocaleString("en-US") },
  ];

  for (const r of rows) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(13, 148, 136);
    doc.text(`${r.en}  /  ${r.ar} :`, labelX, y, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(20);
    const lines = doc.splitTextToSize(String(r.value || "—"), W - 140);
    doc.text(lines, valueX, y + 18);

    doc.setDrawColor(210);
    doc.line(60, y + 26, W - 60, y + 26);
    y += rowGap;
  }

  // Guarantee documents block
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(13, 148, 136);
  doc.text("Guarantee Documents  /  أوراق ضمان المشروع :", labelX, y, { align: "right" });
  y += 22;
  const box = (x: number, label: string, checked: boolean) => {
    doc.setDrawColor(80);
    doc.rect(x, y - 10, 12, 12);
    if (checked) {
      doc.setLineWidth(1.2);
      doc.line(x + 2, y - 4, x + 5, y - 1);
      doc.line(x + 5, y - 1, x + 10, y - 8);
      doc.setLineWidth(0.5);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text(label, x + 18, y);
  };
  box(60, "Promissory Note  /  سند لأمر", !!c.guarantees?.promissory_note);
  box(240, "Trust Receipt  /  وصل أمانة", !!c.guarantees?.trust_receipt);
  box(400, `Other / أخرى: ${c.guarantees?.other ?? "—"}`, !!c.guarantees?.other);

  // Signature blocks
  y = H - 200;
  doc.setDrawColor(160);
  doc.rect(60, y, 200, 80);
  doc.rect(W - 260, y, 200, 80);

  // Embed investor signature image if present
  if (c.signature_data_url && c.signature_data_url.startsWith("data:image/")) {
    try {
      const fmt = c.signature_data_url.includes("image/jpeg") ? "JPEG" : "PNG";
      doc.addImage(c.signature_data_url, fmt, 64, y + 4, 192, 72);
      // signed-at + cert binding caption below box
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(90);
      const stamp = c.signed_at ? new Date(c.signed_at).toLocaleString("en-GB") : "";
      doc.text(`Signed: ${stamp}  •  Bound to: ${c.certificate_no}`, 160, y + 114, { align: "center" });
    } catch {
      /* ignore image errors */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40);
  doc.text("Investor Signature  /  توقيع المستثمر", 160, y + 100, { align: "center" });
  doc.text("Owner Signature  /  توقيع المالك", W - 160, y + 100, { align: "center" });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    "This certificate is auto-generated by busniss.org and serves as proof of ownership recorded on the immutable hash-chained ledger.",
    W / 2,
    H - 60,
    { align: "center" },
  );
  doc.text(
    "هذا السند صادر آلياً من منصة IDEA BUSINESS ويُعدّ إثباتاً للتملك المُسجّل في سجل غير قابل للتعديل.",
    W / 2,
    H - 48,
    { align: "center" },
  );

  const safe = c.certificate_no.replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`ownership-certificate-${safe}.pdf`);
}
