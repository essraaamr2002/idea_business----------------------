import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { downloadFile, toCsv, printableReport } from "@/lib/export-utils";

/** Wallet/transactions export buttons (#133). */
export function WalletExportButtons({ rows, filename = "wallet" }: { rows: Array<Record<string, any>>; filename?: string }) {
  const csv = () => downloadFile(`${filename}.csv`, toCsv(rows), "text/csv;charset=utf-8");
  const json = () => downloadFile(`${filename}.json`, JSON.stringify(rows, null, 2), "application/json");
  const print = () => printableReport(filename, rows);

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={csv}>
        <FileSpreadsheet className="me-1 h-4 w-4" /> CSV / Excel
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={json}>
        <Download className="me-1 h-4 w-4" /> JSON
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={print}>
        <FileText className="me-1 h-4 w-4" /> PDF / طباعة
      </Button>
    </div>
  );
}
