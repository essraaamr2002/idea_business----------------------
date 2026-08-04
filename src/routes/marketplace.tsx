import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Search, LayoutGrid, List as ListIcon, Map as MapIcon, ShoppingCart, TrendingUp, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageState } from "@/components/PageState";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "السوق المطوّر — Grid / List / Map | IDEA BUSINESS" },
      { name: "description", content: "تصفّح المشاريع بثلاث طرق: شبكة، قائمة، أو خريطة جغرافية." },
    ],
  }),
  component: MarketplacePage,
});

type ViewMode = "grid" | "list" | "map";

function MarketplacePage() {
  const [q, setQ] = useState("");
  const [sector, setSector] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<string>("recent");
  const { dir, lang } = useI18n();
  const isEn = lang === "en";

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["marketplace-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, ticker, sector, country, current_price, share_price, shares_total, shares_sold, status, cover_image_url, valuation, trust_score, equity_offered_pct, description")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    let rows = (data ?? []).filter((p: any) => {
      const matchQ = !q || p.name?.toLowerCase().includes(q.toLowerCase()) || p.ticker?.toLowerCase().includes(q.toLowerCase());
      const matchS = sector === "all" || p.sector === sector;
      const matchC = country === "all" || p.country === country;
      return matchQ && matchS && matchC;
    });
    if (sort === "trust") rows = rows.sort((a: any, b: any) => (b.trust_score ?? 0) - (a.trust_score ?? 0));
    if (sort === "valuation") rows = rows.sort((a: any, b: any) => (b.valuation ?? 0) - (a.valuation ?? 0));
    return rows;
  }, [data, q, sector, country, sort]);

  const sectors = Array.from(new Set((data ?? []).map((p: any) => p.sector).filter(Boolean)));
  const countries = Array.from(new Set((data ?? []).map((p: any) => p.country).filter(Boolean)));

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <PageHeader title="السوق المطوّر" subtitle="استكشف المشاريع بطرق متعددة" icon={<ShoppingCart className="h-6 w-6" />} />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم أو رمز..." className="pr-9" />
          </div>
          <Select value={sector} onValueChange={setSector}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="القطاع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل القطاعات</SelectItem>
              {sectors.map((s: any) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="الدولة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الدول</SelectItem>
              {countries.map((c: any) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">الأحدث</SelectItem>
              <SelectItem value="trust">الأكثر ثقة</SelectItem>
              <SelectItem value="valuation">أعلى تقييم</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border bg-background p-0.5">
            <Button size="sm" variant={view === "grid" ? "default" : "ghost"} onClick={() => setView("grid")}><LayoutGrid className="h-4 w-4" /></Button>
            <Button size="sm" variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")}><ListIcon className="h-4 w-4" /></Button>
            <Button size="sm" variant={view === "map" ? "default" : "ghost"} onClick={() => setView("map")}><MapIcon className="h-4 w-4" /></Button>
          </div>
        </div>

        {isLoading ? (
          <PageState kind="loading" />
        ) : isError ? (
          <PageState
            kind="error"
            description={(error as Error)?.message}
            onAction={() => refetch()}
          />
        ) : filtered.length === 0 ? (
          <PageState
            kind="empty"
            title={isEn ? "No matching projects" : "لا توجد مشاريع مطابقة"}
            description={isEn ? "Change the filters or clear them to see all available projects." : "غيّر الفلاتر أو امسحها لعرض كل المشاريع المتاحة."}
            actionLabel={isEn ? "Clear filters" : "مسح الفلاتر"}
            onAction={() => { setQ(""); setSector("all"); setCountry("all"); setSort("recent"); }}
          />
        ) : view === "grid" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p: any) => <GridCard key={p.id} project={p} />)}
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && view === "list" && (
          <div className="space-y-2">
            {filtered.map((p: any) => <ListRow key={p.id} project={p} />)}
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && view === "map" && <MapView projects={filtered} />}
      </main>
    </div>
  );
}

function GridCard({ project: p }: { project: any }) {
  return (
    <Link to="/projects/$id" params={{ id: p.id }}>
      <Card className="group h-full overflow-hidden transition hover:shadow-lg">
        {p.cover_image_url && (
          <div className="aspect-video overflow-hidden bg-muted">
            <img src={p.cover_image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
          </div>
        )}
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-bold line-clamp-1">{p.name}</h3>
            {p.trust_score > 0 && (
              <Badge variant="outline" className="gap-1 text-xs"><Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{p.trust_score}</Badge>
            )}
          </div>
          {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{p.sector ?? "—"} · {p.country ?? "—"}</span>
            {p.share_price && <span className="font-semibold text-primary">{Number(p.share_price).toLocaleString("ar")} {p.currency || "SAR"}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ListRow({ project: p }: { project: any }) {
  return (
    <Link to="/projects/$id" params={{ id: p.id }}>
      <Card className="transition hover:bg-muted/40">
        <CardContent className="flex items-center gap-3 p-3">
          {p.cover_image_url && <img src={p.cover_image_url} alt="" loading="lazy" className="h-16 w-16 rounded-lg object-cover" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold truncate">{p.name}</h3>
              {p.trust_score > 0 && <Badge variant="outline" className="gap-1 text-xs"><Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{p.trust_score}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{p.sector ?? "—"} · {p.country ?? "—"}</p>
          </div>
          <div className="text-end">
            {p.share_price && <p className="font-semibold text-primary text-sm">{Number(p.share_price).toLocaleString("ar")}</p>}
            {p.valuation && <p className="text-xs text-muted-foreground">تقييم: {Number(p.valuation).toLocaleString("ar")}</p>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MapView({ projects }: { projects: any[] }) {
  // Group by country
  const groups = projects.reduce((acc: Record<string, any[]>, p) => {
    const k = p.country ?? "—";
    (acc[k] ??= []).push(p);
    return acc;
  }, {});
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-muted p-8 text-center">
        <MapIcon className="mx-auto h-12 w-12 text-primary/60" />
        <p className="mt-2 text-sm text-muted-foreground">عرض حسب الدولة (للخريطة التفاعلية الكاملة فعّل Leaflet من لوحة التكاملات)</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(groups).map(([country, items]) => (
          <Card key={country}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold flex items-center gap-2"><MapIcon className="h-4 w-4" /> {country}</h3>
                <Badge>{items.length}</Badge>
              </div>
              <ul className="space-y-1 text-sm">
                {items.slice(0, 5).map((p: any) => (
                  <li key={p.id}>
                    <Link to="/projects/$id" params={{ id: p.id }} className="text-primary hover:underline">• {p.name}</Link>
                  </li>
                ))}
                {items.length > 5 && <li className="text-xs text-muted-foreground">+{items.length - 5} أخرى</li>}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
