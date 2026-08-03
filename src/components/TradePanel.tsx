import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { placeOrder } from '@/lib/trading.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function TradePanel({ projectId, currentPrice }: { projectId: string; currentPrice: number }) {
  const fn = useServerFn(placeOrder);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [type, setType] = useState<'market' | 'limit'>('limit');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState(String(currentPrice));
  const [busy, setBusy] = useState(false);

  const total = (Number(qty) || 0) * (Number(price) || currentPrice);
  const fee = total * 0.005;

  const submit = async () => {
    setBusy(true);
    try {
      const r: any = await fn({ data: {
        project_id: projectId, side, type, quantity: Number(qty),
        price: type === 'limit' ? Number(price) : undefined,
      } });
      toast.success(`تم: نُفّذ ${Number(r?.filled ?? 0).toLocaleString('ar')} سهم`);
      setQty('');
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">لوحة التداول</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={side} onValueChange={(v) => setSide(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"><TrendingUp className="h-4 w-4 ml-1" /> شراء</TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-red-500 data-[state=active]:text-white"><TrendingDown className="h-4 w-4 ml-1" /> بيع</TabsTrigger>
          </TabsList>
          <TabsContent value={side} className="space-y-3 mt-3">
            <div>
              <Label>نوع الأمر</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">سوق (تنفيذ فوري)</SelectItem>
                  <SelectItem value="limit">محدد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الكمية</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="عدد الأسهم" />
            </div>
            {type === 'limit' && (
              <div>
                <Label>السعر</Label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            )}
            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
              <div className="flex justify-between"><span>المجموع:</span><span>{total.toLocaleString('ar', { maximumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between"><span>العمولة (0.5%):</span><span>{fee.toLocaleString('ar', { maximumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between font-bold"><span>الإجمالي:</span><span>{(total + fee).toLocaleString('ar', { maximumFractionDigits: 2 })}</span></div>
            </div>
            <Button className="w-full" disabled={busy || !qty} onClick={submit} variant={side === 'buy' ? 'default' : 'destructive'}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (side === 'buy' ? 'شراء' : 'بيع')}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">⚠️ التداول ينطوي على مخاطر — هذه ليست نصيحة استثمارية</p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
