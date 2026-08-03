import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { ShieldAlert } from "lucide-react";
import { getFraudRadar } from "@/lib/mega-pack.functions";

export const Route = createFileRoute("/admin/fraud-radar")({
  head: () => ({ meta: [{ title: "رادار الاحتيال | إدارة" }] }),
  component: FraudRadarPage,
});

const sevClass: Record<string, string> = {
  critical: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  high: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  medium: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

function FraudRadarPage() {
  const fn = useServerFn(getFraudRadar);
  const { data, isLoading, error } = useQuery({
    queryKey: ["fraud-radar"],
    queryFn: () => fn(),
    refetchInterval: 60000,
  });
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <PageHeader icon={<ShieldAlert className="h-6 w-6" />} title="رادار الاحتيال" subtitle="تنبيهات AML + أحداث أمنية خلال 7 أيام — تحديث كل دقيقة." />
        {isLoading && <div className="rounded-xl border border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">جارٍ التحميل…</div>}
        {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-500">{(error as Error).message}</div>}
        {data && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-xl border border-border bg-card/60 p-3">
                <div className="text-xs text-muted-foreground">إجمالي التنبيهات</div>
                <div className="text-xl font-extrabold">{data.total}</div>
              </div>
              {(["critical", "high", "medium", "low"] as const).map((k) => (
                <div key={k} className={`rounded-xl border p-3 ${sevClass[k]}`}>
                  <div className="text-xs capitalize">{k}</div>
                  <div className="text-xl font-extrabold">{data.by_severity[k] || 0}</div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border bg-card/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-right">النوع</th>
                    <th className="px-3 py-2 text-right">الفئة</th>
                    <th className="px-3 py-2 text-right">الخطورة</th>
                    <th className="px-3 py-2 text-right">الحالة</th>
                    <th className="px-3 py-2 text-right">الهدف</th>
                    <th className="px-3 py-2 text-right">الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r) => (
                    <tr key={`${r.kind}-${r.id}`} className="border-t border-border/60">
                      <td className="px-3 py-2 font-bold">{r.kind}</td>
                      <td className="px-3 py-2">{r.type}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-md border px-2 py-0.5 text-[11px] ${sevClass[String(r.severity ?? "low").toLowerCase()] || sevClass.low}`}>
                          {r.severity ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.status ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{String(r.subject ?? "—").slice(0, 12)}…</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.at ? new Date(r.at).toLocaleString("ar") : "—"}</td>
                    </tr>
                  ))}
                  {data.recent.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">لا توجد تنبيهات — النظام هادئ.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
