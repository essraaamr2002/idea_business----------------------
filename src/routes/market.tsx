import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { smListActive } from '@/lib/market.functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Layers, Zap, Calculator, ShieldCheck, ArrowLeft } from 'lucide-react'
import { MarginStatusPanel } from '@/components/market/MarginStatusPanel'



export const Route = createFileRoute('/market')({
  head: () => ({
    meta: [
      { title: 'السوق الموازي — IDEA BUSINESS' },
      { name: 'description', content: 'تداول أسهم المشاريع والأفكار برافعة 140% وحدود تذبذب يومية.' },
    ],
  }),
  component: MarketPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">غير موجود</div>,
})

function MarketPage() {
  const { data = [] } = useQuery({ queryKey: ['sm', 'listings'], queryFn: () => smListActive() })
  return (
    <div className="container mx-auto py-8 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Layers className="w-8 h-8 text-primary" />السوق الموازي</h1>
          <p className="text-muted-foreground mt-1">تداول أسهم المشاريع والأفكار — رافعة مالية حتى 140%</p>
        </div>
        <Link to="/market/new" className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 hover:opacity-90">
          <TrendingUp className="w-4 h-4" /> طرح مشروع/فكرة
        </Link>
      </div>

      {/* بانر التمويل بالرافعة — بارز */}
      <Link to="/financing" className="block group">
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-6 md:p-8 hover:border-primary/60 transition">
          <div className="absolute -top-10 -start-10 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/15 p-3 border border-primary/30">
                <Zap className="w-7 h-7 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30">جديد • تمويل ذكي</Badge>
                  <span className="text-xs text-muted-foreground">رياضياً وتقنياً</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold mt-2">ضاعف قدرتك الشرائية حتى <span className="text-primary">140%</span> برافعة الهامش</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">اقترض من المنصة مقابل ضمان محفظتك، مع تصفية آلية ذكية عند انخفاض النسبة تحت 115% لحماية رأس مالك.</p>
                <div className="flex flex-wrap gap-4 mt-3 text-xs">
                  <span className="flex items-center gap-1"><Calculator className="w-3.5 h-3.5 text-primary" /> فائدة 12% سنوياً تُحسب يومياً</span>
                  <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> مراقبة لحظية للهامش</span>
                  <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-primary" /> ضمان 140% • صيانة 125%</span>
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

      {data.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد إدراجات نشطة بعد. كن أول من يطرح مشروعاً!</CardContent></Card>
      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((l) => (
            <Link key={l.id} to="/market/$symbol" params={{ symbol: l.symbol }} className="block">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{l.name}</CardTitle>
                    <Badge variant={l.stage === 'project' ? 'default' : 'secondary'}>
                      {l.stage === 'project' ? 'مشروع' : 'فكرة'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{l.symbol}</div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">السعر المرجعي</span>
                    <span className="font-mono font-bold">{Number(l.reference_price).toFixed(4)} ر.س</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">إجمالي الأسهم</span>
                    <span className="font-mono">{Number(l.total_shares).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">التقييم الأقصى</span>
                    <span className="font-mono">{Number(l.max_valuation).toLocaleString()} ر.س</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">حد التذبذب</span>
                    <span className="font-mono">±{(Number(l.daily_limit_pct) * 100).toFixed(0)}%</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
