import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import {
  smAdminOverview,
  smAdminPendingListings,
  smAdminApproveListing,
  smAdminRejectListing,
  smAdminHaltListing,
  smAdminResumeListing,
  smAdminComplianceFlags,
  smAdminResolveFlag,
  smAdminMarginAtRisk,
  smAdminRecentTrades,
} from '@/lib/admin-market.functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertTriangle, CheckCircle2, XCircle, ShieldOff, TrendingUp, Layers, Users2, Coins, Activity, Play } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/admin/market')({
  component: AdminMarket,
})

function fmt(n: number | string | null | undefined, digits = 2) {
  const v = Number(n ?? 0)
  return v.toLocaleString('ar-SA', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function AdminMarket() {
  const overviewFn = useServerFn(smAdminOverview)
  const overview = useQuery({ queryKey: ['adm-mkt', 'overview'], queryFn: () => overviewFn(), refetchInterval: 30000 })

  const s = overview.data
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Layers className="w-7 h-7 text-primary" /> مركز إدارة السوق الموازي</h1>
        <p className="text-sm text-muted-foreground mt-1">مراجعة الإدراجات، بلاغات المراقبة، قروض الهامش المعرّضة، ومراقبة التداول لحظياً.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Coins} label="حجم تداول 24س" value={`${fmt(s?.volume24h)} ر.س`} accent="bg-emerald-500/5" />
        <StatCard icon={Layers} label="إدراجات نشطة" value={s?.listingsByStatus?.active ?? 0} accent="bg-blue-500/5" />
        <StatCard icon={AlertTriangle} label="بلاغات مفتوحة" value={Object.values(s?.openFlagsBySeverity ?? {}).reduce((a, b) => a + Number(b), 0)} accent="bg-amber-500/5" />
        <StatCard icon={Users2} label="حسابات" value={s?.totalAccounts ?? 0} accent="bg-purple-500/5" />
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="pending">مراجعة الإدراجات</TabsTrigger>
          <TabsTrigger value="flags">بلاغات المراقبة</TabsTrigger>
          <TabsTrigger value="margin">قروض الهامش</TabsTrigger>
          <TabsTrigger value="trades">آخر الصفقات</TabsTrigger>
        </TabsList>
        <TabsContent value="pending"><PendingListings /></TabsContent>
        <TabsContent value="flags"><ComplianceFlags /></TabsContent>
        <TabsContent value="margin"><MarginAtRisk /></TabsContent>
        <TabsContent value="trades"><RecentTrades /></TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, accent }: any) {
  return (
    <Card className={accent}>
      <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-xs text-muted-foreground">{label}</CardTitle><Icon className="w-4 h-4 text-muted-foreground" /></div></CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
    </Card>
  )
}

function PendingListings() {
  const qc = useQueryClient()
  const listFn = useServerFn(smAdminPendingListings)
  const approveFn = useServerFn(smAdminApproveListing)
  const rejectFn = useServerFn(smAdminRejectListing)
  const q = useQuery({ queryKey: ['adm-mkt', 'pending'], queryFn: () => listFn() })

  const approve = useMutation({
    mutationFn: (listing_id: string) => approveFn({ data: { listing_id } }),
    onSuccess: () => { toast.success('تم اعتماد الإدراج'); qc.invalidateQueries({ queryKey: ['adm-mkt'] }) },
    onError: (e: any) => toast.error(e.message),
  })
  const reject = useMutation({
    mutationFn: ({ listing_id, reason }: { listing_id: string; reason: string }) => rejectFn({ data: { listing_id, reason } }),
    onSuccess: () => { toast.success('تم رفض الإدراج'); qc.invalidateQueries({ queryKey: ['adm-mkt'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  if (q.isLoading) return <Card><CardContent className="p-8 text-center text-muted-foreground">جارٍ التحميل...</CardContent></Card>
  if (!q.data?.length) return <Card><CardContent className="p-8 text-center text-muted-foreground">لا توجد إدراجات بانتظار المراجعة</CardContent></Card>

  return (
    <div className="space-y-3">
      {q.data.map((l: any) => (
        <Card key={l.id}>
          <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold">{l.name}</span>
                <Badge variant="outline" className="text-xs font-mono">{l.symbol}</Badge>
                <Badge variant={l.stage === 'project' ? 'default' : 'secondary'}>{l.stage === 'project' ? 'مشروع' : 'فكرة'}</Badge>
                <Badge variant="outline" className="text-xs">KYC: {l.owner?.kyc_tier ?? '—'}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                <span>الأسهم: {Number(l.total_shares).toLocaleString()}</span>
                <span>حصة المنصة: {Number(l.platform_shares).toLocaleString()}</span>
                <span>السعر: {fmt(l.reference_price, 4)}</span>
                <span>التقييم الأقصى: {fmt(l.max_valuation, 0)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => approve.mutate(l.id)} disabled={approve.isPending}>
                <CheckCircle2 className="w-4 h-4 me-1" /> اعتماد
              </Button>
              <Button size="sm" variant="destructive" onClick={() => {
                const r = prompt('سبب الرفض:')
                if (r && r.length > 2) reject.mutate({ listing_id: l.id, reason: r })
              }}>
                <XCircle className="w-4 h-4 me-1" /> رفض
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ComplianceFlags() {
  const qc = useQueryClient()
  const listFn = useServerFn(smAdminComplianceFlags)
  const resolveFn = useServerFn(smAdminResolveFlag)
  const [sev, setSev] = useState<string>('')
  const q = useQuery({ queryKey: ['adm-mkt', 'flags', sev], queryFn: () => listFn({ data: { resolved: false, severity: sev || undefined } }) })
  const resolve = useMutation({
    mutationFn: ({ flag_id, note }: { flag_id: string; note: string }) => resolveFn({ data: { flag_id, note } }),
    onSuccess: () => { toast.success('تم إغلاق البلاغ'); qc.invalidateQueries({ queryKey: ['adm-mkt', 'flags'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {['', 'critical', 'high', 'medium', 'low'].map((v) => (
          <Button key={v || 'all'} size="sm" variant={sev === v ? 'default' : 'outline'} onClick={() => setSev(v)}>
            {v === '' ? 'الكل' : v}
          </Button>
        ))}
      </div>
      {q.isLoading && <div className="text-center text-muted-foreground p-6">جارٍ التحميل...</div>}
      {!q.isLoading && !q.data?.length && <Card><CardContent className="p-8 text-center text-muted-foreground">لا بلاغات مفتوحة</CardContent></Card>}
      {q.data?.map((f: any) => (
        <Card key={f.id}>
          <CardContent className="p-4 flex items-center gap-3 justify-between flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={f.severity === 'critical' ? 'destructive' : f.severity === 'high' ? 'destructive' : 'secondary'}>{f.severity}</Badge>
                <span className="font-medium">{f.flag_type}</span>
                {f.listing && <Badge variant="outline" className="text-xs font-mono">{f.listing.symbol}</Badge>}
              </div>
              {f.details && <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap max-w-2xl">{JSON.stringify(f.details, null, 2)}</pre>}
            </div>
            <Button size="sm" variant="outline" onClick={() => {
              const n = prompt('ملاحظة الإغلاق:') || ''
              resolve.mutate({ flag_id: f.id, note: n })
            }}>
              <CheckCircle2 className="w-4 h-4 me-1" /> إغلاق
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function MarginAtRisk() {
  const listFn = useServerFn(smAdminMarginAtRisk)
  const q = useQuery({ queryKey: ['adm-mkt', 'margin'], queryFn: () => listFn(), refetchInterval: 20000 })

  if (q.isLoading) return <Card><CardContent className="p-8 text-center text-muted-foreground">جارٍ التحميل...</CardContent></Card>
  if (!q.data?.length) return <Card><CardContent className="p-8 text-center text-emerald-600">لا توجد قروض معرّضة للخطر — كل شيء بخير ✓</CardContent></Card>
  return (
    <div className="space-y-3">
      {q.data.map((l: any) => {
        const ratio = Number(l.latest_snapshot?.margin_ratio ?? 0)
        const critical = ratio < Number(l.liquidation_pct ?? 1.15)
        return (
          <Card key={l.id} className={critical ? 'border-destructive/50 bg-destructive/5' : 'border-amber-500/40 bg-amber-500/5'}>
            <CardContent className="p-4 flex items-center gap-3 justify-between flex-wrap">
              <div>
                <div className="font-mono text-xs text-muted-foreground">{l.id.slice(0, 8)}</div>
                <div className="flex flex-wrap gap-3 text-sm mt-1">
                  <span>الأصل: <b>{fmt(l.principal_amount)}</b></span>
                  <span>المستحق: <b>{fmt(l.outstanding_balance)}</b></span>
                  <span>قيمة الحساب: <b>{fmt(l.latest_snapshot?.account_value)}</b></span>
                  <span>الفائدة السنوية: {(Number(l.annual_interest_rate) * 100).toFixed(1)}%</span>
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${critical ? 'text-destructive' : 'text-amber-600'}`}>{ratio.toFixed(3)}</div>
                <div className="text-xs text-muted-foreground">Margin Ratio</div>
                <Badge variant={critical ? 'destructive' : 'secondary'} className="mt-1">{critical ? 'تصفية' : 'تحذير'}</Badge>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function RecentTrades() {
  const listFn = useServerFn(smAdminRecentTrades)
  const q = useQuery({ queryKey: ['adm-mkt', 'trades'], queryFn: () => listFn(), refetchInterval: 10000 })
  if (q.isLoading) return <Card><CardContent className="p-8 text-center text-muted-foreground">جارٍ التحميل...</CardContent></Card>
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="p-2 text-start">الوقت</th>
                <th className="p-2 text-start">الرمز</th>
                <th className="p-2 text-end">السعر</th>
                <th className="p-2 text-end">الكمية</th>
                <th className="p-2 text-end">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {q.data?.map((t: any) => (
                <tr key={t.id} className="border-t hover:bg-muted/30">
                  <td className="p-2 text-xs text-muted-foreground">{new Date(t.executed_at).toLocaleTimeString('ar-SA')}</td>
                  <td className="p-2 font-mono">{t.listing?.symbol}</td>
                  <td className="p-2 text-end font-mono">{fmt(t.price, 4)}</td>
                  <td className="p-2 text-end">{Number(t.quantity).toLocaleString()}</td>
                  <td className="p-2 text-end font-mono">{fmt(Number(t.price) * Number(t.quantity))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
