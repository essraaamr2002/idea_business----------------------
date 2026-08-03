import { useMemo, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  placeShareLotBid,
  listProjectShareLotBids,
  respondToShareLotBid,
  withdrawShareLotBid,
} from '@/lib/share-lot-bids.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Gavel,
  TrendingDown,
  TrendingUp,
  Info,
  Wallet,
  Check,
  X,
  Undo2,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

type Kind = 'bid' | 'tender';

function fmt(n: number, ccy = 'SAR') {
  return `${Number(n).toLocaleString('ar', { maximumFractionDigits: 2 })} ${ccy}`;
}

function statusBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'قيد الرد', cls: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
    accepted: { label: 'مقبول', cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
    rejected: { label: 'مرفوض', cls: 'bg-red-500/15 text-red-600 border-red-500/30' },
    withdrawn: { label: 'مسحوب', cls: 'bg-muted text-muted-foreground line-through' },
    expired: { label: 'منتهٍ', cls: 'bg-muted text-muted-foreground' },
  };
  const v = map[s] ?? { label: s, cls: 'bg-muted' };
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}

export function ProjectShareLotBidsPanel({
  projectId,
  isOwner,
  currentUserId,
  basePrice,
  minShareLot,
  currency = 'SAR',
  remainingShares,
}: {
  projectId: string;
  isOwner: boolean;
  currentUserId?: string | null;
  basePrice: number;
  minShareLot: number;
  currency?: string;
  remainingShares: number;
}) {
  const qc = useQueryClient();
  const listFn = useServerFn(listProjectShareLotBids);
  const placeFn = useServerFn(placeShareLotBid);
  const respondFn = useServerFn(respondToShareLotBid);
  const withdrawFn = useServerFn(withdrawShareLotBid);

  const { data: bids = [] } = useQuery({
    queryKey: ['share-lot-bids', projectId],
    queryFn: () => listFn({ data: { project_id: projectId } }),
    enabled: !!currentUserId,
    refetchInterval: 25_000,
  });

  const [kind, setKind] = useState<Kind>('bid');
  const [shares, setShares] = useState<string>('');
  const [pricePerShare, setPricePerShare] = useState<string>('');
  const [message, setMessage] = useState('');

  const sharesN = Number(shares) || 0;
  const priceN = Number(pricePerShare) || 0;
  const total = sharesN * priceN;
  const deposit = Math.max(1, Math.round(total * 0.05 * 100) / 100);

  const validation = useMemo(() => {
    if (!sharesN || !priceN) return 'أدخل عدد الأسهم وسعر السهم.';
    if (sharesN > remainingShares) return `الأسهم المتاحة ${remainingShares} فقط.`;
    if (kind === 'bid') {
      if (sharesN >= minShareLot) return `المزايدة لعدد أسهم أقل من ${minShareLot}.`;
      if (priceN <= basePrice) return `سعر السهم في المزايدة يجب أن يكون أعلى من ${basePrice}.`;
    } else {
      if (sharesN < minShareLot) return `المناقصة لعدد ${minShareLot} سهم أو أكثر.`;
      if (priceN >= basePrice) return `سعر السهم في المناقصة يجب أن يكون أقل من ${basePrice}.`;
    }
    return null;
  }, [kind, sharesN, priceN, basePrice, minShareLot, remainingShares]);

  const placeMut = useMutation({
    mutationFn: () => placeFn({
      data: {
        project_id: projectId,
        kind,
        shares: sharesN,
        price_per_share: priceN,
        message: message.trim() || undefined,
      },
    }),
    onSuccess: () => {
      toast.success(kind === 'bid' ? 'تم إرسال المزايدة' : 'تم إرسال المناقصة');
      setShares(''); setPricePerShare(''); setMessage('');
      qc.invalidateQueries({ queryKey: ['share-lot-bids', projectId] });
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الإرسال'),
  });

  const respondMut = useMutation({
    mutationFn: (v: { id: string; action: 'accept' | 'reject' }) => respondFn({ data: v }),
    onSuccess: () => {
      toast.success('تم الرد على العرض');
      qc.invalidateQueries({ queryKey: ['share-lot-bids', projectId] });
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الرد'),
  });

  const withdrawMut = useMutation({
    mutationFn: (id: string) => withdrawFn({ data: { id } }),
    onSuccess: () => {
      toast.success('تم سحب العرض');
      qc.invalidateQueries({ queryKey: ['share-lot-bids', projectId] });
    },
    onError: (e: any) => toast.error(e?.message || 'فشل السحب'),
  });

  const myBids = (bids as any[]).filter((b) => b.bidder_id === currentUserId);
  const incomingBids = (bids as any[]).filter((b) => b.owner_id === currentUserId);

  return (
    <TooltipProvider delayDuration={150}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gavel className="h-5 w-5" /> المزايدات والمناقصات على الأسهم
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="شرح">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs leading-relaxed">
                المزايدة = عرض على عدد أسهم أقل من الحد الأدنى بسعر سهم أعلى. المناقصة = شراء الحد الأدنى أو أكثر بسعر سهم أقل. تُحجز وديعة جدية 5% تلقائياً.
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-xs sm:grid-cols-3">
            <div>سعر السوق: <strong>{fmt(basePrice, currency)}</strong></div>
            <div>الحد الأدنى للصفقة: <strong>{minShareLot} سهم</strong></div>
            <div>أسهم متاحة: <strong>{remainingShares.toLocaleString('ar')}</strong></div>
          </div>

          {!isOwner && currentUserId && (
            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setKind('bid')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${kind === 'bid' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700' : 'border-border bg-card hover:bg-accent'}`}
                >
                  <TrendingUp className="inline h-4 w-4 ms-1" /> مزايدة (سعر أعلى)
                </button>
                <button
                  type="button"
                  onClick={() => setKind('tender')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${kind === 'tender' ? 'border-amber-500 bg-amber-500/10 text-amber-700' : 'border-border bg-card hover:bg-accent'}`}
                >
                  <TrendingDown className="inline h-4 w-4 ms-1" /> مناقصة (سعر أقل)
                </button>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                <Info className="inline h-3.5 w-3.5 ms-1" />
                {kind === 'bid' ? (
                  <>المزايدة: اختر عدد أسهم <strong>أقل من {minShareLot}</strong> وقدم سعر سهم <strong>أعلى من {basePrice}</strong>. مثال: 80 سهم بسعر 12 ريال بدلاً من 10.</>
                ) : (
                  <>المناقصة: اشترِ <strong>{minShareLot}</strong> سهم على الأقل بسعر سهم <strong>أقل من {basePrice}</strong>. مثال: 100 سهم بسعر 8 ريال بدلاً من 10.</>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    عدد الأسهم
                    <Tooltip>
                      <TooltipTrigger asChild><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="text-xs">{kind === 'bid' ? `أقل من ${minShareLot}` : `${minShareLot} أو أكثر`}</TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input type="number" min={1} value={shares} onChange={(e) => setShares(e.target.value)} placeholder={kind === 'bid' ? String(Math.max(1, minShareLot - 20)) : String(minShareLot)} />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    سعر السهم ({currency})
                    <Tooltip>
                      <TooltipTrigger asChild><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent className="text-xs">{kind === 'bid' ? `أعلى من ${basePrice}` : `أقل من ${basePrice}`}</TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input type="number" step="0.01" min={0} value={pricePerShare} onChange={(e) => setPricePerShare(e.target.value)} placeholder={String(kind === 'bid' ? (basePrice * 1.2).toFixed(2) : (basePrice * 0.85).toFixed(2))} />
                </div>
              </div>

              <div>
                <Label className="text-xs">رسالة لصاحب المشروع (اختياري)</Label>
                <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب سبب عرضك أو شروطك..." />
              </div>

              <div className="grid gap-2 rounded-lg border bg-card p-3 text-sm sm:grid-cols-3">
                <div>الإجمالي: <strong className="tabular-nums">{fmt(total, currency)}</strong></div>
                <div className="flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                  وديعة جدية 5%: <strong className="tabular-nums">{fmt(deposit, currency)}</strong>
                </div>
                <div>الفارق عن السوق:&nbsp;
                  <strong className={priceN && (kind === 'bid' ? priceN > basePrice : priceN < basePrice) ? 'text-emerald-600' : 'text-red-500'}>
                    {priceN ? `${(((priceN - basePrice) / basePrice) * 100).toFixed(1)}%` : '—'}
                  </strong>
                </div>
              </div>

              {validation && (
                <p className="text-xs text-red-500">⚠ {validation}</p>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => placeMut.mutate()}
                    disabled={!!validation || placeMut.isPending}
                    className="w-full"
                  >
                    {placeMut.isPending ? 'جارٍ الإرسال…' : kind === 'bid' ? 'إرسال المزايدة' : 'إرسال المناقصة'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  بإرسال العرض تحجز وديعة جدية بقيمة {fmt(deposit, currency)}. إذا قبل المالك، تتحول إلى دفعة من الصفقة؛ وإذا انسحبت بدون عذر، قد تخسرها.
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Incoming offers for owner */}
          {isOwner && incomingBids.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold">العروض الواردة ({incomingBids.length})</div>
              {incomingBids.map((b) => (
                <BidRow key={b.id} bid={b} currency={currency}>
                  {b.status === 'pending' && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" onClick={() => respondMut.mutate({ id: b.id, action: 'accept' })}>
                            <Check className="h-4 w-4 ms-1" /> قبول
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">قبول العرض ينقل الصفقة إلى غرفة التوقيع وحساب الضمان.</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="destructive" onClick={() => respondMut.mutate({ id: b.id, action: 'reject' })}>
                            <X className="h-4 w-4 ms-1" /> رفض
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">يرجع للمزايد وديعته كاملة.</TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </BidRow>
              ))}
            </div>
          )}

          {/* My offers as bidder */}
          {!isOwner && myBids.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold">عروضي ({myBids.length})</div>
              {myBids.map((b) => (
                <BidRow key={b.id} bid={b} currency={currency}>
                  {b.status === 'pending' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => withdrawMut.mutate(b.id)}>
                          <Undo2 className="h-4 w-4 ms-1" /> سحب
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">سحب العرض قبل قبوله. قد تُحتجز نسبة من الوديعة بحسب سياسة المنصة.</TooltipContent>
                    </Tooltip>
                  )}
                </BidRow>
              ))}
            </div>
          )}

          {!isOwner && currentUserId && myBids.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">لم تقدّم أي عرض على هذا المشروع بعد.</p>
          )}
          {isOwner && incomingBids.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">لا توجد عروض مزايدة أو مناقصة واردة بعد.</p>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

function BidRow({ bid, currency, children }: { bid: any; currency: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3 text-xs space-y-2 bg-card">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={bid.kind === 'bid' ? 'border-emerald-500/40 text-emerald-700' : 'border-amber-500/40 text-amber-700'}>
            {bid.kind === 'bid' ? <><TrendingUp className="h-3 w-3 ms-1" /> مزايدة</> : <><TrendingDown className="h-3 w-3 ms-1" /> مناقصة</>}
          </Badge>
          {statusBadge(bid.status)}
        </div>
        <div className="text-muted-foreground">{new Date(bid.created_at).toLocaleString('ar')}</div>
      </div>
      <div className="grid gap-1 sm:grid-cols-3">
        <div>الأسهم: <strong>{bid.shares}</strong></div>
        <div>سعر السهم: <strong>{fmt(Number(bid.price_per_share), currency)}</strong></div>
        <div>الإجمالي: <strong>{fmt(Number(bid.total_amount ?? bid.shares * bid.price_per_share), currency)}</strong></div>
      </div>
      {bid.message && <div className="rounded bg-muted/40 p-2 text-muted-foreground">{bid.message}</div>}
      {children && <div className="flex flex-wrap gap-2 pt-1">{children}</div>}
    </div>
  );
}
