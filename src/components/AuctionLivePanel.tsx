import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getAuction, placeBid } from '@/lib/auctions.functions';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gavel, Clock, TrendingUp, ShoppingCart, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';


function maskName(id: string) {
  return id.slice(0, 2) + '****';
}
function fmt(n: number, ccy = 'SAR') {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n);
}

function useCountdown(endsAt: string | null | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, total: 0, danger: true };
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    total: s,
    danger: s <= 60,
  };
}

export function AuctionLivePanel({ auctionId }: { auctionId: string }) {
  const qc = useQueryClient();
  const fetchAuction = useServerFn(getAuction);
  const placeBidFn = useServerFn(placeBid);
  const [bidAmount, setBidAmount] = useState('');
  const [depositError, setDepositError] = useState<null | { amount: number; currency: string; ref: string | null }>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['auction', auctionId],
    queryFn: () => fetchAuction({ data: { id: auctionId } }),
    refetchInterval: 10_000,
  });

  // Realtime: subscribe to bid changes
  useEffect(() => {
    const ch = supabase
      .channel(`auction-${auctionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids', filter: `auction_id=eq.${auctionId}` }, () => {
        qc.invalidateQueries({ queryKey: ['auction', auctionId] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}` }, () => {
        qc.invalidateQueries({ queryKey: ['auction', auctionId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [auctionId, qc]);

  const auction: any = data?.auction;
  const bids: any[] = data?.bids ?? [];
  const countdown = useCountdown(auction?.ends_at);

  const minNext = useMemo(() => {
    if (!auction) return 0;
    return Number(auction.current_price) + Number(auction.min_increment);
  }, [auction]);

  const mutation = useMutation({
    mutationFn: (amount: number) => placeBidFn({ data: { auction_id: auctionId, amount } }),
    onSuccess: (r: any) => {
      toast.success(r?.extended ? 'تم تمديد الوقت 5 دقائق بسبب عرضك الأخير' : 'تم تسجيل مزايدتك');
      setBidAmount('');
      qc.invalidateQueries({ queryKey: ['auction', auctionId] });
    },
    onError: (e: any) => {
      const msg = String(e?.message ?? '');
      // format: seriousness_deposit_required:<amount>:<currency>:<pendingRef?>
      const dep = msg.match(/seriousness_deposit_required:(\d+(?:\.\d+)?)(?::([A-Z]{3}))?(?::([^\s:]*))?/);
      if (dep) {
        setDepositError({
          amount: Number(dep[1]),
          currency: dep[2] || 'USD',
          ref: dep[3] || null,
        });
      } else {
        toast.error(msg || 'فشل تسجيل المزايدة');
      }
    },
  });


  if (isLoading) return <Card><CardContent className="p-6 text-center text-muted-foreground">جارٍ التحميل…</CardContent></Card>;
  if (!auction) return <Card><CardContent className="p-6 text-center text-muted-foreground">المزايدة غير موجودة</CardContent></Card>;

  const isSealed = auction.type === 'sealed';
  const isDutch = auction.type === 'dutch';

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-primary" />
          {isSealed ? 'مناقصة مغلقة' : isDutch ? 'مزايدة هولندية' : 'مزايدة حية'}
          <Badge variant="outline" className="ms-auto">{auction.status === 'live' ? '🔴 LIVE' : auction.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {depositError && (() => {
          const returnTo = `/auction/${auctionId}`;
          const payHref = `/pay?purpose=seriousness_deposit&amount=${depositError.amount}&currency=${depositError.currency}&returnTo=${encodeURIComponent(returnTo)}`;
          return (
            <div className="rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="font-bold text-amber-900 dark:text-amber-100">
                    يلزم دفع وديعة الجدية قبل المزايدة
                  </div>
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    المبلغ المطلوب: <span className="font-bold">{depositError.amount} {depositError.currency}</span>
                    {' · '}صالحة لمدة 24 ساعة عبر جميع مزايداتك.
                  </div>
                  {depositError.ref && (
                    <div className="text-xs text-amber-700 dark:text-amber-300 font-mono">
                      رقم العملية المعلّقة: {depositError.ref}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700">
                  <a href={payHref}>
                    <TrendingUp className="me-1 h-4 w-4" />
                    ادفع الآن وأكمل المزايدة
                  </a>
                </Button>
                {depositError.ref && (
                  <Button asChild size="sm" variant="outline">
                    <a href={`/wallet/history?ref=${depositError.ref}`}>
                      <ExternalLink className="me-1 h-4 w-4" />
                      تحقق من حالة العملية
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setDepositError(null)}>
                  إغلاق
                </Button>
              </div>
            </div>
          );
        })()}
        <div className="flex items-center justify-between rounded-lg bg-muted/40 p-4">
          <div>
            <div className="text-xs text-muted-foreground">السعر الحالي</div>
            <div className="text-2xl font-bold">{fmt(Number(auction.current_price), auction.currency)}</div>
          </div>
          <div className="text-end">
            <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
              <Clock className="h-3 w-3" /> ينتهي
            </div>
            <div className={`font-mono text-lg ${countdown?.danger ? 'text-red-600 animate-pulse' : ''}`}>
              {countdown
                ? `${countdown.d}ي ${String(countdown.h).padStart(2, '0')}:${String(countdown.m).padStart(2, '0')}:${String(countdown.s).padStart(2, '0')}`
                : 'انتهت'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded bg-muted/30 p-2">
            <div className="text-muted-foreground text-xs">عدد العروض</div>
            <div className="font-semibold">{auction.bids_count}</div>
          </div>
          <div className="rounded bg-muted/30 p-2">
            <div className="text-muted-foreground text-xs">السعر الابتدائي</div>
            <div className="font-semibold">{fmt(Number(auction.start_price), auction.currency)}</div>
          </div>
          <div className="rounded bg-muted/30 p-2">
            <div className="text-muted-foreground text-xs">الزيادة الدنيا</div>
            <div className="font-semibold">{fmt(Number(auction.min_increment), auction.currency)}</div>
          </div>
        </div>

        {auction.status === 'live' && countdown && countdown.total > 0 && (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">
              أدخل عرضك (الحد الأدنى: <span className="font-semibold">{fmt(minNext, auction.currency)}</span>)
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="decimal"
                placeholder={String(minNext)}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
              />
              <Button
                onClick={() => mutation.mutate(Number(bidAmount))}
                disabled={mutation.isPending || !bidAmount || Number(bidAmount) < minNext}
              >
                <TrendingUp className="me-1 h-4 w-4" /> زايد
              </Button>
            </div>
            {auction.buy_now_price && auction.type === 'buynow' && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => mutation.mutate(Number(auction.buy_now_price))}
                disabled={mutation.isPending}
              >
                <ShoppingCart className="me-1 h-4 w-4" />
                اشترِ الآن بـ {fmt(Number(auction.buy_now_price), auction.currency)}
              </Button>
            )}
            <div className="text-xs text-muted-foreground">
              وديعة جدية: {auction.deposit_required_pct}% من السعر الابتدائي ستُحجز من محفظتك.
            </div>
          </div>
        )}

        {!isSealed && bids.length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-semibold">آخر العروض</div>
            <div className="space-y-1 text-sm">
              {bids.slice(0, 8).map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded bg-muted/30 px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{maskName(b.bidder_id)}</span>
                    {b.is_auto_bid && <Badge variant="secondary" className="text-[10px]">تلقائي</Badge>}
                  </div>
                  <div className="font-semibold">{fmt(Number(b.amount), auction.currency)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {isSealed && (
          <div className="rounded bg-yellow-500/10 p-3 text-sm text-yellow-800">
            🔒 العروض مخفية. تُكشف بعد انتهاء المناقصة.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
