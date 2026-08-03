import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ShieldCheck, TrendingDown, Activity } from 'lucide-react'
import { smGetMarginStatus, smGetPnlTimeline, smGetMarginEvents } from '@/lib/market.functions'
import { createClient } from '@supabase/supabase-js'

const MAINTENANCE = 1.25
const LIQUIDATION = 1.15

/** لوحة حالة الهامش الحية: نسبة الأمان، احتمال التصفية، والأحداث */
export function MarginStatusPanel({ compact = false }: { compact?: boolean }) {
  const status = useQuery({ queryKey: ['sm', 'margin-status'], queryFn: () => smGetMarginStatus(), refetchInterval: 30_000 })
  const pnl = useQuery({ queryKey: ['sm', 'pnl-timeline'], queryFn: () => smGetPnlTimeline(), refetchInterval: 60_000 })
  const events = useQuery({ queryKey: ['sm', 'margin-events'], queryFn: () => smGetMarginEvents(), refetchInterval: 60_000 })
  const [tick, setTick] = useState(0)

  // Realtime: أعِد الجلب عند تحديث لقطات الهامش
  useEffect(() => {
    const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
    const ch = sb.channel('margin-status-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sm_margin_snapshots' }, () => {
        setTick((t) => t + 1); status.refetch(); pnl.refetch()
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sm_liquidation_events' }, () => events.refetch())
      .subscribe()
    return () => { sb.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loans = status.data ?? []
  const summary = useMemo(() => {
    if (!loans.length) return null
    const totalLoan = loans.reduce((s: number, l: any) => s + Number(l.outstanding_balance || 0), 0)
    const totalValue = loans.reduce((s: number, l: any) => s + Number(l.latest_snapshot?.account_value || 0), 0)
    const ratio = totalLoan > 0 ? totalValue / totalLoan : 0
    const distToMaint = ratio - MAINTENANCE
    const distToLiq = ratio - LIQUIDATION
    const risk = ratio < LIQUIDATION ? 'critical' : ratio < MAINTENANCE ? 'warn' : 'safe'
    return { totalLoan, totalValue, ratio, distToMaint, distToLiq, risk }
  }, [loans, tick])

  if (!loans.length) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-5 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <div className="text-sm">لا يوجد قرض هامش نشط — محفظتك آمنة تماماً.</div>
        </CardContent>
      </Card>
    )
  }

  const badgeColor =
    summary!.risk === 'critical' ? 'bg-red-500/20 text-red-700 border-red-500/40'
    : summary!.risk === 'warn' ? 'bg-amber-500/20 text-amber-700 border-amber-500/40'
    : 'bg-emerald-500/20 text-emerald-700 border-emerald-500/40'
  const badgeText =
    summary!.risk === 'critical' ? 'خطر تصفية آلية' : summary!.risk === 'warn' ? 'قريب من الصيانة' : 'آمن'

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />حالة الهامش الحية</CardTitle>
          <Badge className={badgeColor}>{badgeText}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="نسبة الأمان" value={`${(summary!.ratio * 100).toFixed(1)}%`} highlight />
          <Stat label="قيمة المحفظة" value={`${summary!.totalValue.toFixed(0)} ر.س`} />
          <Stat label="القرض المستحق" value={`${summary!.totalLoan.toFixed(0)} ر.س`} />
          <Stat label="مسافة للتصفية" value={`${(summary!.distToLiq * 100).toFixed(1)}%`}
            danger={summary!.distToLiq < 0.05} />
        </div>

        {/* شريط تدرج للنسبة */}
        <MarginBar ratio={summary!.ratio} />

        {!compact && pnl.data && pnl.data.length > 1 && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">تطور القيمة (30 يوماً)</div>
            <MiniSpark values={pnl.data.map((p: any) => Number(p.account_value))} />
          </div>
        )}

        {events.data && events.data.length > 0 && (
          <div>
            <div className="text-xs font-semibold flex items-center gap-1 mb-2"><TrendingDown className="w-3.5 h-3.5" /> أحداث تصفية</div>
            <div className="space-y-1 text-xs">
              {events.data.slice(0, 5).map((e: any) => (
                <div key={e.id} className="flex justify-between border-b py-1">
                  <span>{new Date(e.created_at).toLocaleString('ar-SA')}</span>
                  <span className="font-mono text-red-600">{e.shares_sold} × نسبة {(Number(e.trigger_ratio || 0) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary!.risk !== 'safe' && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/40 bg-amber-500/5 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              {summary!.risk === 'critical'
                ? 'التصفية الآلية على وشك التشغيل. أضف ضماناً أو أغلق مركزاً فوراً.'
                : 'أنت تحت حد الصيانة 125%. يُنصح بتعزيز الضمان لتجنّب التصفية.'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, highlight, danger }: { label: string; value: string; highlight?: boolean; danger?: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${danger ? 'border-red-500/40 bg-red-500/5' : highlight ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-lg font-mono font-bold mt-1 ${danger ? 'text-red-600' : highlight ? 'text-primary' : ''}`}>{value}</div>
    </div>
  )
}

function MarginBar({ ratio }: { ratio: number }) {
  const pct = Math.max(0, Math.min(200, ratio * 100))
  const width = (pct / 200) * 100
  return (
    <div className="relative">
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full transition-all ${ratio < LIQUIDATION ? 'bg-red-500' : ratio < MAINTENANCE ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
        <span>0%</span>
        <span className="text-red-600">115%</span>
        <span className="text-amber-600">125%</span>
        <span>200%</span>
      </div>
    </div>
  )
}

function MiniSpark({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ')
  const up = values[values.length - 1] >= values[0]
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-16">
      <polyline fill="none" stroke={up ? '#10b981' : '#ef4444'} strokeWidth="2" points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
