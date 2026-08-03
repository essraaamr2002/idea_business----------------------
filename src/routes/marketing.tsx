import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Calendar, RotateCcw, Image as ImageIcon, FlaskConical, Megaphone } from "lucide-react";

export const Route = createFileRoute("/marketing")({
  head: () => ({
    meta: [
      { title: "حملات التسويق التلقائي | IDEA BUSINESS" },
      { name: "description", content: "سلاسل بريدية ترحيبية، نشرة أسبوعية، حملات استرداد، صور مشاركة تلقائية، وتجارب A/B." },
    ],
  }),
  component: MarketingHub,
});

const CAMPAIGNS = [
  {
    icon: <Mail />,
    title: "سلسلة الترحيب — ٧ أيام",
    desc: "ٍ٧ رسائل ذكية تُرسَل تلقائياً بعد التسجيل لشرح المنصة وتفعيل أول استثمار.",
    schedule: ["اليوم ٠: ترحيب + كود هدية", "اليوم ١: كيف تختار مشروعاً", "اليوم ٣: قصص نجاح", "اليوم ٥: شرح الضمانات", "اليوم ٧: عرض الترقية"],
    status: "نشطة",
  },
  {
    icon: <Calendar />,
    title: "نشرة أسبوعية — أفضل ٥ مشاريع",
    desc: "كل جمعة، يستلم المشتركون أفضل ٥ مشاريع بترتيب الإقبال والعائد المتوقع.",
    schedule: ["كل جمعة ٩ صباحاً", "تحرير آلي حسب نشاط المستخدم", "إلغاء اشتراك بنقرة"],
    status: "نشطة",
  },
  {
    icon: <RotateCcw />,
    title: "حملة استرداد — Win-back",
    desc: "إذا لم يدخل المستخدم منذ ٣٠ يوماً، يصله بريد بكوبون رجوع + ملخص ما فاته.",
    schedule: ["تشغيل آلي بعد ٣٠ يوم خمول", "كوبون ٢٠٪", "تذكير بعد ٧ أيام إن لم يُفتح"],
    status: "نشطة",
  },
  {
    icon: <ImageIcon />,
    title: "OG Image تلقائي لكل مشروع",
    desc: "صورة مشاركة احترافية تُولَّد تلقائياً لكل مشروع تحمل الشعار واسم المؤسس والتمويل المطلوب.",
    schedule: ["تُحدَّث عند تغيّر نسبة التمويل", "1200×630 px مُحسَّنة لكل المنصات"],
    status: "نشطة",
  },
  {
    icon: <FlaskConical />,
    title: "تجارب A/B للأزرار الرئيسية",
    desc: "نختبر صياغات CTA المختلفة تلقائياً ونعرض الأفضل أداءً.",
    schedule: ["تخصيص مستخدم سرّي", "قياس CTR تلقائي", "تطبيق الفائز بعد ٧ أيام"],
    status: "تجريبية",
  },
];

function MarketingHub() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader
          icon={<Megaphone className="h-6 w-6" />}
          title="مركز الحملات التسويقية"
          subtitle="حملات تلقائية مدمجة في المنصة لجلب المستخدمين، تفعيلهم، والاحتفاظ بهم."
        />

        <div className="grid gap-4 md:grid-cols-2">
          {CAMPAIGNS.map((c) => (
            <Card key={c.title} className="border-border/60">
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{c.icon}</div>
                    <div>
                      <div className="font-extrabold">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{c.desc}</div>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-black ${c.status === "نشطة" ? "bg-green-verified/15 text-green-verified" : "bg-amber-500/15 text-amber-600"}`}>
                    {c.status}
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {c.schedule.map((s) => (<li key={s}>• {s}</li>))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
          <div className="font-black">تريد حملة مخصصة لمنتجك؟</div>
          <p className="mt-1 text-sm text-muted-foreground">تواصل مع فريق النمو لإطلاق حملة تخصّك.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link to="/contact" className="rounded-lg bg-primary px-5 py-2 font-extrabold text-primary-foreground hover:opacity-90">تواصل معنا</Link>
            <Link to="/referrals" className="rounded-lg border border-border px-5 py-2 font-extrabold hover:bg-foreground/5">ابدأ بإحالة الأصدقاء</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
