import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, DollarSign, TrendingUp, Award, Users, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/ambassadors-plus")({
  head: () => ({
    meta: [
      { title: "برنامج السفراء+ — عمولة دائمة على إحالاتك" },
      { name: "description", content: "انضم لبرنامج السفراء+ واحصل على ١٥٪ عمولة دائمة من كل عضوية تتم بدعوتك." },
      { property: "og:title", content: "السفراء+ من IDEA BUSINESS" },
      { property: "og:description", content: "عمولة دائمة + شارات حصرية + ترقية تلقائية." },
    ],
  }),
  component: AmbassadorsPlusPage,
});

const TIERS = [
  { name: "سفير", min: 0, commission: "٥٪", color: "from-slate-400 to-slate-600", perks: ["رابط مخصص", "لوحة إحصاءات"] },
  { name: "سفير فضي", min: 10, commission: "٨٪", color: "from-slate-300 to-slate-500", perks: ["+ سحوبات شهرية", "شارة فضية"] },
  { name: "سفير ذهبي", min: 25, commission: "١٢٪", color: "from-amber-400 to-yellow-600", perks: ["+ ترقية عضوية مدى الحياة", "أولوية دعم"] },
  { name: "سفير ماسي", min: 75, commission: "١٥٪", color: "from-cyan-400 to-blue-600", perks: ["+ دعوات لفعاليات حصرية", "حصة في صندوق المكافآت"] },
];

function AmbassadorsPlusPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader
          icon={<Crown className="h-6 w-6" />}
          title="السفراء+ — اربح معنا، عمولة دائمة"
          subtitle="حوّل شغفك بIDEA BUSINESS إلى دخل متكرر. كل عضوية تتم بدعوتك تمنحك نسبة شهرية مدى استمرار اشتراك المُحال."
        />

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Feature icon={<DollarSign />} title="عمولة شهرية متكررة" desc="حتى ١٥٪ مدى استمرار اشتراك العضو" />
          <Feature icon={<TrendingUp />} title="مستويات تصاعدية" desc="كلما زاد عدد إحالاتك زادت نسبتك تلقائياً" />
          <Feature icon={<Award />} title="مزايا حصرية" desc="شارات، فعاليات، وأولوية دعم" />
        </div>

        <h2 className="mb-4 text-xl font-black">المستويات والمزايا</h2>
        <div className="mb-10 grid gap-4 md:grid-cols-4">
          {TIERS.map((t) => (
            <Card key={t.name} className="overflow-hidden border-border/60">
              <div className={`bg-gradient-to-br ${t.color} p-4 text-center text-black`}>
                <Crown className="mx-auto h-6 w-6" />
                <div className="mt-1 font-black">{t.name}</div>
                <div className="text-2xl font-black">{t.commission}</div>
                <div className="text-xs opacity-80">{t.min}+ إحالة نشطة</div>
              </div>
              <CardContent className="p-4">
                <ul className="space-y-1.5 text-xs">
                  {t.perks.map((p) => (
                    <li key={p} className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-verified" />
                      {p}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-amber-500/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-black">جاهز للانطلاق؟</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                ابدأ من المستوى الأول مجاناً — احصل على رابطك واربح من أول إحالة.
              </p>
            </div>
            <Link to="/referrals">
              <Button size="lg" className="font-extrabold">
                <Crown className="me-2 h-4 w-4" />
                انضم لبرنامج السفراء+
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="font-extrabold">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}
