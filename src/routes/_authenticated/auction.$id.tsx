import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { AuctionLivePanel } from '@/components/AuctionLivePanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Gavel, Lock, ExternalLink, CreditCard, Clock, History, ShieldCheck, Wallet } from 'lucide-react';
import { getAuction } from '@/lib/auctions.functions';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/_authenticated/auction/$id')({
  component: AuctionPage,
});

function fmt(n: number, ccy = 'SAR') {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(Number(n));
}

function typeLabel(t: string) {
  return t === 'english' ? 'إنجليزية' : t === 'dutch' ? 'هولندية' : t === 'sealed' ? 'مناقصة مغلقة' : t === 'buynow' ? 'شراء فوري' : t;
}

function statusBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    live: { label: '🔴 حية', cls: 'bg-red-500/15 text-red-600 border-red-500/30' },
    scheduled: { label: 'مجدولة', cls: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
    ended: { label: 'منتهية', cls: 'bg-muted text-muted-foreground' },
    settled: { label: 'مُسوّاة', cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
    cancelled: { label: 'ملغاة', cls: 'bg-muted text-muted-foreground line-through' },
  };
  const v = map[s] ?? { label: s, cls: 'bg-muted' };
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}

function AuctionPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchAuction = useServerFn(getAuction);

  const { data, isLoading } = useQuery({
    queryKey: ['auction', id],
    queryFn: () => fetchAuction({ data: { id } }),
  });

  // Realtime: refresh detail when bids or auction row change
  useEffect(() => {
    const ch = supabase
      .channel(`auction-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids', filter: `auction_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ['auction', id] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ['auction', id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  const auction: any = data?.auction;
  const bids: any[] = data?.bids ?? [];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/community"><ArrowRight className="me-1 h-4 w-4" /> رجوع للمشاريع</Link>
      </Button>

      {/* Header summary */}
      {!isLoading && auction && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {auction.type === 'sealed' ? <Lock className="h-4 w-4" /> : <Gavel className="h-4 w-4" />}
              <span>{typeLabel(auction.type)}</span>
              {statusBadge(auction.status)}
              <span className="text-xs text-muted-foreground ms-auto font-mono">#{String(id).slice(0, 8)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Stat label="السعر الحالي" value={fmt(auction.current_price, auction.currency)} />
            <Stat label="عدد العروض" value={String(auction.bids_count ?? 0)} />
            <Stat label="ينتهي" value={auction.ends_at ? new Date(auction.ends_at).toLocaleString('ar-SA') : '—'} />
            {auction.project_id && (
              <Button asChild variant="outline" size="sm" className="sm:col-span-3">
                <Link to="/projects/$id" params={{ id: auction.project_id }}>
                  <ExternalLink className="me-1 h-4 w-4" /> صفحة المشروع
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <AuctionLivePanel auctionId={id} />

      {/* Payments & verification */}
      {auction && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> الدفع والتحقق
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link
                  to="/pay"
                  search={{
                    purpose: "seriousness_deposit",
                    amount: Math.max(1, Math.round(Number(auction.start_price) * (Number(auction.deposit_required_pct ?? 5) / 100))),
                    currency: auction.currency || "SAR",
                    returnTo: `/auction/${id}`,
                  } as any}
                >
                  <CreditCard className="me-1 h-4 w-4" /> ادفع وديعة الجدية
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/wallet"><Wallet className="me-1 h-4 w-4" /> محفظتي</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link to="/wallet/history"><History className="me-1 h-4 w-4" /> سجل العمليات</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              تُحجز وديعة جدية من محفظتك قبل قبول العرض. عند الفوز يُنشأ Deal Room بتوقيع إلكتروني وحساب ضمان.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Event log */}
      {auction && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> سجل الأحداث
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              <EventLine when={auction.created_at} label="إنشاء المزايدة" />
              {auction.starts_at && <EventLine when={auction.starts_at} label="بدء المزايدة" />}
              {auction.type !== 'sealed' && bids.slice().reverse().map((b) => (
                <EventLine
                  key={b.id}
                  when={b.created_at}
                  label={`عرض جديد ${b.is_auto_bid ? '(تلقائي)' : ''}: ${fmt(b.amount, auction.currency)}`}
                />
              ))}
              {auction.type === 'sealed' && bids.length > 0 && (
                <li className="text-xs text-muted-foreground rounded bg-muted/40 p-2">
                  🔒 العروض مكتومة — تُكشف بعد انتهاء المناقصة ({bids.length} عرض مُسجَّل).
                </li>
              )}
              {auction.ends_at && <EventLine when={auction.ends_at} label="موعد الانتهاء المتوقع" upcoming />}
              {auction.status === 'settled' && <EventLine when={auction.updated_at} label="تمت التسوية وإنشاء Deal Room" />}
              {auction.status === 'cancelled' && <EventLine when={auction.updated_at} label="تم إلغاء المزايدة" />}
            </ol>
          </CardContent>
        </Card>
      )}

      {isLoading && <Card><CardContent className="p-6 text-center text-muted-foreground">جارٍ التحميل…</CardContent></Card>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

function EventLine({ when, label, upcoming }: { when?: string | null; label: string; upcoming?: boolean }) {
  if (!when) return null;
  const d = new Date(when);
  return (
    <li className="flex items-start gap-2 rounded border-s-2 border-primary/40 ps-3 py-1">
      <Clock className={`h-3 w-3 mt-1 ${upcoming ? 'text-amber-600' : 'text-muted-foreground'}`} />
      <div className="flex-1">
        <div className="text-sm">{label}</div>
        <div className="text-[11px] text-muted-foreground">{d.toLocaleString('ar-SA')}</div>
      </div>
    </li>
  );
}
