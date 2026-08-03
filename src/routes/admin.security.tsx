import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getSecurityOverview, listSecurityEvents } from "@/lib/security-admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, ShieldCheck, Globe2, Activity, Lock, Ban } from "lucide-react";

export const Route = createFileRoute("/admin/security")({
  component: SecurityDashboard,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">{String(error?.message || error)}</div>,
  notFoundComponent: () => <div className="p-6">غير موجود</div>,
});

function SecurityDashboard() {
  const overviewFn = useServerFn(getSecurityOverview);
  const eventsFn = useServerFn(listSecurityEvents);
  const [severity, setSeverity] = useState<string>("all");
  const [blockedOnly, setBlockedOnly] = useState(false);

  const overview = useQuery({
    queryKey: ["security-overview"],
    queryFn: () => overviewFn(),
    refetchInterval: 15000,
  });

  const events = useQuery({
    queryKey: ["security-events", severity, blockedOnly],
    queryFn: () =>
      eventsFn({
        data: { limit: 150, severity: severity === "all" ? undefined : severity, blockedOnly },
      }),
    refetchInterval: 15000,
  });

  const o: any = overview.data ?? {};

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          مركز عمليات الأمن (SOC)
        </h1>
        <Button variant="outline" size="sm" onClick={() => { overview.refetch(); events.refetch(); }}>
          تحديث
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={<Activity />} label="أحداث 24س" value={o.events_24h ?? "—"} />
        <Kpi icon={<Ban className="text-destructive" />} label="محجوبة 24س" value={o.blocked_24h ?? "—"} tone="danger" />
        <Kpi icon={<ShieldAlert className="text-amber-500" />} label="حرجة/عالية" value={o.critical_24h ?? "—"} tone="warn" />
        <Kpi icon={<Globe2 />} label="IPs فريدة" value={o.unique_ips_24h ?? "—"} />
        <Kpi icon={<Lock />} label="محافظ مقفلة" value={o.wallet_lockdowns ?? "—"} />
        <Kpi icon={<Ban />} label="IPs محظورة" value={o.blocked_ips ?? "—"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">أكثر IPs مهاجمة (24س)</CardTitle></CardHeader>
          <CardContent>
            {!o.top_offending_ips?.length ? (
              <p className="text-sm text-muted-foreground">لا توجد محاولات مرفوضة.</p>
            ) : (
              <ul className="space-y-2">
                {o.top_offending_ips.map((x: any) => (
                  <li key={x.ip} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{x.ip}</span>
                    <Badge variant="destructive">{x.count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">أكثر أنواع الأحداث (24س)</CardTitle></CardHeader>
          <CardContent>
            {!o.top_event_types?.length ? (
              <p className="text-sm text-muted-foreground">لا توجد أحداث.</p>
            ) : (
              <ul className="space-y-2">
                {o.top_event_types.map((x: any) => (
                  <li key={x.event_type} className="flex items-center justify-between text-sm">
                    <span className="font-mono">{x.event_type}</span>
                    <Badge variant="secondary">{x.count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">سجل الأحداث الأمنية</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الخطورات</SelectItem>
                <SelectItem value="critical">حرج</SelectItem>
                <SelectItem value="high">عالي</SelectItem>
                <SelectItem value="info">معلومات</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={blockedOnly ? "default" : "outline"} size="sm" onClick={() => setBlockedOnly((x) => !x)}>
              المحجوبة فقط
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-right p-2">التاريخ</th>
                <th className="text-right p-2">النوع</th>
                <th className="text-right p-2">الخطورة</th>
                <th className="text-right p-2">IP</th>
                <th className="text-right p-2">المورد</th>
                <th className="text-right p-2">محجوب</th>
                <th className="text-right p-2">تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {(events.data ?? []).map((e: any) => (
                <tr key={e.id} className="border-b hover:bg-muted/30">
                  <td className="p-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString("ar")}</td>
                  <td className="p-2 font-mono text-xs">{e.event_type}</td>
                  <td className="p-2">
                    <Badge variant={e.severity === "critical" ? "destructive" : e.severity === "high" ? "destructive" : "secondary"}>
                      {e.severity}
                    </Badge>
                  </td>
                  <td className="p-2 font-mono text-xs">{e.ip ?? "—"}</td>
                  <td className="p-2">{e.resource ?? "—"}</td>
                  <td className="p-2">{e.blocked ? "✅" : "—"}</td>
                  <td className="p-2 max-w-xs truncate text-xs text-muted-foreground" title={JSON.stringify(e.details)}>
                    {JSON.stringify(e.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!events.data?.length && (
            <p className="text-center text-muted-foreground py-8">لا توجد أحداث.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: any; tone?: "danger" | "warn" }) {
  const ring = tone === "danger" ? "border-destructive/40" : tone === "warn" ? "border-amber-500/40" : "";
  return (
    <Card className={ring}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">{icon}</div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
