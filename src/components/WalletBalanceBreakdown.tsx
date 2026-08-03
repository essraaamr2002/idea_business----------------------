import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock, Wallet as WalletIcon, ArrowRight, Loader2 } from "lucide-react";
import { getMyHoldsBreakdown } from "@/lib/wallet-breakdown.functions";

type Props = { balanceMinor: number; heldMinor: number; currency: string };

function fmt(m: number, c: string) {
  return `${(m / 100).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`;
}

export function WalletBalanceBreakdown({ balanceMinor, heldMinor, currency }: Props) {
  const fn = useServerFn(getMyHoldsBreakdown);
  const { data, isFetching } = useQuery({
    queryKey: ["wallet-holds-breakdown"],
    queryFn: () => fn({}),
    refetchInterval: 30_000,
  });

  const available = Math.max(0, balanceMinor - heldMinor);
  const holds: any[] = (data as any)?.holds ?? [];

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <WalletIcon className="h-4 w-4 text-primary" /> تفصيل الرصيد
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-card/50 p-3">
            <div className="text-[10px] text-muted-foreground">إجمالي</div>
            <div className="text-lg font-black num">{fmt(balanceMinor, currency)}</div>
          </div>
          <div className="rounded-lg border border-success/30 bg-success/5 p-3">
            <div className="text-[10px] text-muted-foreground">متاح للاستخدام</div>
            <div className="text-lg font-black num text-success">{fmt(available, currency)}</div>
          </div>
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
            <div className="text-[10px] text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> محجوز</div>
            <div className="text-lg font-black num text-warning">{fmt(heldMinor, currency)}</div>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold mb-2">تفصيل المبالغ المحجوزة</div>
          {isFetching && holds.length === 0 ? (
            <div className="py-4 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>
          ) : holds.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">لا توجد مبالغ محجوزة حالياً ✓</div>
          ) : (
            <div className="space-y-2">
              {holds.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{h.kind_ar ?? h.kind}</Badge>
                      <span className="font-bold num">{fmt(h.amount_minor, currency)}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 truncate">
                      {h.note ?? h.reference ?? "—"}
                      {h.created_at && ` · ${new Date(h.created_at).toLocaleDateString("ar-SA")}`}
                    </div>
                  </div>
                  {h.link && (
                    <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                      <Link to={h.link as any}>التفاصيل <ArrowRight className="h-3 w-3" /></Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/wallet/history">سجل العمليات الكامل <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
