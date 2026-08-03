import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Crown, TrendingUp, Users } from "lucide-react";
import { GoldReferralBadge } from "@/components/GoldReferralBadge";

export const Route = createFileRoute("/honor-board")({
  head: () => ({
    meta: [
      { title: "لوحة الشرف الشهرية | IDEA BUSINESS" },
      { name: "description", content: "أبرز المستثمرين، المؤسسين، والداعمين هذا الشهر." },
    ],
  }),
  component: HonorBoard,
});

const INVESTORS = [
  { n: "أبو_الفوارس", v: "١٢ مشروع · ٣٢٠ ألف ر.س" },
  { n: "سارة_VC", v: "٩ مشاريع · ٢١٠ ألف ر.س" },
  { n: "Khalid.M", v: "٧ مشاريع · ١٧٠ ألف ر.س" },
];
const FOUNDERS = [
  { n: "مطعم الواحة", v: "اكتمل التمويل في ٤ أيام" },
  { n: "تطبيق سار", v: "٢٤ مستثمراً جديداً" },
  { n: "مزرعة الفرسان", v: "+٤٢٪ عائد متوقع" },
];
const REFERRERS = [
  { n: "نوال_الاستثمار", v: "٤٢ إحالة ناجحة" },
  { n: "Founder_X", v: "٣١ إحالة ناجحة" },
  { n: "محمد_العتيبي", v: "٢٥ إحالة ناجحة" },
];

function HonorBoard() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader
          icon={<Trophy className="h-6 w-6" />}
          title="لوحة الشرف — هذا الشهر"
          subtitle="تكريمٌ للأكثر تأثيراً ونشاطاً في IDEA BUSINESS."
        />

        <div className="grid gap-5 md:grid-cols-3">
          <BoardColumn
            title="أبرز المستثمرين"
            icon={<TrendingUp className="h-5 w-5" />}
            items={INVESTORS}
            accent="from-green-500/20 to-emerald-500/10"
          />
          <BoardColumn
            title="أبرز المؤسسين"
            icon={<Users className="h-5 w-5" />}
            items={FOUNDERS}
            accent="from-blue-500/20 to-cyan-500/10"
          />
          <BoardColumn
            title="أبرز المُحيلين"
            icon={<Crown className="h-5 w-5" />}
            items={REFERRERS}
            accent="from-amber-500/20 to-yellow-500/10"
            withBadge
          />
        </div>

        <p className="mt-8 rounded-lg bg-muted/40 p-3 text-center text-xs text-muted-foreground">
          تُحدَّث اللوحة آخر يوم من كل شهر. شارك بنشاطك للظهور هنا الشهر القادم.
        </p>
      </main>
    </div>
  );
}

function BoardColumn({ title, icon, items, accent, withBadge }: {
  title: string; icon: React.ReactNode; items: { n: string; v: string }[]; accent: string; withBadge?: boolean;
}) {
  return (
    <Card className={`overflow-hidden bg-gradient-to-br ${accent} border-border/60`}>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-2 font-black">
          {icon} {title}
        </div>
        <ol className="space-y-2">
          {items.map((u, i) => (
            <li key={u.n} className="flex items-start gap-2 rounded-lg bg-card/70 p-3 backdrop-blur">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-black">
                {i + 1}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-extrabold">@{u.n} {withBadge && <GoldReferralBadge rank={i + 1} />}</div>
                <div className="text-xs text-muted-foreground">{u.v}</div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
