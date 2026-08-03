import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Handshake } from "lucide-react";

export const Route = createFileRoute("/admin/purchases")({
  component: AdminPurchases,
});

function AdminPurchases() {
  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["admin-investment-offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_offers")
        .select("id, project_id, investor_id, owner_id, amount, currency, shares, price_per_share, status, message, response_note, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["admin-purchase-requests"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("project_purchase_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const statusColor = (s: string) => ({
    pending: "bg-amber-500/15 text-amber-600",
    accepted: "bg-emerald-500/15 text-emerald-600",
    rejected: "bg-red-500/15 text-red-600",
    countered: "bg-sky-500/15 text-sky-600",
    paid: "bg-emerald-500/15 text-emerald-600",
    completed: "bg-emerald-600/15 text-emerald-700",
    withdrawn: "bg-slate-500/15 text-slate-500",
    cancelled: "bg-slate-500/15 text-slate-500",
    expired: "bg-slate-500/15 text-slate-500",
  } as Record<string, string>)[s] || "bg-muted text-muted-foreground";

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2">
        <Handshake className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-black">طلبات الشراء وعروض التفاوض</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>عروض الاستثمار (آخر 200)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <div className="text-sm text-muted-foreground">جارٍ التحميل…</div>}
          {!isLoading && offers.length === 0 && <div className="text-sm text-muted-foreground">لا توجد عروض بعد.</div>}
          {offers.map((o: any) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3 text-sm">
              <div className="flex flex-col">
                <Link to="/projects/$id" params={{ id: o.project_id }} className="font-bold text-primary hover:underline">مشروع #{o.project_id.slice(0, 8)}</Link>
                <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ar")}</span>
              </div>
              <div className="font-mono">{Number(o.amount).toLocaleString("ar")} {o.currency} · {o.shares} سهم · {Number(o.price_per_share).toFixed(2)}/سهم</div>
              <Badge className={statusColor(o.status)}>{o.status}</Badge>
              <Link to="/u/$username" params={{ username: o.investor_id }} className="text-xs underline">مستثمر</Link>
              <Link to="/u/$username" params={{ username: o.owner_id }} className="text-xs underline">المالك</Link>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>طلبات الشراء اليدوية (محفظة)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {requests.length === 0 && <div className="text-sm text-muted-foreground">لا توجد طلبات بعد.</div>}
          {requests.map((r: any) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3 text-sm">
              <Link to="/projects/$id" params={{ id: r.project_id }} className="font-bold text-primary hover:underline">مشروع #{r.project_id.slice(0, 8)}</Link>
              <div className="font-mono">{Number(r.total_amount).toLocaleString("ar")} {r.currency} · {r.shares} سهم</div>
              <Badge className={statusColor(r.status)}>{r.status}</Badge>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
