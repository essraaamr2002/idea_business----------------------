import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Trophy, Sparkles, Crown } from "lucide-react";
import { CertificateGenerator } from "@/components/CertificateGenerator";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/certificates")({
  head: () => ({
    meta: [
      { title: "شهاداتي — تكريم على إنجازاتك | IDEA BUSINESS" },
      { name: "description", content: "حمّل شهادات تقدير PDF عالية الدقة لكل إنجاز حقّقته على المنصة." },
    ],
  }),
  component: CertificatesPage,
});

const TEMPLATES = [
  { id: "first-investment", title: "أول استثمار",          icon: <Sparkles />, desc: "أكملت أول استثمار لك" },
  { id: "5-referrals",     title: "خمس إحالات ناجحة",     icon: <Crown />,    desc: "دعوت ٥ أصدقاء" },
  { id: "first-project",    title: "إطلاق أول مشروع",      icon: <Trophy />,   desc: "أطلقت مشروعك الأول" },
  { id: "community-star",   title: "نجم المجتمع",          icon: <Award />,    desc: "تفاعل بنّاء متميّز" },
];

function CertificatesPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<typeof TEMPLATES[0] | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    setName((user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "");
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader
          icon={<Award className="h-6 w-6" />}
          title="شهادات الإنجاز"
          subtitle="حمّل شهادات احترافية تكريماً لإنجازاتك على المنصة — جاهزة للطباعة والمشاركة."
        />

        {!selected ? (
          <div className="grid gap-4 md:grid-cols-2">
            {TEMPLATES.map((t) => (
              <Card key={t.id} className="cursor-pointer transition hover:border-primary/40" onClick={() => setSelected(t)}>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white">
                    {t.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold">{t.title}</div>
                    <div className="text-xs text-muted-foreground">{t.desc}</div>
                  </div>
                  <Button size="sm" variant="outline">اختر</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>← الشهادات</Button>
            <Card>
              <CardContent className="space-y-3 p-5">
                <label className="block text-sm font-bold">الاسم على الشهادة</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اكتب اسمك الكامل"
                  className="w-full rounded-md border border-border bg-background px-3 py-2"
                />
              </CardContent>
            </Card>
            <CertificateGenerator recipientName={name || "—"} achievement={selected.desc} />
          </div>
        )}
      </main>
    </div>
  );
}
