import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Search, Sparkles, BookOpen, KeyRound, Tags, Archive, ArrowLeft,
  TrendingUp, TrendingDown, FileText, Gauge, Globe2, Link2, Handshake,
  ShieldOff, Network, Activity, ClipboardCheck, FileEdit, Compass, Calendar,
  Copy, Layers, Target, Telescope, Brain, Grid3X3, AlertTriangle, FileCode,
  FileCog, Link as LinkIcon, GitBranch, Languages, Zap, Braces, AlertOctagon,
  MapPin, Type, Swords, GitCompare, Star, BarChart3, Globe, FileDown,
  BellRing, Eye,
} from "lucide-react";

export const Route = createFileRoute("/admin/seo")({
  component: SeoDashboard,
});

// ---------- Static demo data (wire to live sources later) ----------
const KPIS = [
  { label: "جلسات (7 أيام)", value: "12,480", delta: "+8.4%", up: true },
  { label: "مستخدمون", value: "9,210", delta: "+5.1%", up: true },
  { label: "معدل الارتداد", value: "42.6%", delta: "-2.3%", up: true },
  { label: "صفحات / جلسة", value: "3.21", delta: "+0.18", up: true },
];

const RANKING_MOVES = [
  { kw: "منصة استثمار أفكار", pos: 3, prev: 7, vol: 1900, diff: 54 },
  { kw: "تمويل مشروع ناشئ", pos: 5, prev: 4, vol: 2400, diff: 61 },
  { kw: "بيع IDEA BUSINESS", pos: 8, prev: 14, vol: 880, diff: 38 },
  { kw: "ضمان بنكي للمستثمر", pos: 11, prev: 9, vol: 320, diff: 44 },
];

const TOP_PAGES = [
  { url: "/projects", clicks: 1820, impr: 24300, ctr: 7.5, pos: 4.1 },
  { url: "/blog/how-to-pitch", clicks: 940, impr: 14100, ctr: 6.7, pos: 5.8 },
  { url: "/", clicks: 770, impr: 19800, ctr: 3.9, pos: 6.2 },
  { url: "/marketplace", clicks: 510, impr: 9800, ctr: 5.2, pos: 7.1 },
];

const VITALS = [
  { page: "/", lcp: "1.9s", inp: "120ms", cls: "0.04", status: "pass" },
  { page: "/projects", lcp: "2.3s", inp: "180ms", cls: "0.08", status: "pass" },
  { page: "/blog/post-12", lcp: "3.8s", inp: "290ms", cls: "0.18", status: "fail" },
];

const ALERTS = [
  { type: "ranking", text: "تراجع 6 مراكز للكلمة \"تمويل فكرة\" — قبل 3 ساعات", level: "warn" },
  { type: "404", text: "اكتشاف 12 رابط 404 جديد على /blog/* — قبل ساعة", level: "danger" },
  { type: "cwv", text: "صفحة /pricing فشلت في CLS — قبل 8 ساعات", level: "warn" },
  { type: "wins", text: "كلمة \"منصة استثمار\" انتقلت إلى المركز 3 (+4) — اليوم", level: "ok" },
];

// ---------- Sections (sidebar quick-jump tiles) ----------
const SECTIONS: { label: string; tiles: { to: string; title: string; icon: any; desc: string }[] }[] = [
  {
    label: "📊 الأداء والقياس",
    tiles: [
      { to: "/admin/seo/performance", title: "أداء SEO", icon: BarChart3, desc: "جلسات، مستخدمون، CTR، الاتجاهات." },
      { to: "/admin/seo/rankings", title: "ترتيب الكلمات", icon: TrendingUp, desc: "الموضع الحالي/السابق والتغير." },
      { to: "/admin/seo/top-pages", title: "أفضل الصفحات", icon: FileText, desc: "النقرات، الظهور، CTR، الموضع." },
      { to: "/admin/seo/vitals", title: "Core Web Vitals", icon: Gauge, desc: "LCP / INP / CLS لكل صفحة." },
      { to: "/admin/seo/indexing", title: "حالة الفهرسة", icon: Globe2, desc: "المفهرس مقابل الإجمالي." },
    ],
  },
  {
    label: "🔑 إدارة الكلمات المفتاحية",
    tiles: [
      { to: "/admin/seo/keywords", title: "قائمة الكلمات الرئيسية", icon: KeyRound, desc: "إضافة/تعديل/حذف الكلمات المستهدفة." },
      { to: "/admin/seo/clusters", title: "عناقيد الكلمات", icon: Layers, desc: "تجميع حسب الموضوع والنية." },
      { to: "/admin/seo/mapping", title: "ربط الكلمات بالصفحات", icon: Target, desc: "كلمة → صفحة هدف." },
      { to: "/admin/seo/gap-analysis", title: "فجوة المنافسين", icon: Telescope, desc: "كلمات لا نرتب عليها." },
      { to: "/admin/seo/long-tail", title: "Long-tail (AI)", icon: Sparkles, desc: "اقتراحات ذكية طويلة الذيل." },
      { to: "/admin/seo/intent", title: "نية البحث", icon: Brain, desc: "وعي / اعتبار / قرار." },
      { to: "/admin/seo/priority-matrix", title: "مصفوفة الأولوية", icon: Grid3X3, desc: "جهد × أثر." },
      { to: "/admin/seo/cannibalization", title: "كاشف Cannibalization", icon: AlertTriangle, desc: "صفحتان لنفس الكلمة." },
    ],
  },
  {
    label: "📝 إدارة محتوى SEO",
    tiles: [
      { to: "/admin/seo/content-audit", title: "تدقيق المحتوى", icon: ClipboardCheck, desc: "SEO score لكل صفحة." },
      { to: "/admin/seo/on-page", title: "محرّر On-Page", icon: FileEdit, desc: "Title/Description/H1-H3/alts." },
      { to: "/admin/seo/articles", title: "المقالات والمدوّنة", icon: BookOpen, desc: "إنشاء/نشر/أرشفة." },
      { to: "/admin/seo/generator", title: "مولّد المحتوى AI", icon: Sparkles, desc: "مقالات جاهزة بالـ AI." },
      { to: "/admin/seo/briefs", title: "مولّد البريف", icon: Sparkles, desc: "بريف منظّم لكل كلمة." },
      { to: "/admin/seo/content-gap", title: "فجوات المحتوى", icon: Compass, desc: "مواضيع المنافسين." },
      { to: "/admin/seo/content-calendar", title: "تقويم المحتوى", icon: Calendar, desc: "تخطيط ومتابعة الكتابة." },
      { to: "/admin/seo/duplicate", title: "كاشف التكرار", icon: Copy, desc: "صفحات متشابهة >70%." },
    ],
  },
  {
    label: "🏗️ SEO تقني",
    tiles: [
      { to: "/admin/seo/sitemap", title: "Sitemap", icon: FileCode, desc: "إدارة وإرسال السايتماب." },
      { to: "/admin/seo/robots", title: "robots.txt", icon: FileCog, desc: "محرّر مع تحقق وتاريخ." },
      { to: "/admin/seo/canonical", title: "Canonical", icon: LinkIcon, desc: "ضبط canonical لكل صفحة." },
      { to: "/admin/seo/redirects", title: "التحويلات 301/302", icon: GitBranch, desc: "إدارة، استيراد، كشف الحلقات." },
      { to: "/admin/seo/hreflang", title: "Hreflang", icon: Languages, desc: "ar/en — SA/AE/KW." },
      { to: "/admin/seo/speed", title: "سرعة الصفحات", icon: Zap, desc: "جوال/سطح مكتب وتوصيات." },
      { to: "/admin/seo/schema", title: "بيانات Schema.org", icon: Braces, desc: "JSON-LD ومعاينة." },
      { to: "/admin/seo/crawl-errors", title: "أخطاء الزحف", icon: AlertOctagon, desc: "404 و 5xx و soft 404." },
      { to: "/admin/seo/meta", title: "Meta لكل صفحة", icon: Tags, desc: "title/description/og/canonical." },
      { to: "/admin/seo/archive", title: "الأرشفة الدورية", icon: Archive, desc: "تحديث السايتماب اليومي." },
    ],
  },
  {
    label: "🔗 الروابط والسلطة",
    tiles: [
      { to: "/admin/seo/backlinks", title: "ملف الباك لينك", icon: Link2, desc: "DA والنص الإرساء والحالة." },
      { to: "/admin/seo/link-building", title: "بناء الروابط", icon: Handshake, desc: "متابعة الـ Outreach." },
      { to: "/admin/seo/disavow", title: "ملف Disavow", icon: ShieldOff, desc: "إدارة المصادر السامة." },
      { to: "/admin/seo/internal-links", title: "الروابط الداخلية", icon: Network, desc: "خريطة + الصفحات اليتيمة." },
      { to: "/admin/seo/link-velocity", title: "سرعة الاكتساب", icon: Activity, desc: "روابط/أسبوع — اكتشاف الشذوذ." },
    ],
  },
  {
    label: "🌐 محلي وإقليمي (GCC)",
    tiles: [
      { to: "/admin/seo/local", title: "SEO محلي", icon: MapPin, desc: "كلمات لكل مدينة، GBP، NAP." },
      { to: "/admin/seo/arabic", title: "خصوصيات السيو العربي", icon: Type, desc: "متغيرات، RTL، SERP عربي." },
    ],
  },
  {
    label: "📈 استخبارات المنافسين",
    tiles: [
      { to: "/admin/seo/competitors", title: "مراقبة المنافسين", icon: Swords, desc: "حتى 10 منافسين بمقارنة كاملة." },
      { to: "/admin/seo/serp-overlap", title: "تداخل SERP", icon: GitCompare, desc: "كلمات مشتركة وموقعنا." },
      { to: "/admin/seo/serp-snippets", title: "فرص Featured Snippets", icon: Star, desc: "كلمات يحتل بها المنافس مقتطف." },
    ],
  },
  {
    label: "📣 تكامل مع Search Console / Analytics",
    tiles: [
      { to: "/admin/seo/search-console", title: "Search Console", icon: Search, desc: "أداء، تغطية، فحص URL." },
      { to: "/admin/seo/analytics", title: "Analytics 4", icon: BarChart3, desc: "قناة Organic ومسارات الزائر." },
      { to: "/admin/seo/bing", title: "Bing Webmaster", icon: Globe, desc: "نفس البيانات لـ Bing." },
    ],
  },
  {
    label: "🤖 الذكاء الاصطناعي والإنتاجية",
    tiles: [
      { to: "/admin/seo/ai-assistant", title: "مساعد SEO الذكي", icon: Sparkles, desc: "Meta، روابط داخلية، تقارير." },
      { to: "/admin/seo/serp-preview", title: "معاينة SERP", icon: Eye, desc: "محاكاة Google عربي/إنجليزي." },
    ],
  },
  {
    label: "📋 التقارير والتنبيهات",
    tiles: [
      { to: "/admin/seo/reports", title: "التقارير والتصدير", icon: FileDown, desc: "أسبوعي/شهري PDF + CSV." },
      { to: "/admin/seo/alerts", title: "تنبيهات SEO", icon: BellRing, desc: "ترتيب، Traffic، CWV، Crawl." },
    ],
  },
];

function levelClass(level: string) {
  switch (level) {
    case "ok": return "border-emerald-500/30 bg-emerald-500/5";
    case "warn": return "border-amber-500/30 bg-amber-500/5";
    case "danger": return "border-rose-500/30 bg-rose-500/5";
    default: return "";
  }
}

function SeoDashboard() {
  // Keyboard shortcut: press "s" to focus quick search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      if (e.key.toLowerCase() === "s") {
        const el = document.getElementById("seo-quick-search") as HTMLInputElement | null;
        if (el) { e.preventDefault(); el.focus(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">لوحة موظف SEO</h1>
              <p className="text-sm text-muted-foreground">كل ما يحتاجه أخصائي SEO لإدارة الظهور والمحتوى — اضغط <kbd className="px-1.5 py-0.5 rounded border bg-muted text-xs">S</kbd> للبحث السريع.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/admin/seo/articles" className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90">
            <BookOpen className="h-4 w-4" /> كتابة مدوّنة جديدة
          </Link>
          <input
            id="seo-quick-search"
            placeholder="بحث عن صفحة/كلمة/تقرير…"
            className="h-9 w-72 rounded-md border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <Link to="/admin" className="text-sm text-primary hover:underline flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> للوحة الإدارة</Link>
        </div>
      </div>


      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPIS.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className="mt-1 text-2xl font-bold">{k.value}</div>
              <div className={`mt-1 text-xs flex items-center gap-1 ${k.up ? "text-emerald-500" : "text-rose-500"}`}>
                {k.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {k.delta}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ranking movement (most-prominent widget per spec) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-5 w-5" /> حركة ترتيب الكلمات هذا الأسبوع</CardTitle>
          <Link to="/admin/seo/rankings" className="text-xs text-primary hover:underline">عرض الكل</Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-right">
                  <th className="py-2">الكلمة</th>
                  <th>الموضع الحالي</th>
                  <th>السابق</th>
                  <th>التغير</th>
                  <th>الحجم الشهري</th>
                  <th>الصعوبة</th>
                </tr>
              </thead>
              <tbody>
                {RANKING_MOVES.map((r) => {
                  const change = r.prev - r.pos;
                  const cls = change > 0 ? "text-emerald-500" : change < 0 ? "text-rose-500" : "text-muted-foreground";
                  return (
                    <tr key={r.kw} className="border-t">
                      <td className="py-2 font-medium">{r.kw}</td>
                      <td>#{r.pos}</td>
                      <td className="text-muted-foreground">#{r.prev}</td>
                      <td className={cls}>{change > 0 ? `+${change}` : change}</td>
                      <td>{r.vol.toLocaleString()}</td>
                      <td><Badge variant="outline">{r.diff}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top pages + Vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-5 w-5" /> أفضل الصفحات</CardTitle>
            <Link to="/admin/seo/top-pages" className="text-xs text-primary hover:underline">التفاصيل</Link>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-right">
                  <th className="py-2">الصفحة</th>
                  <th>النقرات</th>
                  <th>الظهور</th>
                  <th>CTR</th>
                  <th>الموضع</th>
                </tr>
              </thead>
              <tbody>
                {TOP_PAGES.map((p) => (
                  <tr key={p.url} className="border-t">
                    <td className="py-2 font-mono text-xs">{p.url}</td>
                    <td>{p.clicks}</td>
                    <td>{p.impr.toLocaleString()}</td>
                    <td>{p.ctr}%</td>
                    <td>{p.pos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Gauge className="h-5 w-5" /> Core Web Vitals</CardTitle>
            <Link to="/admin/seo/vitals" className="text-xs text-primary hover:underline">التفاصيل</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {VITALS.map((v) => (
              <div key={v.page} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs">{v.page}</span>
                  <Badge variant={v.status === "pass" ? "secondary" : "destructive"}>
                    {v.status === "pass" ? "ناجح" : "فشل"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>LCP: <span className="text-foreground">{v.lcp}</span></div>
                  <div>INP: <span className="text-foreground">{v.inp}</span></div>
                  <div>CLS: <span className="text-foreground">{v.cls}</span></div>
                </div>
                <Progress value={v.status === "pass" ? 82 : 38} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><BellRing className="h-5 w-5" /> التنبيهات الأخيرة</CardTitle>
          <Link to="/admin/seo/alerts" className="text-xs text-primary hover:underline">كل التنبيهات</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {ALERTS.map((a, i) => (
            <div key={i} className={`rounded-md border px-3 py-2 text-sm ${levelClass(a.level)}`}>{a.text}</div>
          ))}
        </CardContent>
      </Card>

      {/* Quick access — full module map */}
      {SECTIONS.map((sec) => (
        <div key={sec.label} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{sec.label}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sec.tiles.map((t) => (
              <Link key={t.to} to={t.to}>
                <Card className="h-full hover:border-primary transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 font-medium">
                      <t.icon className="h-4 w-4 text-primary" /> {t.title}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
