import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listIntegrationLogs } from "@/lib/admin-pro.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/logs")({ component: Page });

function Page() {
  const list = useServerFn(listIntegrationLogs);
  const { data: logs = [] } = useQuery({ queryKey: ["all-int-logs"], queryFn: () => list({ data: { limit: 500 } }) });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">سجلات الأنظمة الموحّدة</h1>
          <p className="text-sm text-muted-foreground">آخر 500 عملية تكامل خارجية.</p>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">سجل التكاملات ({logs.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {(logs as any[]).map((l) => (
              <div key={l.id} className="border rounded p-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {l.status === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                    <Badge variant="outline" className="font-mono">{l.provider}</Badge>
                    <span className="text-muted-foreground">{l.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("ar")}</span>
                </div>
                {l.error && <pre className="text-xs text-destructive mt-1 whitespace-pre-wrap">{l.error}</pre>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
