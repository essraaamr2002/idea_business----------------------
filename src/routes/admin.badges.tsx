import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBadgeHolders, runBadgesEvaluation } from "@/lib/badges.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BadgeIcon } from "@/components/badges/BadgeIcon";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/badges")({
  component: BadgesAdminPage,
  head: () => ({ meta: [{ title: "الأوسمة | لوحة الإدارة" }] }),
  errorComponent: ({ error }) => <div className="p-6 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">غير موجود</div>,
});

function BadgesAdminPage() {
  const listFn = useServerFn(listBadgeHolders);
  const runFn = useServerFn(runBadgesEvaluation);
  const [running, setRunning] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "badge-holders"],
    queryFn: () => listFn(),
  });

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await runFn();
      toast.success(`تم تقييم الأوسمة — منح ${res.awarded} وسام`);
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "فشل التقييم");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">نظام الأوسمة التلقائية</h1>
          <p className="text-sm text-muted-foreground">
            يتم تقييم كل عضو مضى على اشتراكه أسبوع فأكثر أسبوعياً (الأحد 3 فجراً UTC).
          </p>
        </div>
        <Button onClick={handleRun} disabled={running}>
          {running && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
          تشغيل التقييم الآن
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["BIRD", "DEER", "LION"] as const).map((code) => (
          <Card key={code}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeIcon badge={code} size={28} showLabel />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {code === "BIRD" && "عضو نشط بالتعليقات والإعجابات وإعادة النشر."}
                {code === "DEER" && "صاحب مشروع جذب عروضاً متعددة وتفاعلاً كثيفاً."}
                {code === "LION" && "حضور صامت متكرر يقدم عروض تمويل سخية."}
              </p>
              <p className="mt-2 text-xs">
                عدد الحاصلين:{" "}
                <strong>{data?.filter((r: any) => r.badges?.code === code).length ?? 0}</strong>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>آخر 200 وسام ممنوح</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا يوجد أي وسام ممنوح بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-right border-b">
                  <tr>
                    <th className="py-2">الوسام</th>
                    <th>المستخدم</th>
                    <th>النقاط</th>
                    <th>تاريخ المنح</th>
                    <th>الطريقة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r: any) => (
                    <tr key={r.user_id + r.awarded_at} className="border-b last:border-0">
                      <td className="py-2">
                        <BadgeIcon badge={r.badges?.code} size={20} showLabel />
                      </td>
                      <td className="font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                      <td>{r.badges?.points_reward}</td>
                      <td>{new Date(r.awarded_at).toLocaleString("ar")}</td>
                      <td className="text-xs">{r.awarded_by === "system_auto" ? "تلقائي" : "يدوي"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm">
        <Link to="/admin" className="text-primary hover:underline">
          ← عودة للوحة الإدارة
        </Link>
      </div>
    </div>
  );
}
