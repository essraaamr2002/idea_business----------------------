import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { startNegotiation, counterOffer, respondToNegotiation } from '@/lib/negotiations.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Handshake, Check, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export function NegotiationPanel({ projectId, negotiation, currentUserId }: { projectId: string; negotiation?: any; currentUserId?: string }) {
  const start = useServerFn(startNegotiation);
  const counter = useServerFn(counterOffer);
  const respond = useServerFn(respondToNegotiation);

  const [amount, setAmount] = useState('');
  const [equity, setEquity] = useState('');
  const [terms, setTerms] = useState('');

  const canRespond = negotiation && negotiation.status === 'open' && negotiation.current_offer_by !== currentUserId;

  const handle = async (fn: () => Promise<any>, msg = 'تم') => {
    try { await fn(); toast.success(msg); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Handshake className="h-5 w-5" /> تفاوض</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {negotiation && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p>الجولة <strong>{negotiation.round_number}</strong> من 10</p>
            <p>العرض الحالي: <strong>{Number(negotiation.current_offer_amount).toLocaleString('ar')}</strong></p>
            {negotiation.proposed_equity_pct && <p>الحصة: {negotiation.proposed_equity_pct}%</p>}
            <p className="text-xs text-muted-foreground">الحالة: {negotiation.status}</p>
          </div>
        )}

        <div className="grid gap-2">
          <Input type="number" placeholder="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input type="number" placeholder="الحصة % (اختياري)" value={equity} onChange={(e) => setEquity(e.target.value)} />
          <Textarea placeholder="الشروط (اختياري)" value={terms} onChange={(e) => setTerms(e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-2">
          {!negotiation && (
            <Button onClick={() => handle(() => start({ data: { project_id: projectId, amount: Number(amount), equity_pct: equity ? Number(equity) : undefined, terms } }), 'تم بدء التفاوض')}>
              ابدأ التفاوض
            </Button>
          )}
          {canRespond && (
            <>
              <Button onClick={() => handle(() => counter({ data: { negotiation_id: negotiation.id, amount: Number(amount), equity_pct: equity ? Number(equity) : undefined, terms } }), 'تم إرسال العرض المضاد')}>
                <RotateCcw className="h-4 w-4 ml-1" /> عرض مضاد
              </Button>
              <Button variant="default" onClick={() => handle(() => respond({ data: { negotiation_id: negotiation.id, action: 'accept' } }), 'تم القبول')}>
                <Check className="h-4 w-4 ml-1" /> قبول
              </Button>
              <Button variant="destructive" onClick={() => handle(() => respond({ data: { negotiation_id: negotiation.id, action: 'reject' } }), 'تم الرفض')}>
                <X className="h-4 w-4 ml-1" /> رفض
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
