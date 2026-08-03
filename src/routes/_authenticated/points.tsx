import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Award } from "lucide-react";
import { getPointsLedger } from "@/lib/mega-pack-2.functions";

export const Route = createFileRoute("/_authenticated/points")({
  head: () => ({ meta: [{ title: "نقاطي ومستواي | IDEA BUSINESS" }] }),
  component: PointsPage,
});

function PointsPage() {
  const fn = useServerFn(getPointsLedger);
  const { data } = useQuery({ queryKey: ["points-ledger"], queryFn: () => fn() });
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader icon={<Award className="h-6 w-6" />} title="نقاطي ومستواي" subtitle="سجل النقاط ومسار الترقية بين الأوسمة." />
        {data && (
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <div className="text-xs text-muted-foreground">إجمالي النقاط</div>
              <div className="text-2xl font-extrabold tabular-nums">{data.total.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <div className="text-xs text-muted-foreground">المستوى الحالي</div>
              <div className="text-2xl font-extrabold">{data.level}</div>
            </div>
            <div className="rounded-xl border border-border bg-card/60 p-4">
              <div className="text-xs text-muted-foreground">للمستوى التالي</div>
              <div className="text-2xl font-extrabold">{data.points_to_next ?? "—"}</div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr><th className="px-3 py-2 text-right">التاريخ</th><th className="px-3 py-2 text-right">السبب</th><th className="px-3 py-2 text-right">النقاط</th></tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((r: any) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</td>
                  <td className="px-3 py-2">{r.reason}</td>
                  <td className={`px-3 py-2 font-extrabold ${Number(r.points) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{Number(r.points) >= 0 ? "+" : ""}{r.points}</td>
                </tr>
              ))}
              {data && data.items.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-sm text-muted-foreground">لا يوجد سجل نقاط بعد.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
