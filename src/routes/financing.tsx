import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Zap, Calculator, ShieldCheck, TrendingUp, AlertTriangle, CheckCircle2, ArrowLeft, Percent, Layers, Rocket } from 'lucide-react'
import { toast } from 'sonner'
import { smListActive, smOpenFinancedPosition } from '@/lib/market.functions'
import { MarginStatusPanel } from '@/components/market/MarginStatusPanel'
import { FinancingRequestCard } from '@/components/financing/FinancingRequestCard'


export const Route = createFileRoute('/financing')({
  head: () => ({
    meta: [
      { title: 'التمويل بالرافعة 140% — IDEA BUSINESS' },
      { name: 'description', content: 'ضاعف قدرتك الشرائية داخل السوق الموازي عبر تمويل الهامش الذكي: ضمان 140%، صيانة 125%، تصفية آلية 115%. حاسبة تمويل تفاعلية.' },
      { property: 'og:title', content: 'التمويل بالرافعة 140% — IDEA BUSINESS' },
      { property: 'og:description', content: 'رافعة مالية مدروسة رياضياً لتضاعف قدرتك الشرائية بحماية آلية.' },
    ],
  }),
  component: FinancingPage,
})

const ANNUAL_RATE = 0.12
const COLLATERAL_REQ = 1.4
const MAINTENANCE = 1.25
const LIQUIDATION = 1.15

function FinancingPage() {
  const [collateral, setCollateral] = useState(10000)
  const [loan, setLoan] = useState(7000)

  const calc = useMemo(() => {
    const requiredCollateral = loan * COLLATERAL_REQ
    const maxLoan = collateral / COLLATERAL_REQ
    const buyingPower = collateral + loan
    const dailyInterest = (loan * ANNUAL_RATE) / 365
    const monthlyInterest = dailyInterest * 30
    const yearlyInterest = loan * ANNUAL_RATE
    const initialRatio = collateral > 0 ? (collateral + loan) / loan : 0
    const priceDropToMaintenance = 1 - (MAINTENANCE * loan) / (collateral + loan)
    const priceDropToLiquidation = 1 - (LIQUIDATION * loan) / (collateral + loan)
    const eligible = collateral >= requiredCollateral
    return {
      requiredCollateral, maxLoan, buyingPower, dailyInterest,
      monthlyInterest, yearlyInterest, initialRatio,
      priceDropToMaintenance, priceDropToLiquidation, eligible,
    }
  }, [collateral, loan])

  return (
    <div className="container mx-auto py-10 space-y-10" dir="rtl">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-l from-primary/15 via-primary/5 to-transparent p-8 md:p-12">
        <div className="absolute -top-20 -start-20 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <Badge className="bg-primary/20 text-primary border-primary/30 mb-4">تمويل ذكي • رياضياً وتقنياً</Badge>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            ضاعف قدرتك الشرائية حتى <span className="text-primary">140%</span><br />
            برافعة مالية محمية آلياً
          </h1>
          <p className="text-lg text-muted-foreground mt-4">
            اقترض من المنصة مقابل ضمان محفظتك، تداول أضعاف رأس مالك، واستفد من نظام حماية ذكي يراقب الهامش لحظياً ويتدخل قبل الخسارة.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/market" className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-primary-foreground font-medium hover:opacity-90">
              ابدأ الآن <ArrowLeft className="w-4 h-4" />
            </Link>
            <a href="#calculator" className="inline-flex items-center gap-2 rounded-xl border border-primary/40 px-6 py-3 font-medium hover:bg-primary/5">
              <Calculator className="w-4 h-4" /> جرّب الحاسبة
            </a>
          </div>
        </div>
      </section>

      {/* Key metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={TrendingUp} label="ضمان مطلوب" value="140%" desc="من قيمة القرض" />
        <MetricCard icon={ShieldCheck} label="حد الصيانة" value="125%" desc="تنبيه Margin Call" />
        <MetricCard icon={AlertTriangle} label="حد التصفية" value="115%" desc="تصفية آلية" />
        <MetricCard icon={Percent} label="فائدة سنوية" value="12%" desc="تُحسب يومياً" />
      </section>

      {/* Calculator */}
      <section id="calculator" className="scroll-mt-24">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5 text-primary" /> حاسبة التمويل التفاعلية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>الضمان (رصيدك) — ريال</Label>
                <Input type="number" value={collateral} onChange={(e) => setCollateral(Math.max(0, Number(e.target.value)))} className="mt-1 font-mono" />
                <input type="range" min={1000} max={500000} step={1000} value={collateral} onChange={(e) => setCollateral(Number(e.target.value))} className="w-full mt-2 accent-primary" />
              </div>
              <div>
                <Label>المبلغ المُقترض — ريال</Label>
                <Input type="number" value={loan} onChange={(e) => setLoan(Math.max(0, Number(e.target.value)))} className="mt-1 font-mono" />
                <input type="range" min={0} max={Math.floor(calc.maxLoan)} step={100} value={Math.min(loan, calc.maxLoan)} onChange={(e) => setLoan(Number(e.target.value))} className="w-full mt-2 accent-primary" />
                <p className="text-xs text-muted-foreground mt-1">الحد الأقصى للقرض بضمانك الحالي: <b>{calc.maxLoan.toFixed(0)}</b> ر.س</p>
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${calc.eligible ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
              <div className="flex items-center gap-2">
                {calc.eligible ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
                <span className="font-medium">
                  {calc.eligible ? 'مؤهل للتمويل ✓' : `الضمان المطلوب: ${calc.requiredCollateral.toFixed(0)} ر.س (نقص ${(calc.requiredCollateral - collateral).toFixed(0)})`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ResultCard label="قدرة الشراء" value={`${calc.buyingPower.toFixed(0)} ر.س`} highlight />
              <ResultCard label="النسبة الأولية" value={`${(calc.initialRatio * 100).toFixed(1)}%`} />
              <ResultCard label="فائدة يومية" value={`${calc.dailyInterest.toFixed(2)} ر.س`} />
              <ResultCard label="فائدة شهرية" value={`${calc.monthlyInterest.toFixed(2)} ر.س`} />
              <ResultCard label="فائدة سنوية" value={`${calc.yearlyInterest.toFixed(2)} ر.س`} />
              <ResultCard label="هامش الأمان" value={`${(calc.priceDropToLiquidation * 100).toFixed(1)}%`} desc="انخفاض السعر قبل التصفية" />
            </div>

            <div className="text-xs text-muted-foreground p-3 bg-muted/40 rounded-lg">
              <b>الصيغة الرياضية:</b> نسبة الهامش = (قيمة المحفظة الإجمالية) ÷ (رصيد القرض). عند النزول تحت {(MAINTENANCE * 100).toFixed(0)}% يُصدَر تنبيه، وعند {(LIQUIDATION * 100).toFixed(0)}% تبدأ التصفية الآلية بيعاً لأكبر مركز بسعر السوق.
            </div>

            {/* ربط الحاسبة بتنفيذ فوري */}
            <ConfirmFinancedOrder collateral={collateral} loan={loan} eligible={calc.eligible} buyingPower={calc.buyingPower} />
          </CardContent>
        </Card>
      </section>

      {/* حالة الهامش الحية للمستخدم */}
      <MarginStatusPanel />

      {/* تقديم طلب تمويل رسمي للإدارة */}
      <section id="apply">
        <h2 className="text-2xl font-bold mb-4">تقديم طلب تمويل رسمي</h2>
        <FinancingRequestCard />
      </section>


      {/* How it works */}
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Layers className="w-6 h-6 text-primary" /> كيف يعمل التمويل؟</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StepCard n={1} title="أودع الضمان" desc="حوّل رصيدك إلى محفظة السوق الموازي (Trading Cash). كل ريال تودعه يمنحك قدرة اقتراض تصل إلى ريال × 1/1.4." />
          <StepCard n={2} title="اطلب القرض" desc="اختر مبلغ القرض المناسب. النظام يفحص تلقائياً أنك تملك 140% كضمان قبل الموافقة الفورية." />
          <StepCard n={3} title="تداول بأضعاف" desc="استخدم رصيدك + القرض لشراء أسهم في السوق. أرباحك تُحسب على القيمة الكلية للمركز." />
          <StepCard n={4} title="راقب الهامش" desc="لوحة حية تعرض نسبة الهامش لحظياً. إشعارات فورية عند اقتراب حد الصيانة." />
          <StepCard n={5} title="حماية آلية" desc="عند 115% يبدأ محرك التصفية بيعاً لأكبر مركز بأمر Market Sell — يحمي رأس مالك من الانهيار." />
          <StepCard n={6} title="سدد وأغلق" desc="سدّد القرض في أي وقت. الفائدة اليومية 12%÷365 على الرصيد المستحق فقط." />
        </div>
      </section>

      {/* Risk disclosure */}
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 dark:text-amber-300">إفصاح المخاطر</h3>
              <p className="text-sm text-muted-foreground mt-2">
                الرافعة المالية تُضاعف الأرباح والخسائر معاً. قد تخسر أكثر من رأس مالك الأصلي في حال هبوط حاد وفشل التصفية بسعر مناسب.
                لا تتداول بمبالغ لا يمكنك خسارتها. النظام مصمم للحماية لكن لا يضمن استرداد كامل الضمان في ظروف السوق القاسية.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <section className="text-center py-8">
        <Link to="/market" className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-primary-foreground font-medium text-lg hover:opacity-90">
          <Zap className="w-5 h-5" /> ابدأ التداول بالرافعة الآن <ArrowLeft className="w-5 h-5" />
        </Link>
      </section>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, desc }: any) {
  return (
    <Card className="border-primary/20">
      <CardContent className="p-5">
        <Icon className="w-6 h-6 text-primary mb-2" />
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </CardContent>
    </Card>
  )
}

function ResultCard({ label, value, desc, highlight }: any) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold font-mono mt-1 ${highlight ? 'text-primary' : ''}`}>{value}</div>
      {desc && <div className="text-xs text-muted-foreground mt-1">{desc}</div>}
    </div>
  )
}

function StepCard({ n, title, desc }: any) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold mb-3">{n}</div>
        <h3 className="font-bold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  )
}

function ConfirmFinancedOrder({ collateral, loan, eligible, buyingPower }: { collateral: number; loan: number; eligible: boolean; buyingPower: number }) {
  const listings = useQuery({ queryKey: ['sm', 'listings'], queryFn: () => smListActive() })
  const openFinanced = useServerFn(smOpenFinancedPosition)
  const navigate = useNavigate()
  const [listingId, setListingId] = useState<string>('')
  const [price, setPrice] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const selected = (listings.data ?? []).find((l: any) => l.id === listingId)
  const effectivePrice = Number(price || selected?.reference_price || 0)
  const shares = effectivePrice > 0 ? Math.floor(buyingPower / effectivePrice) : 0

  async function confirm() {
    if (!listingId) { toast.error('اختر سهماً أولاً'); return }
    if (!eligible) { toast.error('الضمان لا يغطي 140% من القرض'); return }
    if (effectivePrice <= 0 || shares <= 0) { toast.error('السعر أو الكمية غير صالحة'); return }
    setBusy(true)
    try {
      const r = await openFinanced({ data: {
        listing_id: listingId,
        collateral_amount: collateral,
        loan_amount: loan,
        order_price: effectivePrice,
      }})
      toast.success(`تم فتح مركز ممول بـ ${r.quantity} سهم`)
      navigate({ to: '/market/$symbol', params: { symbol: selected!.symbol } })
    } catch (e: any) {
      toast.error(e.message ?? 'فشل فتح المركز')
    } finally { setBusy(false) }
  }

  return (
    <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
      <div className="flex items-center gap-2 font-semibold">
        <Rocket className="w-4 h-4 text-primary" />
        نفّذ الآن: افتح مركزاً ممولاً بنفس الأرقام أعلاه
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Label>اختر السهم</Label>
          <select
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={listingId}
            onChange={(e) => { setListingId(e.target.value); setPrice('') }}
          >
            <option value="">-- اختر سهماً نشطاً --</option>
            {(listings.data ?? []).map((l: any) => (
              <option key={l.id} value={l.id}>{l.symbol} — {l.name} ({Number(l.reference_price).toFixed(4)})</option>
            ))}
          </select>
        </div>
        <div>
          <Label>سعر الأمر (LIMIT)</Label>
          <Input
            type="number" step="0.0001"
            placeholder={selected ? String(selected.reference_price) : 'مرجعي'}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 font-mono"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <MiniStat label="قدرة الشراء" value={`${buyingPower.toFixed(0)} ر.س`} />
        <MiniStat label="السعر المستخدم" value={effectivePrice.toFixed(4)} />
        <MiniStat label="الأسهم المتوقعة" value={String(shares)} highlight />
        <MiniStat label="ضمان مطلوب" value={`${(loan * 1.4).toFixed(0)}`} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        عند الضغط على "تأكيد وشراء" ينفّذ الخادم في معاملة واحدة: (١) فتح قرض هامش {loan.toFixed(0)} ر.س، (٢) حجز ضمان {(loan * 1.4).toFixed(0)} ر.س، (٣) وضع أمر شراء LIMIT بحجم {shares} سهم بسعر {effectivePrice.toFixed(4)}. سيُقفَل السحب من محفظتك تلقائياً حتى سداد القرض.
      </p>
      <Button className="w-full" disabled={busy || !eligible || !listingId || shares <= 0} onClick={confirm}>
        {busy ? 'جارٍ التنفيذ...' : `تأكيد وفتح المركز الممول (${shares} سهم)`}
      </Button>
    </div>
  )
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-2 rounded-md border ${highlight ? 'border-primary/40 bg-primary/10' : 'border-border bg-background'}`}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-mono font-bold ${highlight ? 'text-primary' : ''}`}>{value}</div>
    </div>
  )
}
