import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Trophy } from "lucide-react";
import { getSectorLeaderboard } from "@/lib/mega-pack-2.functions";

export const Route = createFileRoute("/sector-leaderboard")({
  head: () => ({
    meta: [
      { title: "قائمة قادة القطاعات | IDEA BUSINESS" },
      { name: "description", content: "ترتيب القطاعات حسب حجم التمويل والمشروع الأبرز في كل قطاع." },
    ],
  }),
  component: SectorBoardPage,
});

function SectorBoardPage() {
  const fn = useServerFn(getSectorLeaderboard);
  const { data } = useQuery({ queryKey: ["sector-leaderboard"], queryFn: () => fn() });
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <PageHeader icon={<Trophy className="h-6 w-6" />} title="قادة القطاعات" subtitle="ترتيب القطاعات حسب التمويل والمشروع الأبرز في كلٍّ منها." />
        <div className="overflow-x-auto rounded-2xl border border-border bg-card/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-right">#</th>
                <th className="px-3 py-2 text-right">القطاع</th>
                <th className="px-3 py-2 text-right">عدد المشاريع</th>
                <th className="px-3 py-2 text-right">حجم التمويل</th>
                <th className="px-3 py-2 text-right">المشاهدات</th>
                <th className="px-3 py-2 text-right">المشروع الأبرز</th>
              </tr>
            </thead>
            <tbody>
              {(data?.sectors ?? []).map((s, i) => (
                <tr key={s.sector} className="border-t border-border/60">
                  <td className="px-3 py-2 font-bold">{i + 1}</td>
                  <td className="px-3 py-2 font-bold">{s.sector}</td>
                  <td className="px-3 py-2">{s.count}</td>
                  <td className="px-3 py-2 tabular-nums">{s.funded.toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{s.views.toLocaleString()}</td>
                  <td className="px-3 py-2">
                    {s.top_id ? <Link to="/project/$id" params={{ id: s.top_id }} className="text-primary hover:underline">{s.top_name}</Link> : "—"}
                  </td>
                </tr>
              ))}
              {data && data.sectors.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">لا توجد بيانات بعد.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
