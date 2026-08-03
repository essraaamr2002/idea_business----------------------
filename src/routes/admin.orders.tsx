import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listOrders, updateOrderStatus } from "@/lib/admin-pro.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({ component: Page });

const STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];
const COLORS: Record<string, string> = { pending: "secondary", paid: "default", processing: "default", shipped: "default", delivered: "default", cancelled: "destructive", refunded: "destructive" };

function Page() {
  const list = useServerFn(listOrders);
  const update = useServerFn(updateOrderStatus);
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => list() });
  const updateM = useMutation({ mutationFn: (v: { id: string; status: string }) => update({ data: v }), onSuccess: () => { toast.success("تم"); qc.invalidateQueries({ queryKey: ["orders"] }); } });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingCart className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">الطلبات ({orders.length})</h1>
          <p className="text-sm text-muted-foreground">جميع طلبات الكتالوج مع تحكم كامل بالحالة.</p>
        </div>
      </div>
      <Card><CardContent className="p-0 divide-y">
        {orders.length === 0 && <p className="text-center text-muted-foreground py-12">لا توجد طلبات بعد.</p>}
        {(orders as any[]).map((o) => (
          <div key={o.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm">{o.order_number}</div>
              <div className="text-sm text-muted-foreground">{o.customer_name ?? "—"} · {o.customer_email ?? o.customer_phone ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ar")}</div>
            </div>
            <div className="font-semibold">{o.total} {o.currency}</div>
            <Badge variant={COLORS[o.status] as any}>{o.status}</Badge>
            <Select value={o.status} onValueChange={(v) => updateM.mutate({ id: o.id, status: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ))}
      </CardContent></Card>
    </div>
  );
}
