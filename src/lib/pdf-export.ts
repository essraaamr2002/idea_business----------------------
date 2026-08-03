import { jsPDF } from 'jspdf';

export interface PdfSection {
  heading: string;
  body: string;
}

export function exportReportPdf(opts: {
  title: string;
  subtitle?: string;
  sections: PdfSection[];
  chartDataUrl?: string; // optional PNG data URL of a chart
  filename?: string;
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(opts.title, pageW - margin, y, { align: 'right' });
  y += 26;

  if (opts.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text(opts.subtitle, pageW - margin, y, { align: 'right' });
    y += 18;
    doc.setTextColor(0);
  }

  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  if (opts.chartDataUrl) {
    const w = pageW - margin * 2;
    const h = w * 0.5;
    try {
      doc.addImage(opts.chartDataUrl, 'PNG', margin, y, w, h);
      y += h + 20;
    } catch {
      /* ignore bad image */
    }
  }

  for (const s of opts.sections) {
    if (y > 760) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(s.heading, pageW - margin, y, { align: 'right' });
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(s.body, pageW - margin * 2);
    for (const ln of lines) {
      if (y > 780) {
        doc.addPage();
        y = margin;
      }
      doc.text(ln, pageW - margin, y, { align: 'right' });
      y += 14;
    }
    y += 8;
  }

  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(
    `Generated ${new Date().toLocaleString()} — Haraj Al-Mashari`,
    margin,
    doc.internal.pageSize.getHeight() - 20,
  );

  doc.save(opts.filename ?? 'report.pdf');
}

/** Capture an HTMLCanvasElement (e.g. Recharts <ResponsiveContainer> won't work — pass a real canvas). */
export function canvasToDataUrl(el: HTMLCanvasElement | null): string | undefined {
  if (!el) return undefined;
  try {
    return el.toDataURL('image/png');
  } catch {
    return undefined;
  }
}
