import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, ShieldCheck, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/services/$id")({
  component: ProviderPage,
});

function ProviderPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [days, setDays] = useState<string>("7");
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["provider", id],
    queryFn: async () => {
      const [{ data: p }, { data: rev }] = await Promise.all([
        supabase.from("service_providers").select("*").eq("id", id).maybeSingle(),
        supabase.from("service_reviews").select("*").eq("provider_id", id).eq("is_public", true).order("created_at", { ascending: false }).limit(10),
      ]);
      return { provider: p, reviews: rev ?? [] };
    },
  });

  const submitOrder = async () => {
    if (!user) return toast.error("سجّل الدخول أولاً");
    const amt = Number(amount);
    if (!title || !amt || amt <= 0) return toast.error("أكمل الحقول");
    setSubmitting(true);
    try {
      const { error } = await supabase.from("service_orders").insert({
        client_id: user.id,
        provider_id: id,
        service_title: title,
        service_description: desc || null,
        amount: amt,
        amount_sar: amt,
        currency: data?.provider?.currency ?? "SAR",
        delivery_days: Number(days) || null,
        status: "pending",
      });
      if (error) throw error;
      toast.success("تم إرسال الطلب — سيقبله المزود وسيُحجز المبلغ من محفظتك (Escrow).");
      setTitle(""); setDesc(""); setAmount("");
      qc.invalidateQueries({ queryKey: ["provider", id] });
    } catch (e: any) {
      toast.error(e.message || "تعذّر إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;
  const p = data?.provider;
  if (!p) return <div className="p-8 text-center">لم يُعثر على المزود.</div>;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <PageHeader
          icon={<Briefcase className="h-6 w-6" />}
          title={p.display_name}
          subtitle={p.headline || p.category}
          actions={p.kyc_status === "approved" && <Badge className="gap-1"><ShieldCheck className="h-3 w-3" /> موثّق</Badge>}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader><CardTitle className="text-base">عن المزود</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="whitespace-pre-wrap">{p.bio || "—"}</p>
              <div className="flex flex-wrap gap-2 pt-2 text-xs">
                <Badge variant="outline">{p.category}</Badge>
                {p.country && <Badge variant="outline">{p.city ? `${p.city}, ${p.country}` : p.country}</Badge>}
                {p.hourly_rate && <Badge variant="outline">من {Number(p.hourly_rate).toLocaleString("ar")} {p.currency}/س</Badge>}
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  {Number(p.rating_avg ?? 0).toFixed(1)} ({p.rating_count})
                </Badge>
                <Badge variant="outline">أنجز {p.orders_completed ?? 0} طلب</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">اطلب خدمة</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>عنوان الخدمة</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><Label>وصف الاتفاق</Label><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>المبلغ ({p.currency})</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                <div><Label>مدة التسليم (أيام)</Label><Input type="number" value={days} onChange={(e) => setDays(e.target.value)} /></div>
              </div>
              <Button onClick={submitOrder} disabled={submitting} className="w-full font-bold gradient-primary text-primary-foreground">
                {submitting && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                إرسال الطلب (يُحجز عبر Escrow عند القبول)
              </Button>
              <p className="text-[11px] text-muted-foreground">لا يتم تحويل المبلغ للمزود إلا بعد تسليم الخدمة واعتمادك.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">آخر التقييمات</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.reviews.length === 0 && <p className="text-sm text-muted-foreground">لا تقييمات بعد.</p>}
            {data.reviews.map((r: any) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-1">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
                  ))}
                  {r.title && <span className="font-bold text-sm">{r.title}</span>}
                </div>
                {r.body && <p className="text-sm">{r.body}</p>}
                {r.provider_response && <p className="mt-2 rounded bg-muted/40 p-2 text-xs"><b>رد المزود:</b> {r.provider_response}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
