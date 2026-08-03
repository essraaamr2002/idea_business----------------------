import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/transparency")({
  head: () => ({ meta: [{ title: "تقارير الشفافية الفصلية — IDEA BUSINESS" }] }),
  component: TransparencyPage,
});

function TransparencyPage() {
  const reports = [
    { q: "Q2 2026", funded: "$1.42M", projects: 86, payouts: "$210K" },
    { q: "Q1 2026", funded: "$1.18M", projects: 72, payouts: "$174K" },
    { q: "Q4 2025", funded: "$0.97M", projects: 61, payouts: "$132K" },
  ];
  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black flex items-center gap-2"><FileText className="h-7 w-7 text-primary" /> تقارير الشفافية</h1>
      <p className="mt-2 text-sm text-muted-foreground">ننشر كل 3 أشهر تقريراً مفصلاً عن أداء المنصة، التمويل، والمدفوعات.</p>
      <div className="mt-6 grid gap-3">
        {reports.map((r) => (
          <Card key={r.q}>
            <CardHeader><CardTitle className="flex items-center justify-between">{r.q}<Button size="sm" variant="outline" onClick={() => toast.info(`تقرير ${r.q}`, { description: "سنرسل النسخة الكاملة لبريدك." })}><Download className="h-4 w-4 me-1" />PDF</Button></CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center text-sm">
              <div><div className="font-black text-lg">{r.funded}</div><div className="text-muted-foreground">إجمالي التمويل</div></div>
              <div><div className="font-black text-lg">{r.projects}</div><div className="text-muted-foreground">مشاريع ممولة</div></div>
              <div><div className="font-black text-lg">{r.payouts}</div><div className="text-muted-foreground">مدفوعات للمستثمرين</div></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
