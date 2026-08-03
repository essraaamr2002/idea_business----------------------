import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Rocket, RefreshCw, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/deploy-status")({
  component: DeployStatusPage,
});

type Step = { name: string; status: "ok" | "fail" | "pending"; at?: string; log?: string };

function DeployStatusPage() {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<any>(null);

  async function refresh() {
    setLoading(true);
    try {
      // Health probes against critical endpoints
      const probes = [
        { name: "Build (HTML)", url: "/" },
        { name: "Server functions", url: "/_serverFn/df19ecfa564177abe7bfcc2984dec25c210c3917fed4b3581cc436e1c65ccd64" },
        { name: "Public API (client-log)", url: "/api/public/client-log", method: "OPTIONS" },
      ];
      const results: Step[] = [];
      for (const p of probes) {
        const t0 = performance.now();
        try {
          const r = await fetch(p.url, { method: p.method || "GET" });
          results.push({
            name: p.name,
            status: r.ok || r.status === 204 ? "ok" : "fail",
            at: new Date().toISOString(),
            log: `HTTP ${r.status} · ${Math.round(performance.now() - t0)}ms`,
          });
        } catch (e) {
          results.push({ name: p.name, status: "fail", at: new Date().toISOString(), log: String(e) });
        }
      }
      setInfo({
        published: "https://www.busniss.org",
        preview: location.origin,
        commit: document.querySelector('meta[name="x-build-sha"]')?.getAttribute("content") ?? "—",
        steps: results,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  return (
    <AdminPageShell title="حالة النشر" description="آخر نشر، الفحوصات الحية، وروابط السجلات" icon={Rocket}>
      <div className="flex justify-end">
        <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`ml-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>
      {info && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">المواقع</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span>المنشور (Production)</span>
                <a href={info.published} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  {info.published} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span>المعاينة (Preview)</span>
                <span className="font-mono text-xs">{info.preview}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">خطوات الفحص الحي</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {info.steps.map((s: Step, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    {s.status === "ok"
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      : <AlertCircle className="h-4 w-4 text-destructive" />}
                    <span className="font-medium">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{s.log}</span>
                    <Badge variant={s.status === "ok" ? "secondary" : "destructive"}>{s.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">سجلات</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link className="block text-primary hover:underline" to="/admin/webhooks-retry">سجل Webhooks ومحاولات إعادة التشغيل</Link>
              <Link className="block text-primary hover:underline" to="/admin/audit">سجل تدقيق الإجراءات</Link>
              <Link className="block text-primary hover:underline" to="/admin/health">صحة النظام</Link>
            </CardContent>
          </Card>
        </>
      )}
    </AdminPageShell>
  );
}
