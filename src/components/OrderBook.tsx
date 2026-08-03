import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getOrderBook } from '@/lib/trading.functions';

export function OrderBook({ projectId }: { projectId: string }) {
  const fn = useServerFn(getOrderBook);
  const [book, setBook] = useState<{ bids: any[]; asks: any[] }>({ bids: [], asks: [] });

  useEffect(() => {
    const tick = () => fn({ data: { project_id: projectId, depth: 10 } }).then(setBook).catch(() => {});
    tick();
    const id = setInterval(tick, 3000);
    return () => clearInterval(id);
  }, [projectId, fn]);

  const maxQty = Math.max(...book.bids.map((b: any) => b.quantity), ...book.asks.map((a: any) => a.quantity), 1);
  const bestBid = book.bids[0]?.price ?? 0;
  const bestAsk = book.asks[0]?.price ?? 0;
  const spread = bestAsk - bestBid;

  return (
    <div className="rounded-2xl border bg-card p-3 text-xs">
      <div className="flex items-center justify-between mb-2 font-semibold">
        <span>دفتر الأوامر</span>
        <span className="text-muted-foreground">السبريد: {spread.toFixed(2)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-emerald-600 font-bold mb-1">طلبات الشراء</div>
          {book.bids.length === 0 && <div className="text-muted-foreground py-2">—</div>}
          {book.bids.map((b: any, i) => (
            <div key={i} className="relative flex justify-between py-1">
              <div className="absolute inset-y-0 right-0 bg-emerald-500/15" style={{ width: `${(b.quantity / maxQty) * 100}%` }} />
              <span className="relative">{Number(b.quantity).toLocaleString('ar')}</span>
              <span className="relative text-emerald-600 font-mono">{Number(b.price).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-red-600 font-bold mb-1">طلبات البيع</div>
          {book.asks.length === 0 && <div className="text-muted-foreground py-2">—</div>}
          {book.asks.map((a: any, i) => (
            <div key={i} className="relative flex justify-between py-1">
              <div className="absolute inset-y-0 left-0 bg-red-500/15" style={{ width: `${(a.quantity / maxQty) * 100}%` }} />
              <span className="relative text-red-600 font-mono">{Number(a.price).toFixed(2)}</span>
              <span className="relative">{Number(a.quantity).toLocaleString('ar')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
