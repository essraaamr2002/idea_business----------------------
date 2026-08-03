import { createFileRoute, Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getMyPortfolio, getMyOpenOrders, cancelOrder } from '@/lib/trading.functions';
import { getOwnershipCertificateData } from '@/lib/ownership-certificate.functions';
import { saveOwnershipSignature, getMyOwnershipSignature } from '@/lib/ownership-signature.functions';
import { downloadOwnershipCertificate } from '@/lib/ownership-certificate-pdf';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SignaturePad } from '@/components/SignaturePad';
import { Briefcase, TrendingUp, TrendingDown, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/trading-portfolio')({ component: PortfolioPage });

function PortfolioPage() {
  const portFn = useServerFn(getMyPortfolio);
  const ordersFn = useServerFn(getMyOpenOrders);
  const cancelFn = useServerFn(cancelOrder);
  const certFn = useServerFn(getOwnershipCertificateData);
  const saveSigFn = useServerFn(saveOwnershipSignature);
  const getSigFn = useServerFn(getMyOwnershipSignature);
  const qc = useQueryClient();

  const { data: portfolio } = useQuery({ queryKey: ['portfolio'], queryFn: () => portFn(), refetchInterval: 15000 });
  const { data: orders = [] } = useQuery({ queryKey: ['open-orders'], queryFn: () => ordersFn(), refetchInterval: 10000 });

  const cancelM = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { order_id: id } }),
    onSuccess: () => { toast.success('تم الإلغاء'); qc.invalidateQueries({ queryKey: ['open-orders'] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const [sigCert, setSigCert] = useState<any | null>(null);
  const [existingSig, setExistingSig] = useState<{ signature_data_url: string; signed_at: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const openCertDialog = async (project_id: string) => {
    try {
      const data = await certFn({ data: { project_id } });
      const existing = await getSigFn({ data: { certificate_no: data.certificate_no } });
      setExistingSig(existing as any);
      setSigCert(data);
    } catch (err: any) {
      toast.error(err?.message ?? 'تعذر تحضير السند');
    }
  };

  const handleConfirm = async (signature_data_url: string) => {
    if (!sigCert) return;
    setBusy(true);
    try {
      const res = await saveSigFn({
        data: {
          certificate_no: sigCert.certificate_no,
          project_id: sigCert.project_id,
          signature_data_url,
        },
      });
      const finalSig = (res as any).signature_data_url ?? signature_data_url;
      downloadOwnershipCertificate({
        ...sigCert,
        guarantees: { promissory_note: true, trust_receipt: true },
        signature_data_url: finalSig,
        signed_at: (res as any).signed_at,
      });
      toast.success('تم التوقيع وإصدار السند');
      setSigCert(null);
      setExistingSig(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'فشل حفظ التوقيع');
    } finally {
      setBusy(false);
    }
  };

  const reuseExisting = () => {
    if (!sigCert || !existingSig) return;
    downloadOwnershipCertificate({
      ...sigCert,
      guarantees: { promissory_note: true, trust_receipt: true },
      signature_data_url: existingSig.signature_data_url,
      signed_at: existingSig.signed_at,
    });
    setSigCert(null);
    setExistingSig(null);
  };

  const p: any = portfolio ?? { holdings: [], total_value: 0, total_invested: 0, total_pnl: 0 };
  const isUp = p.total_pnl >= 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <PageHeader title="محفظتي" subtitle="ممتلكاتك وأوامرك المفتوحة" icon={<Briefcase className="h-6 w-6" />} />

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardContent className="p-5">
            <p className="text-xs text-muted-foreground">القيمة الحالية</p>
            <p className="text-2xl font-black font-mono">{Number(p.total_value).toLocaleString('ar', { maximumFractionDigits: 2 })}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-xs text-muted-foreground">الاستثمار الكلي</p>
            <p className="text-2xl font-black font-mono">{Number(p.total_invested).toLocaleString('ar', { maximumFractionDigits: 2 })}</p>
          </CardContent></Card>
          <Card className={isUp ? 'border-emerald-500/30' : 'border-red-500/30'}><CardContent className="p-5">
            <p className="text-xs text-muted-foreground">الربح/الخسارة</p>
            <p className={`text-2xl font-black font-mono flex items-center gap-1 ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
              {isUp ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {isUp ? '+' : ''}{Number(p.total_pnl).toLocaleString('ar', { maximumFractionDigits: 2 })}
            </p>
          </CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold mb-3">الممتلكات</h2>
            {p.holdings.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">لا توجد ممتلكات بعد. <Link to="/market-pro" className="text-primary hover:underline">استكشف السوق</Link></p>}
            <div className="space-y-2">
              {p.holdings.map((h: any) => (
                <div key={h.project_id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/40">
                  <Link to="/trade/$id" params={{ id: h.project_id }} className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{h.projects?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{Number(h.quantity).toLocaleString('ar')} سهم · متوسط {Number(h.avg_buy_price).toFixed(2)}</p>
                  </Link>
                  <div className="text-end px-3">
                    <p className="font-mono font-bold text-sm">{Number(h.value).toLocaleString('ar', { maximumFractionDigits: 2 })}</p>
                    <p className={`text-xs ${h.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {h.pnl >= 0 ? '+' : ''}{Number(h.pnl_pct).toFixed(2)}%
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={(e) => { e.preventDefault(); openCertDialog(h.project_id); }}
                  >
                    <FileText className="h-4 w-4" />
                    سند تملك
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="font-bold mb-3">الأوامر المفتوحة</h2>
            {(orders as any[]).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد أوامر مفتوحة.</p>}
            <div className="space-y-2">
              {(orders as any[]).map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={o.side === 'buy' ? 'default' : 'destructive'} className="text-xs">{o.side === 'buy' ? 'شراء' : 'بيع'}</Badge>
                      <span className="font-semibold text-sm">{o.projects?.name ?? '—'}</span>
                      <Badge variant="outline" className="text-xs">{o.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {Number(o.quantity).toLocaleString('ar')} @ {o.price ? Number(o.price).toFixed(2) : 'سوق'}
                      {o.filled_quantity > 0 && ` · نُفّذ ${Number(o.filled_quantity).toLocaleString('ar')}`}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => cancelM.mutate(o.id)}><X className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!sigCert} onOpenChange={(o) => { if (!o) { setSigCert(null); setExistingSig(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>توقيع رقمي — سند تملك</DialogTitle>
            <DialogDescription>
              {sigCert && (
                <span className="block space-y-1 text-xs">
                  <span className="block">المشروع: <b>{sigCert.project_name}</b></span>
                  <span className="block">رقم السند: <b className="font-mono">{sigCert.certificate_no}</b></span>
                  <span className="block">عدد الأسهم: <b>{Number(sigCert.shares).toLocaleString('ar')}</b></span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {existingSig ? (
            <div className="space-y-3">
              <div className="rounded-lg border bg-white p-2 flex items-center justify-center">
                <img src={existingSig.signature_data_url} alt="signature" className="max-h-32" />
              </div>
              <p className="text-xs text-muted-foreground">
                هذا السند موقّع مسبقاً بتاريخ {new Date(existingSig.signed_at).toLocaleString('ar')}. التوقيع مرتبط برقم السند ولا يقبل التغيير.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSigCert(null); setExistingSig(null); }}>إغلاق</Button>
                <Button size="sm" onClick={reuseExisting}>تنزيل السند موقّعاً</Button>
              </div>
            </div>
          ) : (
            <SignaturePad
              disabled={busy}
              onConfirm={handleConfirm}
              onCancel={() => setSigCert(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
