import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Users } from "lucide-react";
import { getReferralsLeaderboard } from "@/lib/mega-pack-2.functions";

export const Route = createFileRoute("/admin/referrals-board")({
  head: () => ({ meta: [{ title: "قادة الإحالات | إدارة" }] }),
  component: RefBoardPage,
});

function RefBoardPage() {
  const fn = useServerFn(getReferralsLeaderboard);
  const { data, error } = useQuery({ queryKey: ["ref-board"], queryFn: () => fn() });
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader icon={<Users className="h-6 w-6" />} title="قادة الإحالات" subtitle="أعلى المستخدمين إحالة على المنصة." />
        {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-500">{(error as Error).message}</div>}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-right">#</th>
                <th className="px-3 py-2 text-right">الكود</th>
                <th className="px-3 py-2 text-right">المُحيل</th>
                <th className="px-3 py-2 text-right">الاستخدامات</th>
                <th className="px-3 py-2 text-right">إجمالي المكافآت</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((r: any, i: number) => (
                <tr key={r.code + i} className="border-t border-border/60">
                  <td className="px-3 py-2 font-bold">{i + 1}</td>
                  <td className="px-3 py-2 font-mono">{r.code}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{String(r.referrer_id).slice(0, 12)}…</td>
                  <td className="px-3 py-2 font-extrabold">{r.uses_count}</td>
                  <td className="px-3 py-2 tabular-nums">{Number(r.reward_total ?? 0).toLocaleString()}</td>
                </tr>
              ))}
              {data && data.items.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">لا توجد إحالات بعد.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
