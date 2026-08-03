import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Star, ShieldCheck, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/services")({
  head: () => ({ meta: [{ title: "مزودو الخدمات المهنية | IDEA BUSINESS" }] }),
  component: ServicesPage,
});

function ServicesPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["service-providers-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_providers")
        .select("id, display_name, headline, bio, category, country, city, hourly_rate, currency, avatar_url, rating_avg, rating_count, orders_completed, kyc_status")
        .eq("status", "active")
        .eq("kyc_status", "approved")
        .order("rating_avg", { ascending: false })
        .limit(120);
      if (error) throw error;
      return data ?? [];
    },
  });

  const cats = Array.from(new Set((data ?? []).map((p: any) => p.category).filter(Boolean)));
  const rows = useMemo(() => {
    return (data ?? []).filter((p: any) => {
      const okQ = !q || p.display_name?.toLowerCase().includes(q.toLowerCase()) || p.headline?.toLowerCase().includes(q.toLowerCase());
      const okC = cat === "all" || p.category === cat;
      return okQ && okC;
    });
  }, [data, q, cat]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <PageHeader
          icon={<Briefcase className="h-6 w-6" />}
          title="مزودو الخدمات المهنية"
          subtitle="محامون، مستشارون ماليون، مصممون، مسوّقون… جميعهم موثّقون (KYC) ومدفوعاتهم عبر Escrow آمن."
          actions={<Button asChild className="font-bold"><Link to="/services/register">افتح متجرك</Link></Button>}
        />

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن مزود…" className="pr-9" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="التصنيف" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل التصنيفات</SelectItem>
              {cats.map((c: any) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <p className="py-12 text-center text-muted-foreground">جارٍ التحميل…</p>}
        {!isLoading && rows.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            لا يوجد مزودون مطابقون بعد. <Link to="/services/register" className="text-primary underline">كن أول مزود</Link>
          </CardContent></Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p: any) => (
            <Link key={p.id} to="/services/$id" params={{ id: p.id }}>
              <Card className="group h-full transition hover:shadow-lg">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary font-black">
                        {p.display_name?.[0] ?? "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <h3 className="font-bold truncate">{p.display_name}</h3>
                        {p.kyc_status === "approved" && <ShieldCheck className="h-3.5 w-3.5 text-green-verified" />}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{p.headline || p.category}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5em]">{p.bio || "—"}</p>
                  <div className="flex items-center justify-between text-xs pt-2 border-t">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      <span className="font-bold">{Number(p.rating_avg ?? 0).toFixed(1)}</span>
                      <span className="text-muted-foreground">({p.rating_count})</span>
                    </span>
                    <Badge variant="outline">{p.category}</Badge>
                  </div>
                  {p.hourly_rate && (
                    <div className="text-xs font-bold text-primary">
                      من {Number(p.hourly_rate).toLocaleString("ar")} {p.currency}/ساعة
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
