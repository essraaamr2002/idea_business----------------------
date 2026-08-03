import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Gift, ArrowDownToLine } from "lucide-react";
import { useEffect, useState } from "react";

const K = "rewards_wallet_v1";
type W = { points: number; cashbackUSD: number; history: { ts: number; type: string; amount: number }[] };
const load = (): W => { try { return JSON.parse(localStorage.getItem(K) || "") } catch { return { points: 1240, cashbackUSD: 18.5, history: [] } } };

export const Route = createFileRoute("/rewards-wallet")({
  head: () => ({ meta: [{ title: "محفظة المكافآت — IDEA BUSINESS" }] }),
  component: RewardsWallet,
});

function RewardsWallet() {
  const [w, setW] = useState<W>({ points: 0, cashbackUSD: 0, history: [] });
  useEffect(() => { setW(load()); }, []);
  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 space-y-6">
      <h1 className="text-3xl font-black flex items-center gap-2"><Wallet className="h-7 w-7 text-primary" /> محفظة المكافآت</h1>
      <p className="text-sm text-muted-foreground">محفظة منفصلة عن رصيدك الاستثماري — استخدمها لتخفيض الاشتراكات أو سحب الكاش باك.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" /> نقاط الولاء</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-black">{w.points.toLocaleString("ar")}</div>
            <Button className="mt-3 w-full" asChild><Link to="/loyalty/shop">استبدل النقاط</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ArrowDownToLine className="h-5 w-5" /> كاش باك 2%</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-black">${w.cashbackUSD.toFixed(2)}</div>
            <p className="mt-1 text-xs text-muted-foreground">2% كاش باك على كل استثمار ناجح.</p>
            <Button className="mt-3 w-full" variant="outline" disabled={w.cashbackUSD < 10}>سحب (الحد الأدنى $10)</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
