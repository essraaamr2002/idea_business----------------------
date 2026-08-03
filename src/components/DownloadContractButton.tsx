import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  projectName: string;
  investorName: string;
  ownerName: string;
  shares: number;
  pricePerShare: number;
  currency: string;
  txReference?: string;
};

export function DownloadContractButton(props: Props) {
  const generate = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const now = new Date().toLocaleDateString("ar-EG");
      const total = props.shares * props.pricePerShare;
      doc.setFontSize(18);
      doc.text("Investment Contract Draft", 105, 20, { align: "center" });
      doc.setFontSize(11);
      doc.text("مسودة عقد استثمار", 105, 28, { align: "center" });
      doc.setFontSize(10);
      const lines = [
        `Date: ${now}`,
        `Project: ${props.projectName}`,
        `Investor: ${props.investorName}`,
        `Founder: ${props.ownerName}`,
        ``,
        `Shares purchased: ${props.shares}`,
        `Price per share: ${props.pricePerShare} ${props.currency}`,
        `Total amount: ${total} ${props.currency}`,
        props.txReference ? `Transaction ref: ${props.txReference}` : "",
        ``,
        `Terms:`,
        `- This document is an auto-generated draft based on the transaction completed`,
        `  on the IDEA BUSINESS platform.`,
        `- The investor acknowledges receipt of the share allocation above.`,
        `- The founder commits to the financial figures published on the project page`,
        `  at the time of purchase.`,
        `- Disputes are handled via the platform's dispute resolution system.`,
        ``,
        `Signatures:`,
        ``,
        `Investor: ____________________     Founder: ____________________`,
      ];
      let y = 45;
      lines.forEach((l) => { doc.text(l, 20, y); y += 6; });
      doc.save(`contract-${Date.now()}.pdf`);
    } catch (e: any) {
      toast.error("تعذّر توليد العقد: " + (e.message || ""));
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={generate}>
      <FileText className="h-4 w-4 ml-1" /> تحميل مسودة العقد (PDF)
    </Button>
  );
}
