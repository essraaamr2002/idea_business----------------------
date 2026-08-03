import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

type Trade = { price: number; quantity: number; executed_at: string }

/** رسم بياني لحظي لأسعار الصفقات + خط السعر المرجعي */
export function LiveTradesChart({
  listingId, initialTrades, referencePrice,
}: {
  listingId: string
  initialTrades: Trade[]
  referencePrice: number
}) {
  const [trades, setTrades] = useState<Trade[]>(() => [...initialTrades].reverse())
  const [lastPrice, setLastPrice] = useState<number>(initialTrades[0]?.price ?? referencePrice)

  useEffect(() => {
    const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
    const ch = sb.channel(`sm-trades-${listingId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sm_trades', filter: `listing_id=eq.${listingId}` },
        (payload) => {
          const t = payload.new as any
          const row: Trade = { price: Number(t.price), quantity: Number(t.quantity), executed_at: t.executed_at }
          setTrades((prev) => [...prev.slice(-99), row])
          setLastPrice(row.price)
        })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [listingId])

  const chartData = trades.map((t) => ({
    time: new Date(t.executed_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    price: t.price,
  }))
  const up = lastPrice >= referencePrice
  const color = up ? '#10b981' : '#ef4444'

  if (!chartData.length) {
    return <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">لا صفقات بعد لرسمها</div>
  }
  return (
    <div className="h-52 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={30} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={60} />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 12 }}
            formatter={(v: number) => v.toFixed(4)}
          />
          <ReferenceLine y={referencePrice} stroke="#6366f1" strokeDasharray="3 3" label={{ value: 'مرجعي', fontSize: 10, fill: '#6366f1' }} />
          <Line type="monotone" dataKey="price" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
