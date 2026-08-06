import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { smListActive } from "@/lib/market.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Layers, Zap, Calculator, ShieldCheck, ArrowLeft } from "lucide-react";
import { MarginStatusPanel } from "@/components/market/MarginStatusPanel";
import { PageState } from "@/components/PageState";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "السوق الموازي — IDEA BUSINESS" },
      {
        name: "description",
        content: "تداول أسهم المشاريع والأفكار برافعة 140% وحدود تذبذب يومية.",
      },
    ],
  }),
  component: MarketPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">غير موجود</div>,
});

function MarketPage() {
  const { dir, lang } = useI18n();
  const isEn = lang === "en";
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({ queryKey: ["sm", "listings"], queryFn: () => smListActive() });
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground" dir={dir}>
      <div className="container mx-auto space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Layers className="w-8 h-8 text-primary" />
              السوق الموازي
            </h1>
            <p className="text-muted-foreground mt-1">
              تداول أسهم المشاريع والأفكار — رافعة مالية حتى 140%
            </p>
          </div>
          <Link
            to="/market/new"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <TrendingUp className="w-4 h-4" /> طرح مشروع/فكرة
          </Link>
        </div>

        {/* بانر التمويل بالرافعة — بارز */}
        <Link to="/financing" className="block group">
          <div className="relative overflow-hidden rounded-2xl border border-cyan-200 bg-gradient-to-l from-cyan-50 via-white to-sky-50 p-6 text-slate-950 shadow-[0_16px_45px_-28px_rgba(8,145,178,0.45)] transition hover:border-cyan-400 hover:shadow-[0_20px_55px_-28px_rgba(8,145,178,0.6)] md:p-8 dark:border-primary/30 dark:from-primary/10 dark:via-card dark:to-background dark:text-foreground">
            <div className="absolute -top-10 -start-10 h-40 w-40 rounded-full bg-cyan-300/25 blur-3xl dark:bg-primary/20" />
            <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-cyan-200 bg-cyan-100 p-3 dark:border-primary/30 dark:bg-primary/15">
                  <Zap className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-primary/30 dark:bg-primary/20 dark:text-primary">
                      جديد • تمويل ذكي
                    </Badge>
                    <span className="text-xs font-medium text-slate-600 dark:text-muted-foreground">
                      رياضياً وتقنياً
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mt-2">
                    ضاعف قدرتك الشرائية حتى <span className="text-primary">140%</span> برافعة الهامش
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-700 dark:text-muted-foreground">
                    اقترض من المنصة مقابل ضمان محفظتك، مع تصفية آلية ذكية عند انخفاض النسبة تحت 115%
                    لحماية رأس مالك.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-700 dark:text-foreground">
                    <span className="flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5 text-primary" /> فائدة 12% سنوياً تُحسب
                      يومياً
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" /> مراقبة لحظية للهامش
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" /> ضمان 140% • صيانة 125%
                    </span>
                  </div>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-primary-foreground font-medium group-hover:opacity-90 shrink-0">
                اطلب تمويلك الآن <ArrowLeft className="w-4 h-4" />
              </div>
            </div>
          </div>
        </Link>

        {/* لوحة حالة الهامش (تظهر فقط للمستخدمين الممولين) */}
        <MarginStatusPanel />

        {isLoading ? (
          <PageState kind="loading" />
        ) : isError ? (
          <PageState
            kind="error"
            description={(error as Error)?.message}
            onAction={() => refetch()}
          />
        ) : data.length === 0 ? (
          <PageState
            kind="empty"
            title={isEn ? "No active listings yet" : "لا توجد إدراجات نشطة بعد"}
            description={
              isEn
                ? "The first approved tradable projects will appear here."
                : "ستظهر المشاريع المعتمدة القابلة للتداول هنا."
            }
            actionLabel={isEn ? "List a project" : "طرح مشروع"}
            onAction={() => {
              window.location.href = "/projects/new";
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((l) => (
              <Link key={l.id} to="/market/$symbol" params={{ symbol: l.symbol }} className="block">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{l.name}</CardTitle>
                      <Badge variant={l.stage === "project" ? "default" : "secondary"}>
                        {l.stage === "project" ? "مشروع" : "فكرة"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{l.symbol}</div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">السعر المرجعي</span>
                      <span className="font-mono font-bold">
                        {Number(l.reference_price).toFixed(4)} ر.س
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">إجمالي الأسهم</span>
                      <span className="font-mono">{Number(l.total_shares).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">التقييم الأقصى</span>
                      <span className="font-mono">
                        {Number(l.max_valuation).toLocaleString()} ر.س
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">حد التذبذب</span>
                      <span className="font-mono">
                        ±{(Number(l.daily_limit_pct) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
