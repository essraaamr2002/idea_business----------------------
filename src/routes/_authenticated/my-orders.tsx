import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { ListOrdered } from "lucide-react";
import { getMyOrders } from "@/lib/mega-pack-2.functions";

export const Route = createFileRoute("/_authenticated/my-orders")({
  head: () => ({ meta: [{ title: "أوامري | IDEA BUSINESS" }] }),
  component: MyOrdersPage,
});

const statusClass: Record<string, string> = {
  filled: "bg-emerald-500/15 text-emerald-500",
  partial: "bg-amber-500/15 text-amber-600",
  open: "bg-sky-500/15 text-sky-500",
  cancelled: "bg-muted text-muted-foreground",
  rejected: "bg-rose-500/15 text-rose-500",
};

function MyOrdersPage() {
  const fn = useServerFn(getMyOrders);
  const { data } = useQuery({ queryKey: ["my-orders"], queryFn: () => fn(), refetchInterval: 15000 });
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <PageHeader icon={<ListOrdered className="h-6 w-6" />} title="أوامري" subtitle="سجل أوامر التداول مع حالة التنفيذ والرافعة." />
        <div className="overflow-x-auto rounded-2xl border border-border bg-card/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-right">المشروع</th>
                <th className="px-3 py-2 text-right">الجانب</th>
                <th className="px-3 py-2 text-right">النوع</th>
                <th className="px-3 py-2 text-right">الكمية</th>
                <th className="px-3 py-2 text-right">السعر</th>
                <th className="px-3 py-2 text-right">منفّذ</th>
                <th className="px-3 py-2 text-right">رافعة</th>
                <th className="px-3 py-2 text-right">الحالة</th>
                <th className="px-3 py-2 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((o: any) => (
                <tr key={o.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-bold">{o.projects?.name || o.project_id}</td>
                  <td className={`px-3 py-2 font-extrabold ${o.side === "buy" ? "text-emerald-500" : "text-rose-500"}`}>{o.side}</td>
                  <td className="px-3 py-2">{o.type}</td>
                  <td className="px-3 py-2 tabular-nums">{o.quantity}</td>
                  <td className="px-3 py-2 tabular-nums">{o.price ?? "market"}</td>
                  <td className="px-3 py-2 tabular-nums">{o.filled_quantity ?? 0}</td>
                  <td className="px-3 py-2">{o.leverage ?? 1}×</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${statusClass[o.status] || "bg-muted"}`}>{o.status}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ar")}</td>
                </tr>
              ))}
              {data && data.items.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">لا توجد أوامر بعد.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
