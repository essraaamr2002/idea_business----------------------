import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { getShareInfo, getCandles, getRecentTrades } from '@/lib/trading.functions';
import { supabase } from '@/integrations/supabase/client';
import { CandlestickChart } from '@/components/CandlestickChart';
import { OrderBook } from '@/components/OrderBook';
import { TradePanel } from '@/components/TradePanel';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

export const Route = createFileRoute('/trade/$id')({
  loader: async ({ params }) => {
    const info: any = await getShareInfo({ data: { project_id: params.id } });
    if (!info) throw notFound();
    return { info };
  },
  errorComponent: ({ error }) => <div className="p-8 text-center text-red-600">{String(error?.message ?? error)}</div>,
  notFoundComponent: () => <div className="p-8 text-center">هذا المشروع لم يُدرج للتداول بعد.</div>,
  head: ({ loaderData }) => ({
    meta: [{ title: `تداول — ${loaderData?.info?.project_id?.slice(0, 8) ?? ''} | IDEA BUSINESS` }],
  }),
  component: TradePage,
});

function TradePage() {
  const { info } = Route.useLoaderData();
  const candlesFn = useServerFn(getCandles);
  const tradesFn = useServerFn(getRecentTrades);
  const [share, setShare] = useState<any>(info);
  const [projectName, setProjectName] = useState<string>('');

  const { data: candles = [] } = useQuery({
    queryKey: ['candles', share.project_id],
    queryFn: () => candlesFn({ data: { project_id: share.project_id, limit: 300 } }),
    refetchInterval: 10000,
  });
  const { data: trades = [] } = useQuery({
    queryKey: ['recent-trades', share.project_id],
    queryFn: () => tradesFn({ data: { project_id: share.project_id, limit: 20 } }),
    refetchInterval: 5000,
  });

  // Realtime updates for share row
  useEffect(() => {
    supabase.from('projects').select('name').eq('id', share.project_id).maybeSingle().then(({ data }) => setProjectName(data?.name ?? ''));
    const ch = supabase.channel(`shares:${share.project_id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'project_shares', filter: `project_id=eq.${share.project_id}` },
        (p) => setShare(p.new))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [share.project_id]);

  const change = Number(share.price_change_24h_pct ?? 0);
  const isUp = change >= 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        {/* Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link to="/projects/$id" params={{ id: share.project_id }} className="text-sm text-muted-foreground hover:underline">
                  {projectName || 'مشروع'} ←
                </Link>
                <div className="flex items-baseline gap-3">
                  <h1 className="text-3xl font-black font-mono">{Number(share.current_price).toFixed(2)}</h1>
                  <Badge variant={isUp ? 'default' : 'destructive'} className="gap-1">
                    {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {isUp ? '+' : ''}{change.toFixed(2)}%
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>أعلى 24س: {Number(share.high_24h ?? 0).toFixed(2)}</span>
                  <span>أدنى 24س: {Number(share.low_24h ?? 0).toFixed(2)}</span>
                  <span>الحجم: {Number(share.volume_24h ?? 0).toLocaleString('ar')}</span>
                  <span>السوقي: {Number(share.market_cap ?? 0).toLocaleString('ar')}</span>
                </div>
              </div>
              {share.is_halted && <Badge variant="destructive">تداول موقوف</Badge>}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Card><CardContent className="p-2">
              {candles.length === 0 ? (
                <div className="h-[360px] grid place-items-center text-muted-foreground">
                  <div className="text-center"><Activity className="mx-auto h-8 w-8 opacity-40" /><p className="mt-2 text-sm">لا توجد بيانات أسعار بعد — أول صفقة ستبدأ الرسم</p></div>
                </div>
              ) : (
                <CandlestickChart candles={candles as any[]} />
              )}
            </CardContent></Card>

            <div className="grid gap-4 md:grid-cols-2">
              <OrderBook projectId={share.project_id} />
              <Card><CardContent className="p-3">
                <h3 className="font-semibold text-sm mb-2">آخر الصفقات</h3>
                {(trades as any[]).length === 0 && <p className="text-xs text-muted-foreground py-3">لا توجد صفقات بعد.</p>}
                <div className="space-y-1 text-xs font-mono">
                  {(trades as any[]).map((t, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{Number(t.quantity).toLocaleString('ar')}</span>
                      <span className="font-bold">{Number(t.price).toFixed(2)}</span>
                      <span className="text-muted-foreground">{new Date(t.executed_at).toLocaleTimeString('ar')}</span>
                    </div>
                  ))}
                </div>
              </CardContent></Card>
            </div>
          </div>

          <aside className="space-y-4">
            <TradePanel projectId={share.project_id} currentPrice={Number(share.current_price)} />
          </aside>
        </div>
      </main>
    </div>
  );
}
