import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/admin-pro.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Database, AlertTriangle, Plug, Zap } from "lucide-react";

export const Route = createFileRoute("/admin/health")({ component: Page });

function Stat({ icon: Icon, label, value, hint, tone = "default" }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-8 w-8 ${tone === "danger" ? "text-destructive" : "text-primary"}`} />
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value ?? "—"}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function Page() {
  const get = useServerFn(getHealth);
  const { data } = useQuery({ queryKey: ["health"], queryFn: () => get(), refetchInterval: 15000 });
  const h: any = data ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">مراقب صحة النظام</h1>
          <p className="text-sm text-muted-foreground">يتحدث كل 15 ثانية.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Stat icon={Database} label="نسخ احتياطية" value={h.backups_total} hint={h.latest_backup ? `آخر نسخة: ${new Date(h.latest_backup).toLocaleString("ar")}` : "—"} />
        <Stat icon={Plug} label="تكاملات مفعّلة" value={h.integrations_enabled} />
        <Stat icon={Zap} label="قواعد أتمتة نشطة" value={h.automations_enabled} />
        <Stat icon={Activity} label="استدعاءات تكاملات (ساعة)" value={h.integration_calls_1h} />
        <Stat icon={AlertTriangle} label="أخطاء تكاملات (24س)" value={h.integration_errors_24h} tone={h.integration_errors_24h > 0 ? "danger" : "default"} />
      </div>
    </div>
  );
}
