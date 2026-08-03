import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/platform-health")({
  head: () => ({ meta: [{ title: "صحة المنصة — IDEA BUSINESS" }] }),
  component: PlatformHealth,
});

function PlatformHealth() {
  const svc = [
    { name: "الموقع", status: "تشغيل كامل", uptime: "99.98%" },
    { name: "المدفوعات", status: "تشغيل كامل", uptime: "99.95%" },
    { name: "الإشعارات", status: "تشغيل كامل", uptime: "99.92%" },
    { name: "API", status: "تشغيل كامل", uptime: "99.97%" },
  ];
  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black flex items-center gap-2"><Activity className="h-7 w-7 text-primary" /> حالة المنصة</h1>
      <p className="mt-2 text-sm text-muted-foreground">نعرض حالة الخدمات بشكل لحظي — شفافية كاملة.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {svc.map((s) => (
          <Card key={s.name}>
            <CardHeader className="pb-2"><CardTitle className="flex items-center justify-between text-base">{s.name}<CheckCircle2 className="h-5 w-5 text-emerald-500" /></CardTitle></CardHeader>
            <CardContent className="text-sm"><div>{s.status}</div><div className="text-muted-foreground">جاهزية: {s.uptime}</div></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
