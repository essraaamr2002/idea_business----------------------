import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Bell, GitCompare, Calendar, FileSignature, MessagesSquare, Flame, TrendingUp,
  Download, Moon, Eye, QrCode, Clock, Droplet, KeyRound, Activity,
} from "lucide-react";
import { qrUrl } from "@/lib/qr";
import { getSectorHeatmap, getTrendingProjects, getTodayPerformance } from "@/lib/launch-hub.functions";

export const Route = createFileRoute("/launch-hub")({
  head: () => ({
    meta: [
      { title: "مركز الانطلاق — IDEA BUSINESS" },
      { name: "description", content: "15 ميزة جديدة للمستثمرين وأصحاب المشاريع: تنبيهات، مقارنة، QR، أداء، سيولة، وأكثر." },
      { property: "og:title", content: "مركز الانطلاق — IDEA BUSINESS" },
      { property: "og:description", content: "15 ميزة فعّالة للانطلاق." },
    ],
  }),
  component: LaunchHub,
});

const FEATURES = [
  { n: 1, icon: Bell, title: "تنبيهات الأسعار", desc: "اضبط حدّاً علوياً أو سفلياً لأي سهم", to: "/alerts" },
  { n: 2, icon: GitCompare, title: "مقارنة مشاريع", desc: "قارن جنباً إلى جنب", to: "/compare" },
  { n: 3, icon: Calendar, title: "تقويم الاستحقاقات", desc: "صدّر مواعيدك بصيغة .ics", to: "/wallet/history" },
  { n: 4, icon: FileSignature, title: "سندات تملك PDF", desc: "وقّع ونزّل سند ملكيتك", to: "/trading-portfolio" },
  { n: 5, icon: MessagesSquare, title: "غرفة نقاش المشروع", desc: "تواصل مع المستثمرين", to: "/messages" },
  { n: 6, icon: Flame, title: "خريطة حرارة القطاعات", desc: "أكثر القطاعات نشاطاً", anchor: "heatmap" },
  { n: 7, icon: TrendingUp, title: "مشاريع رائجة", desc: "الأكثر تمويلاً هذا الأسبوع", anchor: "trending" },
  { n: 8, icon: Download, title: "تصدير المحفظة CSV", desc: "نزّل ملف Excel مفصّل", to: "/wallet/history" },
  { n: 9, icon: Moon, title: "وضع ليلي للأرقام", desc: "تباين أعلى للقراءة الليلية", action: "dark" },
  { n: 10, icon: Eye, title: "إشعارات مشاهدة السند", desc: "اعرف من شاهد ملكياتك", to: "/notifications" },
  { n: 11, icon: QrCode, title: "رمز QR للمشروع", desc: "شاركه بسهولة", anchor: "qr" },
  { n: 12, icon: Clock, title: "اقتراب نضوج السحب", desc: "ما تبقى لـ14 يوماً", to: "/wallet" },
  { n: 13, icon: Droplet, title: "مؤشر السيولة", desc: "مدى سرعة بيع السهم", anchor: "trending" },
  { n: 14, icon: KeyRound, title: "مفتاح استرداد المحفظة", desc: "ولّد مفتاح أمان شخصي", action: "recovery" },
  { n: 15, icon: Activity, title: "أداء اليوم", desc: "ملخّص نشاط آخر 24 ساعة", anchor: "today" },
];

function LaunchHub() {
  const heatmap = useQuery({ queryKey: ["heatmap"], queryFn: () => getSectorHeatmap() });
  const trending = useQuery({ queryKey: ["trending"], queryFn: () => getTrendingProjects() });
  const today = useQuery({ queryKey: ["today-perf"], queryFn: () => getTodayPerformance() });
  const [qrText, setQrText] = useState("https://www.busniss.org");

  function handleAction(a?: string) {
    if (a === "dark") {
      document.documentElement.classList.toggle("dark");
      toast.success("بُدّل الوضع الليلي");
    } else if (a === "recovery") {
      const key = "RK-" + crypto.randomUUID().replace(/-/g, "").slice(0, 24).toUpperCase();
      navigator.clipboard.writeText(key).catch(() => {});
      toast.success("نُسخ مفتاح الاسترداد", { description: key });
    }
  }

  const maxCount = Math.max(1, ...(heatmap.data ?? []).map((s) => s.count));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-black">مركز الانطلاق</h1>
        <p className="text-sm text-muted-foreground">15 ميزة جاهزة للاستخدام لتنطلق بمشروعك واستثماراتك.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          const inner = (
            <div className="group flex h-full items-start gap-3 rounded-xl border border-border bg-card/60 p-4 transition hover:border-primary hover:bg-primary/5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{f.n}</Badge>
                  <h3 className="font-bold">{f.title}</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          );
          if (f.to) return <Link key={f.n} to={f.to as any}>{inner}</Link>;
          if (f.anchor) return <a key={f.n} href={`#${f.anchor}`}>{inner}</a>;
          return <button key={f.n} onClick={() => handleAction(f.action)} className="text-right">{inner}</button>;
        })}
      </div>

      <section id="today" className="space-y-3">
        <h2 className="text-xl font-black">أداء اليوم</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">مشاريع جديدة (24س)</CardTitle></CardHeader><CardContent><div className="text-3xl font-black">{today.data?.newProjects ?? "—"}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">صفقات (24س)</CardTitle></CardHeader><CardContent><div className="text-3xl font-black">{today.data?.trades24h ?? "—"}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">آخر تحديث</CardTitle></CardHeader><CardContent><div className="text-xs">{today.data?.at ? new Date(today.data.at).toLocaleString("ar") : "—"}</div></CardContent></Card>
        </div>
      </section>

      <section id="trending" className="space-y-3">
        <h2 className="text-xl font-black">مشاريع رائجة + مؤشر السيولة</h2>
        <div className="grid gap-2">
          {(trending.data ?? []).map((p: any) => {
            const liq = p.shares_total > 0 ? Math.round((p.shares_sold / p.shares_total) * 100) : 0;
            return (
              <Link key={p.id} to={"/projects/$id" as any} params={{ id: p.id } as any}
                className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary">
                <div>
                  <div className="font-bold">{p.name} {liq > 70 && <Badge className="ml-1">رائج</Badge>}</div>
                  <div className="text-xs text-muted-foreground">{p.sector}</div>
                </div>
                <div className="text-left">
                  <div className="text-xs text-muted-foreground">سيولة</div>
                  <div className="font-mono text-lg">{liq}%</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="heatmap" className="space-y-3">
        <h2 className="text-xl font-black">خريطة حرارة القطاعات</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(heatmap.data ?? []).map((s) => {
            const pct = (s.count / maxCount) * 100;
            return (
              <div key={s.sector} className="rounded-lg border p-3">
                <div className="flex justify-between text-sm font-bold"><span>{s.sector}</span><span>{s.count}</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded bg-muted">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-red-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="qr" className="space-y-3">
        <h2 className="text-xl font-black">رمز QR لأي مشروع/رابط</h2>
        <div className="flex flex-wrap items-start gap-4">
          <input value={qrText} onChange={(e) => setQrText(e.target.value)}
            className="flex-1 min-w-64 rounded-md border px-3 py-2 text-sm" dir="ltr" />
          <img src={qrUrl(qrText, 180)} alt="QR" className="rounded border bg-white p-2" width={180} height={180} />
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(qrUrl(qrText, 600)); toast.success("نُسخ رابط الصورة"); }}>نسخ رابط QR</Button>
        </div>
      </section>
    </div>
  );
}
