import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { listWebhookFailures, retryWebhook } from "@/lib/webhook-retry.functions";

export const Route = createFileRoute("/admin/webhooks-retry")({
  component: Page,
  head: () => ({ meta: [{ title: "إعادة محاولة Webhooks — لوحة الإدارة" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function Page() {
  const listFn = useServerFn(listWebhookFailures);
  const retryFn = useServerFn(retryWebhook);
  const [busy, setBusy] = useState<string | null>(null);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["webhook-failures"],
    queryFn: () => listFn({ data: { days: 7, limit: 50 } }),
  });

  const onRetry = async (orderId: string) => {
    setBusy(orderId);
    try {
      const res = await retryFn({ data: { orderId } });
      if (res.result?.verified) toast.success(`✓ تم التحقق بنجاح — حالة العملية: ${res.intent_status}`);
      else toast.error(`فشلت إعادة المحاولة: ${res.result?.error ?? res.result?.response?.message ?? "غير معروف"}`);
      await refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "تعذّر التنفيذ");
    } finally { setBusy(null); }
  };

  const items = (data as any)?.items ?? [];

  return (
    <WorkspaceShell>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2"><AlertCircle className="h-6 w-6 text-destructive" /> إعادة محاولة Webhooks الفاشلة</h1>
            <p className="text-xs text-muted-foreground">آخر 7 أيام — مجموعة حسب trace_id / order_id.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> تحديث
            </Button>
            <Link to="/admin" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> لوحة الإدارة
            </Link>
          </div>
        </div>

        {items.length === 0 && !isFetching && (
          <Alert><AlertDescription>لا توجد محاولات webhook فاشلة في آخر 7 أيام ✓</AlertDescription></Alert>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">المحاولات الفاشلة ({items.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr className="text-right">
                    <th className="p-2">trace_id / order_id</th>
                    <th className="p-2">عدد المحاولات</th>
                    <th className="p-2">آخر محاولة</th>
                    <th className="p-2">السبب</th>
                    <th className="p-2">الأنواع</th>
                    <th className="p-2">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((g: any) => (
                    <tr key={g.trace_id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-2 font-mono text-[10px]">
                        <div className="font-bold">{g.order_id ?? g.trace_id}</div>
                        <div className="text-muted-foreground">{g.trace_id}</div>
                      </td>
                      <td className="p-2"><Badge variant="destructive">{g.attempts}</Badge></td>
                      <td className="p-2 whitespace-nowrap">{g.last_attempt_at ? new Date(g.last_attempt_at).toLocaleString("ar-SA") : "—"}</td>
                      <td className="p-2 max-w-xs truncate" title={g.last_reason}>{g.last_reason}</td>
                      <td className="p-2">{(g.kinds ?? []).map((k: string) => <Badge key={k} variant="outline" className="ml-1">{k}</Badge>)}</td>
                      <td className="p-2">
                        {g.order_id ? (
                          <Button size="sm" variant="outline" disabled={busy === g.order_id} onClick={() => onRetry(g.order_id)}>
                            {busy === g.order_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            إعادة محاولة
                          </Button>
                        ) : <span className="text-muted-foreground text-[10px]">لا يوجد order_id</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </WorkspaceShell>
  );
}
