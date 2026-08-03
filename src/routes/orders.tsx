import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Package, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "طلبات الخدمات" }] }),
  component: OrdersPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار قبول المزود", accepted: "مقبول — بانتظار البدء", in_progress: "قيد التنفيذ",
  delivered: "تم التسليم — بانتظار اعتمادك", completed: "مكتمل", disputed: "متنازع عليه",
  cancelled: "ملغى", refunded: "مُسترد",
};

function OrdersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: myProvider } = useQuery({
    enabled: !!user,
    queryKey: ["my-provider", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_providers").select("id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: clientOrders } = useQuery({
    enabled: !!user,
    queryKey: ["client-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_orders").select("*, service_providers(display_name)").eq("client_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: providerOrders } = useQuery({
    enabled: !!myProvider?.id,
    queryKey: ["provider-orders", myProvider?.id],
    queryFn: async () => {
      const { data } = await supabase.from("service_orders").select("*").eq("provider_id", myProvider!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const act = async (id: string, patch: any, escrowFn?: string) => {
    try {
      const { error } = await supabase.from("service_orders").update(patch).eq("id", id);
      if (error) throw error;
      if (escrowFn) {
        const { error: e2 } = await (supabase.rpc as any)(escrowFn, { p_order_id: id });
        if (e2) throw e2;
      }
      toast.success("تم التحديث");
      qc.invalidateQueries({ queryKey: ["client-orders"] });
      qc.invalidateQueries({ queryKey: ["provider-orders"] });
    } catch (e: any) {
      toast.error(e.message || "تعذّر التحديث");
    }
  };

  if (!user) return <div className="p-8 text-center">سجّل الدخول أولاً</div>;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <PageHeader
          icon={<Package className="h-6 w-6" />}
          title="طلبات الخدمات"
          subtitle="طلباتك كمشترٍ ومزود، مع تحكم Escrow كامل."
          actions={<Button asChild variant="outline"><Link to="/services">تصفّح المزودين</Link></Button>}
        />

        <Card>
          <CardHeader><CardTitle className="text-base">طلباتي (كمشتري)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(clientOrders ?? []).length === 0 && <p className="text-sm text-muted-foreground">لا طلبات بعد.</p>}
            {(clientOrders ?? []).map((o: any) => (
              <OrderRow key={o.id} order={o} role="client" onAct={act} />
            ))}
          </CardContent>
        </Card>

        {myProvider?.id && (
          <Card>
            <CardHeader><CardTitle className="text-base">طلبات مستلمة (كمزود)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(providerOrders ?? []).length === 0 && <p className="text-sm text-muted-foreground">لا طلبات بعد.</p>}
              {(providerOrders ?? []).map((o: any) => (
                <OrderRow key={o.id} order={o} role="provider" onAct={act} />
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function OrderRow({ order, role, onAct }: { order: any; role: "client" | "provider"; onAct: (id: string, patch: any, fn?: string) => void }) {
  const [showReview, setShowReview] = useState(false);
  const statusColor =
    order.status === "completed" ? "bg-green-verified/10 text-green-verified" :
    order.status === "cancelled" || order.status === "refunded" ? "bg-destructive/10 text-destructive" :
    order.status === "delivered" ? "bg-blue-500/10 text-blue-600" :
    "bg-muted text-muted-foreground";

  return (
    <div className="rounded-xl border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold truncate">{order.service_title}</div>
          {role === "client" && <div className="text-xs text-muted-foreground">المزود: {order.service_providers?.display_name}</div>}
          <div className="text-xs text-muted-foreground">
            {Number(order.amount).toLocaleString("ar")} {order.currency} · {order.delivery_days ?? "—"} يوم
          </div>
        </div>
        <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusColor}`}>{STATUS_LABEL[order.status] ?? order.status}</span>
      </div>
      {order.service_description && <p className="text-sm text-muted-foreground line-clamp-2">{order.service_description}</p>}

      <div className="flex flex-wrap gap-2 pt-2">
        {role === "provider" && order.status === "pending" && (
          <>
            <Button size="sm" onClick={() => onAct(order.id, { status: "accepted", accepted_at: new Date().toISOString() }, "escrow_hold_for_order")}>قبول وحجز Escrow</Button>
            <Button size="sm" variant="outline" onClick={() => onAct(order.id, { status: "cancelled", cancelled_at: new Date().toISOString() })}>رفض</Button>
          </>
        )}
        {role === "provider" && order.status === "accepted" && (
          <Button size="sm" onClick={() => onAct(order.id, { status: "in_progress" })}>بدء التنفيذ</Button>
        )}
        {role === "provider" && order.status === "in_progress" && (
          <Button size="sm" onClick={() => onAct(order.id, { status: "delivered", delivered_at: new Date().toISOString() })}>تم التسليم</Button>
        )}
        {role === "client" && order.status === "delivered" && (
          <>
            <Button size="sm" onClick={() => onAct(order.id, { status: "completed", completed_at: new Date().toISOString() }, "escrow_release_for_order")}>اعتماد وإطلاق الدفعة</Button>
            <Button size="sm" variant="outline" onClick={() => onAct(order.id, { status: "disputed" })}>فتح نزاع</Button>
          </>
        )}
        {role === "client" && order.status === "pending" && (
          <Button size="sm" variant="outline" onClick={() => onAct(order.id, { status: "cancelled", cancelled_at: new Date().toISOString() })}>إلغاء</Button>
        )}
        {role === "client" && order.status === "completed" && !showReview && (
          <Button size="sm" variant="outline" onClick={() => setShowReview(true)}><Star className="h-3.5 w-3.5 me-1" /> اكتب تقييماً</Button>
        )}
      </div>

      {showReview && <ReviewForm order={order} onDone={() => setShowReview(false)} />}
    </div>
  );
}

function ReviewForm({ order, onDone }: { order: any; onDone: () => void }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("service_reviews").insert({
        order_id: order.id, provider_id: order.provider_id,
        reviewer_id: u.user!.id, rating, title: title || null, body: body || null,
      });
      if (error) throw error;
      toast.success("شكراً على تقييمك");
      qc.invalidateQueries();
      onDone();
    } catch (e: any) {
      toast.error(e.message || "تعذّر إرسال التقييم");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => setRating(n)}>
            <Star className={`h-6 w-6 ${n <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
          </button>
        ))}
      </div>
      <Input placeholder="عنوان التقييم" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea rows={3} placeholder="تفاصيل تجربتك…" value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={busy}>{busy && <Loader2 className="h-3 w-3 animate-spin me-1" />}إرسال</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>إلغاء</Button>
      </div>
    </div>
  );
}
