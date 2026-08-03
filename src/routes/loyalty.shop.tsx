import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Sparkles, Zap, Star, BadgePercent, Crown, Lock, Gift } from "lucide-react";
import { getPoints, spendPoints } from "@/lib/loyalty";
import { toast } from "sonner";

export const Route = createFileRoute("/loyalty/shop")({
  head: () => ({
    meta: [
      { title: "متجر المكافآت — استبدل نقاطك | IDEA BUSINESS" },
      { name: "description", content: "استبدل نقاط الولاء بمزايا حقيقية: تمييز إعلان، خصم على الرسوم، أو ترقية مؤقتة." },
    ],
  }),
  component: ShopPage,
});

const REWARDS = [
  { id: "boost-ad",  icon: <Zap />,         title: "تمييز إعلانك ٧ أيام",          desc: "اظهر في أعلى السوق",         cost: 300 },
  { id: "fee-5",     icon: <BadgePercent />,title: "خصم ٥٪ على رسوم منصة",        desc: "صالح لعملية واحدة",          cost: 500 },
  { id: "fee-10",    icon: <BadgePercent />,title: "خصم ١٠٪ على رسوم منصة",       desc: "صالح لعملية واحدة",          cost: 900 },
  { id: "upgrade-7", icon: <Sparkles />,    title: "ترقية عضوية كاملة ٧ أيام",     desc: "كل المزايا مفتوحة",          cost: 1200 },
  { id: "verified",  icon: <Star />,        title: "شارة موثّق مميّز ٣٠ يوم",       desc: "ظهور أعلى في القوائم",       cost: 1500 },
  { id: "vip-month", icon: <Crown />,        title: "عضوية VIP لمدة شهر",          desc: "وصول حصري + أولوية دعم",     cost: 3500 },
];

function ShopPage() {
  const [pts, setPts] = useState(0);
  useEffect(() => { setPts(getPoints()); }, []);

  const redeem = (id: string, cost: number, label: string) => {
    if (!spendPoints(cost)) {
      toast.error("نقاطك لا تكفي — أكمل المهام اليومية");
      return;
    }
    setPts(getPoints());
    toast.success(`تم الاستبدال: ${label}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader
          icon={<ShoppingBag className="h-6 w-6" />}
          title="متجر المكافآت"
          subtitle="استبدل نقاطك بمزايا حقيقية تخدم نشاطك في المنصة."
        />

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="font-black">رصيدك:</span>
          <span className="font-black tabular-nums text-amber-600">{pts.toLocaleString("ar")} نقطة</span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {REWARDS.map((r) => {
            const can = pts >= r.cost;
            return (
              <Card key={r.id} className={can ? "border-primary/30" : "opacity-80"}>
                <CardContent className="p-5">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {r.icon}
                  </div>
                  <div className="font-extrabold">{r.title}</div>
                  <div className="mb-3 text-xs text-muted-foreground">{r.desc}</div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-black text-amber-600">
                      {r.cost.toLocaleString("ar")} نقطة
                    </span>
                    <Button size="sm" disabled={!can} onClick={() => redeem(r.id, r.cost, r.title)}>
                      {can ? <><Gift className="me-1 h-3 w-3" /> استبدل</> : <><Lock className="me-1 h-3 w-3" /> غير كافٍ</>}
                    </Button>
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
