import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { createAuction, listAuctionsForProject } from '@/lib/auctions.functions';
import { setProjectServices, SERVICE_META, type ServiceKey } from '@/lib/project-services.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Gavel, Lock, ShoppingCart, Timer, TrendingUp, TrendingDown, FileLock2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

function fmt(n: number, ccy = 'SAR') {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n);
}

// Map service key → auction.type used in DB
const SERVICE_TO_AUCTION_TYPE: Record<ServiceKey, 'english' | 'sealed' | 'dutch' | 'buynow'> = {
  auction_live: 'english',
  auction_sealed: 'sealed',
  tender_live: 'dutch',
  tender_sealed: 'sealed', // sealed tender stored as sealed; differentiated by service flag
};

function IconFor({ k, className }: { k: ServiceKey; className?: string }) {
  switch (k) {
    case 'auction_live': return <Gavel className={className} />;
    case 'auction_sealed': return <Lock className={className} />;
    case 'tender_live': return <TrendingDown className={className} />;
    case 'tender_sealed': return <FileLock2 className={className} />;
  }
}

export function ProjectAuctionPanel({
  projectId,
  isOwner,
  currency = 'SAR',
  servicesEnabled,
}: {
  projectId: string;
  isOwner: boolean;
  currency?: string;
  servicesEnabled?: Partial<Record<ServiceKey, boolean>>;
}) {
  const qc = useQueryClient();
  const listFn = useServerFn(listAuctionsForProject);
  const createFn = useServerFn(createAuction);
  const setServicesFn = useServerFn(setProjectServices);

  const [services, setServices] = useState<Record<ServiceKey, boolean>>({
    auction_live: !!servicesEnabled?.auction_live,
    auction_sealed: !!servicesEnabled?.auction_sealed,
    tender_live: !!servicesEnabled?.tender_live,
    tender_sealed: !!servicesEnabled?.tender_sealed,
  });

  const { data: auctions = [] } = useQuery({
    queryKey: ['project-auctions', projectId],
    queryFn: () => listFn({ data: { project_id: projectId } }),
    refetchInterval: 20_000,
  });

  const toggleMut = useMutation({
    mutationFn: (next: Partial<Record<ServiceKey, boolean>>) =>
      setServicesFn({ data: { project_id: projectId, services: next } }),
    onSuccess: (res: any) => {
      if (res?.services_enabled) setServices(res.services_enabled);
      toast.success('تم تحديث الخدمات');
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'تعذّر التحديث'),
  });

  const handleToggle = (key: ServiceKey, val: boolean) => {
    setServices((s) => ({ ...s, [key]: val }));
    toggleMut.mutate({ [key]: val });
  };

  const live = (auctions as any[]).filter((a) => a.status === 'live' || a.status === 'scheduled');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5" /> خدمات المشروع
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {isOwner
            ? 'فعّل الخدمات التي تريد إتاحتها للمستثمرين على هذا المشروع. كل خدمة تظهر مع شرحها وآلية تنفيذها.'
            : 'الخدمات المتاحة للمستثمرين على هذا المشروع.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {(Object.keys(SERVICE_META) as ServiceKey[]).map((key) => {
          const meta = SERVICE_META[key];
          const enabled = services[key];
          const serviceAuctions = live.filter((a) => {
            const t = SERVICE_TO_AUCTION_TYPE[key];
            // For sealed: only show under the right service (auction_sealed gets sealed auctions, tender_sealed via flag in payload)
            if (key === 'tender_sealed') return a.type === 'sealed' && a.service_key === 'tender_sealed';
            if (key === 'auction_sealed') return a.type === 'sealed' && a.service_key !== 'tender_sealed';
            return a.type === t;
          });

          if (!isOwner && !enabled) return null; // hide disabled services from non-owners

          return (
            <ServiceCard
              key={key}
              serviceKey={key}
              title={meta.title}
              short={meta.short}
              description={meta.description}
              icon={<IconFor k={key} className="h-5 w-5" />}
              enabled={enabled}
              isOwner={isOwner}
              onToggle={(v) => handleToggle(key, v)}
              projectId={projectId}
              currency={currency}
              serviceAuctions={serviceAuctions}
              createFn={createFn}
              qc={qc}
            />
          );
        })}

        {!isOwner && Object.values(services).every((v) => !v) && (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            لم يُفعّل صاحب المشروع أي خدمة مزايدة أو مناقصة حتى الآن.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ServiceCard({
  serviceKey,
  title,
  short,
  description,
  icon,
  enabled,
  isOwner,
  onToggle,
  projectId,
  currency,
  serviceAuctions,
  createFn,
  qc,
}: {
  serviceKey: ServiceKey;
  title: string;
  short: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  isOwner: boolean;
  onToggle: (v: boolean) => void;
  projectId: string;
  currency: string;
  serviceAuctions: any[];
  createFn: any;
  qc: any;
}) {
  const [showForm, setShowForm] = useState(false);
  const [startPrice, setStartPrice] = useState('');
  const [reservePrice, setReservePrice] = useState('');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [minIncrement, setMinIncrement] = useState('1000');
  const [durationDays, setDurationDays] = useState('7');
  const [depositPct, setDepositPct] = useState('5');

  const isTender = serviceKey === 'tender_live' || serviceKey === 'tender_sealed';
  const isSealed = serviceKey === 'auction_sealed' || serviceKey === 'tender_sealed';

  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          project_id: projectId,
          type: SERVICE_TO_AUCTION_TYPE[serviceKey],
          service_key: serviceKey,
          start_price: Number(startPrice),
          reserve_price: reservePrice ? Number(reservePrice) : undefined,
          buy_now_price: buyNowPrice ? Number(buyNowPrice) : undefined,
          min_increment: minIncrement ? Number(minIncrement) : 1000,
          deposit_pct: depositPct ? Number(depositPct) : 5,
          ends_at: new Date(Date.now() + Number(durationDays || 7) * 86_400_000).toISOString(),
          auto_extend_minutes: 5,
        },
      }),
    onSuccess: () => {
      toast.success('تم إطلاق الخدمة');
      setShowForm(false);
      setStartPrice(''); setReservePrice(''); setBuyNowPrice('');
      qc.invalidateQueries({ queryKey: ['project-auctions', projectId] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'فشل الإطلاق'),
  });

  return (
    <div className={`rounded-xl border p-4 transition ${enabled ? 'border-primary/40 bg-primary/5' : 'bg-card'}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${enabled ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold">{title}</h4>
            <Badge variant={enabled ? 'default' : 'secondary'} className="text-[10px]">
              {enabled ? 'مُفعّلة' : 'غير مُفعّلة'}
            </Badge>
            {isSealed && <Badge variant="outline" className="text-[10px] gap-1"><Lock className="h-3 w-3" /> مغلقة</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{short}</p>
        </div>
        {isOwner && (
          <Switch checked={enabled} onCheckedChange={onToggle} aria-label={`تفعيل ${title}`} />
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground mt-3">{description}</p>

      {enabled && isOwner && (
        <div className="mt-3">
          {!showForm ? (
            <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
              + إطلاق {title} جديدة
            </Button>
          ) : (
            <div className="mt-2 space-y-3 rounded-lg border bg-background p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">{isTender ? `سعر السقف (${currency})` : `السعر الابتدائي (${currency})`}</Label>
                  <Input type="number" value={startPrice} onChange={(e) => setStartPrice(e.target.value)} placeholder="100000" />
                </div>
                <div>
                  <Label className="text-xs">المدة (أيام)</Label>
                  <Input type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">السعر الاحتياطي (اختياري)</Label>
                  <Input type="number" value={reservePrice} onChange={(e) => setReservePrice(e.target.value)} />
                </div>
                {!isTender && (
                  <div>
                    <Label className="text-xs">سعر الشراء الفوري (اختياري)</Label>
                    <Input type="number" value={buyNowPrice} onChange={(e) => setBuyNowPrice(e.target.value)} />
                  </div>
                )}
                <div>
                  <Label className="text-xs">{isTender ? 'حد الخفض الأدنى' : 'حد الزيادة الأدنى'}</Label>
                  <Input type="number" value={minIncrement} onChange={(e) => setMinIncrement(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">نسبة الوديعة %</Label>
                  <Input type="number" value={depositPct} onChange={(e) => setDepositPct(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => createMut.mutate()} disabled={!startPrice || createMut.isPending}>
                  {createMut.isPending ? 'جارٍ الإطلاق…' : 'إطلاق'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>إلغاء</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {enabled && serviceAuctions.length > 0 && (
        <div className="mt-3 space-y-2">
          {serviceAuctions.map((a: any) => (
            <Link key={a.id} to="/auction/$id" params={{ id: a.id }} className="block">
              <div className="rounded-lg border p-3 transition hover:border-primary/50 bg-background">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{isTender ? 'السعر المعروض' : 'السعر الحالي'}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE
                  </span>
                </div>
                <div className="text-xl font-bold tabular-nums">{fmt(Number(a.current_price), a.currency || currency)}</div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" /> ينتهي {new Date(a.ends_at).toLocaleDateString('ar')}</span>
                  <span className="inline-flex items-center gap-1">
                    {isTender ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />} {a.bids_count} عرض
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="flex-1">{isSealed ? 'قدّم عرضك' : isTender ? 'انافس بسعر أقل' : 'زايد الآن'}</Button>
                  {a.buy_now_price && (
                    <Button size="sm" variant="outline">
                      <ShoppingCart className="h-4 w-4 ms-1" /> {fmt(Number(a.buy_now_price), a.currency || currency)}
                    </Button>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
