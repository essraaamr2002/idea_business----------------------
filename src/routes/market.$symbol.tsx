import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { smGetOrderBook, smPlaceOrder } from '@/lib/market.functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LiveTradesChart } from '@/components/market/LiveTradesChart'
import { MarginStatusPanel } from '@/components/market/MarginStatusPanel'

async function getListingIdBySymbol(symbol: string) {
  const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  const { data } = await sb.from('sm_listings').select('id').eq('symbol', symbol).maybeSingle()
  return data?.id as string | undefined
}

export const Route = createFileRoute('/market/$symbol')({
  loader: async ({ params }) => {
    const id = await getListingIdBySymbol(params.symbol)
    if (!id) throw new Error('السهم غير موجود')
    return { listing_id: id }
  },
  head: ({ params }) => ({ meta: [{ title: `${params.symbol} — السوق الموازي` }] }),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">غير موجود</div>,
  component: SymbolPage,
})

function SymbolPage() {
  const { listing_id } = Route.useLoaderData()
  const { data } = useQuery({
    queryKey: ['sm', 'book', listing_id],
    queryFn: () => smGetOrderBook({ data: { listing_id } }),
    initialData: { bids: [], asks: [], listing: null as any, trades: [] },
    refetchInterval: 15_000,
  })
  const qc = useQueryClient()
  const router = useRouter()
  const place = useServerFn(smPlaceOrder)
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [type, setType] = useState<'LIMIT' | 'MARKET'>('LIMIT')
  const [price, setPrice] = useState<string>(String(data.listing?.reference_price ?? ''))
  const [qty, setQty] = useState<string>('100')
  const [busy, setBusy] = useState(false)

  // Realtime: refetch order book on trade / order changes for this listing
  useEffect(() => {
    const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
    const ch = sb.channel(`book-${listing_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sm_orders', filter: `listing_id=eq.${listing_id}` },
        () => qc.invalidateQueries({ queryKey: ['sm', 'book', listing_id] }))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sm_trades', filter: `listing_id=eq.${listing_id}` },
        () => qc.invalidateQueries({ queryKey: ['sm', 'book', listing_id] }))
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [listing_id, qc])

  async function submit() {
    setBusy(true)
    try {
      const r = await place({ data: {
        listing_id,
        side, type,
        price: type === 'LIMIT' ? Number(price) : undefined,
        quantity: Number(qty),
      }})
      toast.success(`تم تنفيذ الأمر. صفقات: ${r.match?.[0]?.trades_created ?? 0}`)
      await qc.invalidateQueries({ queryKey: ['sm', 'book', listing_id] })
      router.invalidate()
    } catch (e: any) {
      toast.error(e.message ?? 'فشل الأمر')
    } finally { setBusy(false) }
  }

  const l = data.listing
  const refPrice = Number(l?.reference_price ?? 0)
  const lim = Number(l?.daily_limit_pct ?? 0.1)
  const upper = (refPrice * (1 + lim)).toFixed(4)
  const lower = (refPrice * (1 - lim)).toFixed(4)

  // Depth totals for order book weight bars
  const maxDepth = Math.max(
    ...(data.bids as any[]).map((b) => Number(b.remaining)),
    ...(data.asks as any[]).map((a) => Number(a.remaining)),
    1,
  )

  return (
    <div className="container mx-auto py-6 space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-2xl">{l?.name}</CardTitle>
              <div className="text-sm text-muted-foreground">{l?.symbol} · {l?.stage === 'project' ? 'مشروع' : 'فكرة'}</div>
            </div>
            <div className="text-left">
              <div className="text-3xl font-mono font-bold text-primary">{refPrice.toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">حد اليوم: {lower} ⟷ {upper}</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Realtime chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">الرسم اللحظي (Live)</CardTitle></CardHeader>
        <CardContent>
          <LiveTradesChart listingId={listing_id} initialTrades={data.trades as any} referencePrice={refPrice} />
        </CardContent>
      </Card>

      <MarginStatusPanel compact />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order Book with depth bars */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>دفتر الأوامر (عمق السوق)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold text-green-600 mb-2">شراء (Bids)</div>
                {data.bids.length === 0 ? <div className="text-muted-foreground">لا توجد أوامر</div> :
                  data.bids.map((b: any, i: number) => {
                    const w = (Number(b.remaining) / maxDepth) * 100
                    return (
                      <div key={i} className="relative border-b py-1">
                        <div className="absolute inset-y-0 end-0 bg-green-500/10" style={{ width: `${w}%` }} />
                        <div className="relative flex justify-between font-mono">
                          <span className="text-green-600">{Number(b.price).toFixed(4)}</span>
                          <span>{Number(b.remaining).toLocaleString()}</span>
                        </div>
                      </div>
                    )
                  })}
              </div>
              <div>
                <div className="font-semibold text-red-600 mb-2">بيع (Asks)</div>
                {data.asks.length === 0 ? <div className="text-muted-foreground">لا توجد أوامر</div> :
                  data.asks.map((a: any, i: number) => {
                    const w = (Number(a.remaining) / maxDepth) * 100
                    return (
                      <div key={i} className="relative border-b py-1">
                        <div className="absolute inset-y-0 end-0 bg-red-500/10" style={{ width: `${w}%` }} />
                        <div className="relative flex justify-between font-mono">
                          <span className="text-red-600">{Number(a.price).toFixed(4)}</span>
                          <span>{Number(a.remaining).toLocaleString()}</span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
            <div className="mt-4">
              <div className="font-semibold mb-2">آخر الصفقات (تحديث لحظي)</div>
              {data.trades.length === 0 ? <div className="text-muted-foreground text-sm">لا صفقات بعد</div> :
                <div className="space-y-1 text-xs font-mono max-h-40 overflow-auto">
                  {data.trades.map((t: any, i: number) => (
                    <div key={i} className="flex justify-between border-b py-1">
                      <span>{new Date(t.executed_at).toLocaleTimeString('ar-SA')}</span>
                      <span>{Number(t.price).toFixed(4)}</span>
                      <span>{Number(t.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              }
            </div>
          </CardContent>
        </Card>

        {/* Trading Panel */}
        <Card>
          <CardHeader><CardTitle>تنفيذ أمر</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Tabs value={side} onValueChange={(v) => setSide(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="BUY">شراء</TabsTrigger>
                <TabsTrigger value="SELL">بيع</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={type} onValueChange={(v) => setType(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="LIMIT">محدد</TabsTrigger>
                <TabsTrigger value="MARKET">سوق</TabsTrigger>
              </TabsList>
            </Tabs>
            {type === 'LIMIT' && (
              <div>
                <Label>السعر</Label>
                <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.0001" />
              </div>
            )}
            <div>
              <Label>الكمية</Label>
              <Input value={qty} onChange={(e) => setQty(e.target.value)} type="number" step="1" />
            </div>
            <div className="text-xs text-muted-foreground">
              الإجمالي: <span className="font-mono">{(Number(price || 0) * Number(qty || 0)).toFixed(2)} ر.س</span>
            </div>
            <Button className="w-full" disabled={busy} onClick={submit}>
              {busy ? '...' : side === 'BUY' ? 'شراء' : 'بيع'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
