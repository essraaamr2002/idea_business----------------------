import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Crown, Check, X, Sparkles, Shield, TrendingUp, MessageCircle } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  popular?: boolean;
  features: string[];
  limits: { label: string; value: string }[];
  cta: string;
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "أساسي",
    price: "مجاناً",
    period: "للأبد",
    tagline: "ابدأ رحلتك في عالم الاستثمار والتمويل الجماعي.",
    cta: "ابدأ مجاناً",
    features: [
      "تصفّح كل المشاريع المعروضة",
      "إنشاء مشروع واحد فعّال",
      "محفظة رقمية مع إيداع/سحب",
      "KYC أساسي بالذكاء الاصطناعي",
      "وصول للسوق الثانوي (شراء فقط)",
      "تقارير شهرية مختصرة",
      "دعم عبر البريد (خلال 48 ساعة)",
    ],
    limits: [
      { label: "حدّ الاستثمار", value: "10,000$ شهرياً" },
      { label: "عمولة الشراء", value: "1.5%" },
      { label: "عمولة البيع", value: "2%" },
      { label: "عدد المشاريع", value: "1" },
    ],
  },
  {
    id: "premium",
    name: "بريميوم",
    price: "99 ر.س",
    period: "شهرياً",
    tagline: "للمستثمر النشط ورائد الأعمال الجاد.",
    popular: true,
    cta: "اشترك في بريميوم",
    features: [
      "كل مميزات الباقة الأساسية",
      "إنشاء حتى 5 مشاريع فعّالة",
      "تنبيهات لحظية للأسعار والصفقات",
      "تقارير تحليلية متقدّمة (AI Score, Risk)",
      "أولوية في ظهور مشروعك بالسوق",
      "بيع/شراء في السوق الموازي بدون عمولة",
      "مساعد الذكاء الاصطناعي لصياغة المشاريع",
      "حاسبة ROI و Scorecard متقدّمة",
      "دعم خلال 12 ساعة (بريد + واتساب)",
    ],
    limits: [
      { label: "حدّ الاستثمار", value: "250,000$ شهرياً" },
      { label: "عمولة الشراء (سوق أولي)", value: "0.75%" },
      { label: "عمولة السوق الثانوي", value: "مجاناً" },
      { label: "عدد المشاريع", value: "5" },
    ],
  },
  {
    id: "vip",
    name: "VIP",
    price: "499 ر.س",
    period: "شهرياً",
    tagline: "للمستثمرين المؤسسيين وأصحاب المحافظ الكبيرة.",
    cta: "اشترك في VIP",
    features: [
      "كل مميزات بريميوم",
      "مشاريع غير محدودة",
      "مدير علاقات شخصي مخصّص",
      "وصول مبكر للفرص الحصرية (Pre-IPO)",
      "تحليل احترافي مدفوع لكل صفقة كبرى",
      "دعوة لمزادات خاصة مغلقة",
      "تقارير ضريبية ومالية معتمدة",
      "إعفاء كامل من جميع العمولات",
      "دعم فوري 24/7 (هاتف + واتساب + بريد)",
      "شارة VIP في المجتمع وأولوية في الردود",
    ],
    limits: [
      { label: "حدّ الاستثمار", value: "بلا حدود" },
      { label: "عمولة الشراء", value: "مجاناً" },
      { label: "عمولة السوق الثانوي", value: "مجاناً" },
      { label: "عدد المشاريع", value: "غير محدود" },
    ],
  },
];

const COMPARISON_ROWS: { feature: string; free: string | boolean; premium: string | boolean; vip: string | boolean }[] = [
  { feature: "إنشاء مشاريع", free: "1", premium: "5", vip: "غير محدود" },
  { feature: "حدّ الاستثمار الشهري", free: "10K$", premium: "250K$", vip: "بلا حدود" },
  { feature: "عمولة الشراء (سوق أولي)", free: "1.5%", premium: "0.75%", vip: "مجاناً" },
  { feature: "عمولة السوق الثانوي", free: "2%", premium: "مجاناً", vip: "مجاناً" },
  { feature: "تنبيهات لحظية", free: false, premium: true, vip: true },
  { feature: "تقارير AI متقدّمة", free: false, premium: true, vip: true },
  { feature: "وصول للفرص الحصرية", free: false, premium: false, vip: true },
  { feature: "مدير علاقات شخصي", free: false, premium: false, vip: true },
  { feature: "دعم", free: "بريد", premium: "بريد + واتساب", vip: "24/7 شامل الهاتف" },
];

const FAQS: { q: string; a: string }[] = [
  { q: "هل يمكنني تغيير باقتي لاحقاً؟", a: "نعم — يمكنك الترقية أو التخفيض في أي وقت من إعدادات الحساب، والفرق يُحتسب تناسبياً." },
  { q: "هل تتوفر فترة تجريبية لبريميوم؟", a: "نعم — 14 يوماً تجريبية مجانية لكل مستخدم جديد، دون الحاجة لبطاقة دفع." },
  { q: "ما طرق الدفع المقبولة؟", a: "بطاقات Visa/Mastercard عبر Stripe، بالإضافة إلى Fatora والتحويل البنكي للباقات السنوية." },
  { q: "هل العمولات تشمل الضريبة؟", a: "العمولات المعروضة لا تشمل ضريبة القيمة المضافة (15% في السعودية)؛ تُضاف عند الحساب النهائي." },
  { q: "هل أحصل على خصم سنوي؟", a: "نعم — خصم 20% عند الاشتراك السنوي (يعادل شهرين مجاناً) لكل من بريميوم وVIP." },
];

function CellIcon({ v }: { v: string | boolean }) {
  if (typeof v === "boolean") {
    return v ? <Check className="mx-auto h-4 w-4 text-emerald-500" /> : <X className="mx-auto h-4 w-4 text-muted-foreground/40" />;
  }
  return <span className="text-sm font-semibold">{v}</span>;
}

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "الأسعار والباقات | IDEA BUSINESS" },
      { name: "description", content: "اختر باقة الاستثمار والتمويل الجماعي المناسبة: أساسي مجاني، بريميوم بـ99 ر.س، أو VIP بـ499 ر.س — بدون رسوم خفية." },
      { property: "og:title", content: "الأسعار — IDEA BUSINESS" },
      { property: "og:description", content: "باقات شفّافة لكل مستثمر ورائد أعمال." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-10">
        <PageHeader
          icon={<Crown className="h-6 w-6" />}
          title="الأسعار والباقات"
          subtitle="بسيطة، شفّافة، وبدون رسوم خفية. اختر ما يناسب طموحك."
        />

        {/* PLAN CARDS */}
        <div className="grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-2xl border bg-card/60 p-6 transition hover:shadow-lg ${
                p.popular ? "border-primary shadow-lg shadow-primary/20 md:-translate-y-2" : "border-border"
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 end-4 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-extrabold text-primary-foreground">
                  <Sparkles className="h-3 w-3" /> الأكثر شعبية
                </span>
              )}
              <h3 className="text-xl font-black">{p.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-primary">{p.price}</span>
                <span className="text-xs text-muted-foreground">/ {p.period}</span>
              </div>

              <ul className="mt-5 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-dashed border-border/70 p-3 text-[11px]">
                {p.limits.map((l) => (
                  <div key={l.label}>
                    <div className="text-muted-foreground">{l.label}</div>
                    <div className="font-bold">{l.value}</div>
                  </div>
                ))}
              </div>

              <Link
                to="/membership"
                className={`mt-6 inline-block w-full rounded-md px-4 py-2.5 text-center text-sm font-extrabold ${
                  p.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border hover:border-primary"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* COMPARISON TABLE */}
        <section className="mt-14">
          <h2 className="mb-4 text-2xl font-black">مقارنة تفصيلية بين الباقات</h2>
          <div className="overflow-x-auto rounded-2xl border bg-card/40">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="p-3 text-start font-bold">الميزة</th>
                  <th className="p-3 text-center font-bold">أساسي</th>
                  <th className="p-3 text-center font-bold text-primary">بريميوم</th>
                  <th className="p-3 text-center font-bold">VIP</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={row.feature} className={i % 2 ? "bg-muted/10" : ""}>
                    <td className="p-3 font-semibold">{row.feature}</td>
                    <td className="p-3 text-center"><CellIcon v={row.free} /></td>
                    <td className="p-3 text-center"><CellIcon v={row.premium} /></td>
                    <td className="p-3 text-center"><CellIcon v={row.vip} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            { icon: Shield, t: "ضمان استرداد 14 يوم", d: "إن لم تكن راضياً، نسترد قيمة اشتراكك بدون أسئلة." },
            { icon: TrendingUp, t: "أرباح حقيقية موثّقة", d: "كل صفقة ومحفظة تتم بشفافية كاملة على المنصة." },
            { icon: MessageCircle, t: "دعم بشري حقيقي", d: "فريق دعم ناطق بالعربية مستعد لمساعدتك." },
          ].map((b) => (
            <div key={b.t} className="rounded-2xl border bg-card/60 p-5">
              <b.icon className="h-6 w-6 text-primary" />
              <div className="mt-2 font-extrabold">{b.t}</div>
              <p className="mt-1 text-xs text-muted-foreground">{b.d}</p>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section className="mt-14">
          <h2 className="mb-4 text-2xl font-black">أسئلة شائعة عن الباقات</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-xl border bg-card/60 p-4">
                <div className="font-bold">{f.q}</div>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            لديك سؤال آخر؟ <Link to="/faq" className="font-extrabold text-primary hover:underline">شاهد كل الأسئلة الشائعة</Link>
            {" أو "}
            <Link to="/support" className="font-extrabold text-primary hover:underline">تواصل مع الدعم</Link>.
          </div>
        </section>
      </main>
    </div>
  );
}
