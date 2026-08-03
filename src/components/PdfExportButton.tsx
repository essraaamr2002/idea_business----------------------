import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { exportReportPdf, type PdfSection } from '@/lib/pdf-export';

interface Props {
  title: string;
  subtitle?: string;
  sections: PdfSection[];
  filename?: string;
  chartDataUrl?: string;
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
}

export function PdfExportButton({ title, subtitle, sections, filename, chartDataUrl, variant = 'outline', className }: Props) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={className}
      onClick={() => exportReportPdf({ title, subtitle, sections, filename, chartDataUrl })}
    >
      <FileDown className="w-4 h-4 ml-2" />
      تصدير PDF
    </Button>
  );
}
