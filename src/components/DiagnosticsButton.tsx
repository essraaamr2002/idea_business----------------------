import { useEffect, useState } from "react";
import { Bug, Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { installDiagnostics, snapshotDiagnostics, sendDiagnosticsReport } from "@/lib/diagnostics-collector";

export function DiagnosticsButton() {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    installDiagnostics();
  }, []);

  function openCollect() {
    setReport(snapshotDiagnostics());
    setOpen(true);
  }

  async function copy() {
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    toast.success("نُسخ التقرير");
  }

  async function send() {
    setSending(true);
    const r = await sendDiagnosticsReport({ note: "manual user report" });
    setSending(false);
    if (r.ok) toast.success("أُرسل التقرير إلى المسؤول"); else toast.error("فشل الإرسال");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          onClick={openCollect}
          aria-label="جمع وإرسال تقرير أخطاء"
          className="fixed bottom-[calc(9.5rem+env(safe-area-inset-bottom))] start-3 z-[90] flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/90 shadow-lg backdrop-blur transition hover:bg-primary hover:text-primary-foreground md:bottom-24 md:start-4"
          title="تقرير أخطاء"
        >
          <Bug className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>تقرير أخطاء — آخر تفاعل</DialogTitle></DialogHeader>
        {report && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border p-2"><b>{report.errorsCount}</b> أخطاء Console</div>
              <div className="rounded-md border p-2"><b>{report.failedRequests}</b> طلبات فاشلة</div>
            </div>
            <pre className="max-h-72 overflow-auto rounded-md border bg-muted/30 p-2 text-[11px] leading-tight" dir="ltr">
{JSON.stringify(report, null, 2)}
            </pre>
            <div className="flex gap-2">
              <Button onClick={copy} variant="outline" size="sm"><Copy className="ml-1 h-3 w-3" /> نسخ</Button>
              <Button onClick={send} size="sm" disabled={sending}><Send className="ml-1 h-3 w-3" /> {sending ? "..." : "إرسال للمسؤول"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
