import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useEffect, useMemo, useState } from 'react';
import { listMyBids } from '@/lib/auctions.functions';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gavel, Lock, ExternalLink, Search, Clock, TrendingUp, CheckCircle2, XCircle, Hourglass } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/my-bids')({
  head: () => ({
    meta: [
      { title: 'مزايداتي ومناقصاتي — IDEA BUSINESS' },
      { name: 'description', content: 'تابع جميع مزايداتك ومناقصاتك المغلقة وحالتها الحالية في مكان واحد.' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: MyBidsPage,
});

function fmt(n: number, ccy = 'SAR') {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n);
}

type Tab = 'auctions' | 'tenders';

function StatusBadge({ status, outbidAt }: { status: string; outbidAt: string | null }) {
  if (outbidAt && status !== 'won' && status !== 'accepted') {
    return <Badge variant="secondary"><XCircle className="me-1 h-3 w-3" />تم تجاوز عرضك</Badge>;
  }
  switch (status) {
    case 'won':
    case 'accepted':
      return <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="me-1 h-3 w-3" />مقبول/فائز</Badge>;
    case 'leading':
    case 'active':
      return <Badge className="bg-primary"><TrendingUp className="me-1 h-3 w-3" />الأعلى حالياً</Badge>;
    case 'rejected':
    case 'lost':
      return <Badge variant="destructive"><XCircle className="me-1 h-3 w-3" />مرفوض</Badge>;
    case 'pending':
    default:
      return <Badge variant="outline"><Hourglass className="me-1 h-3 w-3" />قيد المراجعة</Badge>;
  }
}

function MyBidsPage() {
  const fetchFn = useServerFn(listMyBids);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['my-bids'],
    queryFn: () => fetchFn(),
    refetchInterval: 60_000,
  });

  const [tab, setTab] = useState<Tab>('auctions');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'leading' | 'outbid' | 'won' | 'pending' | 'lost'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'amount'>('updated');

  // Realtime: refresh on any bid/auction change touching this user
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid || cancel) return;
      const ch = supabase
        .channel(`my-bids-${uid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bids', filter: `bidder_id=eq.${uid}` }, () => {
          qc.invalidateQueries({ queryKey: ['my-bids'] });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auctions' }, () => {
          qc.invalidateQueries({ queryKey: ['my-bids'] });
        })
        .subscribe();
      (window as any).__myBidsCh = ch;
    })();
    return () => {
      cancel = true;
      const ch = (window as any).__myBidsCh;
      if (ch) supabase.removeChannel(ch);
    };
  }, [qc]);

  const filtered = useMemo<any[]>(() => {
    const base = (data as any[])
      .filter((b) => (tab === 'auctions' ? b.auctions?.type !== 'sealed' : b.auctions?.type === 'sealed'))
      .filter((b) => {
        if (!q) return true;
        const name = (b.auctions?.projects?.name ?? '').toLowerCase();
        return name.includes(q.toLowerCase());
      })
      .filter((b) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'outbid') return !!b.outbid_at && b.status !== 'won' && b.status !== 'accepted';
        if (statusFilter === 'leading') return !b.outbid_at && (b.status === 'leading' || b.status === 'active' || b.status === 'pending');
        if (statusFilter === 'won') return b.status === 'won' || b.status === 'accepted';
        if (statusFilter === 'pending') return b.status === 'pending';
        if (statusFilter === 'lost') return b.status === 'lost' || b.status === 'rejected';
        return true;
      });
    const sorted = base.slice().sort((a, b) => {
      if (sortBy === 'amount') return Number(b.amount) - Number(a.amount);
      const aKey = sortBy === 'updated' ? (a.outbid_at || a.created_at) : a.created_at;
      const bKey = sortBy === 'updated' ? (b.outbid_at || b.created_at) : b.created_at;
      return new Date(bKey).getTime() - new Date(aKey).getTime();
    });
    return sorted;
  }, [data, tab, q, statusFilter, sortBy]);

  const auctionsCount = (data as any[]).filter((b) => b.auctions?.type !== 'sealed').length;
  const tendersCount = (data as any[]).filter((b) => b.auctions?.type === 'sealed').length;
  const rows = filtered;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <PageHeader
          kicker="حسابي"
          title="مزايداتي ومناقصاتي"
          subtitle="جميع عروضك في مكان واحد مع تحديث مباشر لحالة كل عرض."
          icon={<Gavel className="h-3 w-3" />}
        />

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-1 max-w-md">
          <button
            onClick={() => setTab('auctions')}
            className={`h-10 rounded-xl text-sm font-bold transition ${tab === 'auctions' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
          >
            <Gavel className="inline h-4 w-4 me-1" />
            مزايداتي ({auctionsCount})
          </button>
          <button
            onClick={() => setTab('tenders')}
            className={`h-10 rounded-xl text-sm font-bold transition ${tab === 'tenders' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
          >
            <Lock className="inline h-4 w-4 me-1" />
            مناقصاتي ({tendersCount})
          </button>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث باسم المشروع…"
              className="h-11 w-full rounded-full border border-border bg-card ps-10 pe-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-11 rounded-full border border-border bg-card px-4 text-sm"
          >
            <option value="all">كل الحالات</option>
            <option value="leading">الأعلى حالياً</option>
            <option value="outbid">تم تجاوز عرضي</option>
            <option value="pending">قيد المراجعة</option>
            <option value="won">فائز/مقبول</option>
            <option value="lost">مرفوض/خسرت</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-11 rounded-full border border-border bg-card px-4 text-sm"
          >
            <option value="updated">آخر تحديث</option>
            <option value="created">الأحدث إضافة</option>
            <option value="amount">قيمة العرض</option>
          </select>
        </div>


        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                {tab === 'auctions' ? <Gavel className="h-8 w-8 text-primary" /> : <Lock className="h-8 w-8 text-primary" />}
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {tab === 'auctions' ? 'لم تشارك في أي مزايدة بعد' : 'لم تقدّم أي عرض في مناقصة بعد'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">ابدأ بتصفّح الفرص المتاحة وقدّم عرضك الأول.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/community">
                    <Search className="me-1 h-4 w-4" />
                    تصفّح مشاريع المنصة
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {rows.map((b: any) => {
            const a = b.auctions ?? {};
            const projectName = a.projects?.name ?? 'مشروع';
            const projectId = a.project_id;
            return (
              <Card key={b.id} className="hover:border-primary/40 transition">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="gap-1">
                          {a.type === 'sealed' ? <Lock className="h-3 w-3" /> : <Gavel className="h-3 w-3" />}
                          {a.type === 'sealed' ? 'مناقصة مغلقة' : a.type === 'dutch' ? 'هولندية' : a.type === 'buynow' ? 'شراء فوري' : 'إنجليزية'}
                        </Badge>
                        <StatusBadge status={String(b.status || 'pending')} outbidAt={b.outbid_at} />
                        {a.status === 'live' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base line-clamp-1">{projectName}</h3>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        <span><Clock className="inline h-3 w-3 me-0.5" /> {new Date(b.created_at).toLocaleString('ar-SA')}</span>
                        {a.ends_at && <span>ينتهي: {new Date(a.ends_at).toLocaleDateString('ar-SA')}</span>}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="text-xs text-muted-foreground">عرضك</div>
                      <div className="text-xl font-bold tabular-nums">{fmt(Number(b.amount), a.currency || 'SAR')}</div>
                      {a.current_price && a.type !== 'sealed' && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          الحالي: {fmt(Number(a.current_price), a.currency || 'SAR')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {projectId && (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/projects/$id" params={{ id: projectId }}>
                          <ExternalLink className="me-1 h-3.5 w-3.5" />
                          صفحة المشروع
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
