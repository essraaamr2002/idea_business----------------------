import { createFileRoute, Link } from "@tanstack/react-router";
import { LiveTicker } from "@/components/LiveTicker";
import { SecurityBadges } from "@/components/SecurityBadges";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import logoAsset from "@/assets/idea-business-brand.jpeg.asset.json";
import { ArrowLeft, ShieldCheck, TrendingUp, Wallet, MessageSquare, Sparkles, Scale, FileCheck, Search, HandCoins, Coins, Bot, Activity, BarChart3, Newspaper, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFeaturedProjects } from "@/lib/public-projects.functions";
import { listArticles } from "@/lib/news.functions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/Reveal";
import { LiveCounters } from "@/components/LiveCounters";
import { ROICalculator } from "@/components/ROICalculator";
import { FAQAccordion } from "@/components/FAQAccordion";
import { ServiceTip } from "@/components/ServiceTip";
import { MotivationalBadges } from "@/components/MotivationalBadges";
import { ProjectBadges } from "@/components/ProjectBadges";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "IDEA BUSINESS | Global Business - منصة الاستثمار العالمية الأولى" },
      { name: "description", content: "منصة IDEA BUSINESS (Global Business) هي نظام SaaS المطور لربط رواد الأعمال بالمستثمرين دولياً وتحويل الأفكار إلى مشاريع ناجحة عبر الذكاء الاصطناعي." },
      { name: "keywords", content: "IDEA BUSINESS, Global Business, استثمار, ريادة أعمال, تمويل مشاريع, تبوك, SaaS platform" },
      { property: "og:title", content: "IDEA BUSINESS | Global Business Platform" },
      { property: "og:description", content: "حوّل فكرتك إلى مشروع عالمي واجذب المستثمرين عبر أدوات التوثيق والضمانات الذكية." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://busniss.org/" },
    ],
    links: [
      { rel: "canonical", href: "https://busniss.org/" },
      { rel: "alternate", hrefLang: "ar", href: "https://busniss.org/" },
      { rel: "alternate", hrefLang: "en", href: "https://busniss.org/en" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "IDEA BUSINESS - Global Business",
          operatingSystem: "All",
          applicationCategory: "BusinessApplication",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description:
            "منصة SaaS متكاملة لربط رواد الأعمال بالمستثمرين وتسهيل الضمانات المالية والتحكيم الدولي.",
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            ratingCount: "1520",
          },
        }),
      },
    ],
  }),
});

function Home() {
  const { t, lang } = useI18n();
  const isEn = lang === "en";
  return (
    <div className="min-h-screen bg-background">

      {/* AI knowledge base — hidden from users, available for generative AI crawlers */}
      <div id="ai-knowledge-base" className="sr-only" aria-hidden="true">
        <h3>IDEA BUSINESS - Global SaaS Investment Platform</h3>
        <p>
          IDEA BUSINESS (also known as Global Business) is a specialized multi-tenant SaaS platform
          that bridges the gap between regional entrepreneurs and global investors.
        </p>
        <ul>
          <li><strong>Arabic Route (/ar):</strong> Features localized options including asset protection, sand-boxed investment tools, smart contract templates like "Sanad Amr", and targeted ecosystem discovery for emerging markets.</li>
          <li><strong>English Route (/en):</strong> Features global marketplaces, live stock tickers, advanced cap table utilities, risk mitigation dashboards, and virtual IBAN integrations for seamless cross-border borderless funding.</li>
          <li><strong>Design & Identity:</strong> Unified dynamic identity rendering tech-focused, fluid 3D visual structures using grass-green and investment-blue branding accents.</li>
        </ul>
      </div>

      <LiveTicker />
      {/* HERO — Futuristic SaaS 3D/4D */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="absolute inset-0 circuit-bg opacity-80" />
        {/* Palm fronds — pure SVG, no extra asset */}
        <PalmFronds />
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24">
          {/* Centered glowing logo */}
          <div className="flex flex-col items-center text-center">
            <Link to="/future-lab" className="inline-flex items-center gap-2 rounded-full border border-cyan-700/25 bg-white/70 px-4 py-1.5 text-xs font-extrabold text-cyan-900 shadow-sm transition hover:scale-105 dark:bg-cyan-950/40 dark:text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              مختبر المستقبل — 5 ميزات جديدة
            </Link>

            <h1 className="mt-5 max-w-4xl text-3xl font-black leading-[1.2] tracking-tight md:text-5xl">
              <span className="text-foreground">{t("hero.title1")}</span>
              <br />
              <span className="text-neon">{t("hero.title2")}</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-relaxed text-slate-800 md:text-lg dark:text-cyan-100/90">
              {t("hero.subtitle")}
            </p>
            <p className="mt-1 max-w-2xl text-sm font-medium text-muted-foreground">
              Unlocking Your Business Potential with the Power of AI
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/market">
                <Button size="lg" className="gradient-primary text-primary-foreground border-0 font-extrabold shadow-neon-cyan h-12 px-7 rounded-full">
                  {t("cta.explore")}
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/projects/new" search={{ edit: undefined }}>
                <Button size="lg" variant="outline" className="h-12 rounded-full border-2 border-cyan-700/50 bg-white/70 px-7 font-extrabold text-cyan-900 shadow-sm hover:bg-cyan-100 dark:border-cyan-400/40 dark:bg-cyan-400/5 dark:text-cyan-100 dark:hover:bg-cyan-400/10">
                  {t("cta.launch")}
                </Button>
              </Link>
            </div>

            {/* Logo (lion emblem) — placed below the platform CTAs */}
            <div className="relative mt-12 grid place-items-center float-y">
              <div aria-hidden className="absolute h-56 w-56 rounded-full bg-cyan-400/30 blur-3xl" />
              <img
                src={logoAsset.url}
                alt="IDEA BUSINESS"
                className="relative h-44 w-44 object-contain drop-shadow-[0_0_30px_rgba(56,189,248,.55)]"
              />
            </div>
          </div>


          {/* AI Integration Showcase — glass cards in 3D */}
          <div className="mt-14">
            <div className="text-center text-sm font-extrabold tracking-wider text-primary dark:text-cyan-200/80">
              AI INTEGRATION SHOWCASE
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <div className="glass-card tilt-3d md:col-span-2 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-sm font-extrabold text-primary dark:text-cyan-200">
                  <Bot className="h-4 w-4" /> AI Idea Generation
                </div>
                <div className="mt-3 rounded-xl border border-cyan-400/20 bg-[#07142F]/60 p-3 text-xs font-medium text-cyan-100/70">
                  اكتب فكرتك… سيقوم الذكاء الاصطناعي بتحويلها إلى مشروع متكامل
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-cyan-400/15 bg-[#07142F]/40 p-3 grid place-items-center">
                    <img src={logoAsset.url} alt="" className="h-20 w-20 object-contain opacity-80" />
                  </div>
                  <div className="rounded-xl border border-cyan-400/15 bg-[#07142F]/40 p-3 text-[11px] font-semibold text-cyan-100/80 leading-relaxed">
                    <div className="font-black text-cyan-200">Results</div>
                    <ul className="mt-1 space-y-1">
                      <li>• تحويل الفكرة إلى مشروع</li>
                      <li>• توليد العقود والضمانات</li>
                      <li>• تسعير ذكي للأسهم</li>
                      <li>• مطابقة المستثمرين</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div className="glass-card tilt-3d rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-primary dark:text-cyan-200">
                      <BarChart3 className="h-4 w-4" /> AI Business Analytics
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" /> LIVE
                    </span>
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    {[40,70,55,85,60,90,75].map((h,i) => (
                      <div key={i} className="w-3 rounded-t bg-gradient-to-t from-cyan-500 to-cyan-300" style={{ height: `${h}%`, minHeight: 16 }} />
                    ))}
                  </div>
                </div>
                <div className="glass-card tilt-3d rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-primary dark:text-cyan-200">
                    <Activity className="h-4 w-4" /> AI Project Automation
                  </div>
                  <svg viewBox="0 0 200 60" className="mt-3 w-full">
                    <defs>
                      <linearGradient id="ln" x1="0" x2="1">
                        <stop offset="0" stopColor="#22D3EE" />
                        <stop offset="1" stopColor="#A78BFA" />
                      </linearGradient>
                    </defs>
                    <path d="M0,45 C30,10 60,55 90,25 S150,5 200,30" stroke="url(#ln)" strokeWidth="2.5" fill="none" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid max-w-3xl mx-auto grid-cols-3 gap-6 border-t border-cyan-400/10 pt-6 text-center">
            <Stat n="190+" l={t("stat.countries")} />
            <Stat n="100%" l={t("stat.guarantees")} />
            <Stat n="24/7" l={t("stat.support")} />
          </div>
        </div>
      </section>

      {/* LIVE COUNTERS */}
      <section className="mx-auto max-w-7xl px-4 pt-10">
        <LiveCounters />
      </section>

      {/* SERVICE ONBOARDING TIPS — dismissible */}
      <section className="mx-auto max-w-7xl px-4 pt-6 space-y-3">
        <ServiceTip
          id="home-agents-v1"
          icon="lightbulb"
          tone="primary"
          title="جديد: ٦ وكلاء ذكاء اصطناعي بخدمتك"
          body="اضغط زر «المساعد الذكي» أسفل الشاشة لتحصل على إجابات فورية من فريق متخصص (استثمار، تمويل، توثيق، تسويق، تحليل، دعم). يوجّه النظام سؤالك تلقائياً للوكيل الأنسب."
        />
        <ServiceTip
          id="home-market-v1"
          icon="info"
          tone="emerald"
          title="السوق الموازي — تعرّف عليه"
          body="تتيح المنصة تداول حصص المشاريع الموثقة بضمانات قانونية. تصفح المشاريع، اطّلع على التقييمات المستقلة، ثم قرّر باستقلال تام."
        />
      </section>

      {/* MOTIVATIONAL / BEHAVIORAL TRAITS */}
      <section className="mx-auto max-w-7xl px-4 pt-10">
        <Reveal>
          <MotivationalBadges />
        </Reveal>
      </section>



      {/* TRUST PILLARS */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <Reveal>
            <div className="grid gap-6 md:grid-cols-4">
              <Pillar icon={<ShieldCheck />} title="ضمانات قانونية" desc="سند لأمر، رهن عقاري، ضامن — لكل مشروع" color="success" />
              <Pillar icon={<TrendingUp />} title="تداول لحظي" desc="السعر يتحرك حسب العرض والطلب" color="primary" />
              <Pillar icon={<Wallet />} title="بنك رقمي" desc="IBAN افتراضي ومحفظة حقيقية لكل مستخدم" color="primary" />
              <Pillar icon={<MessageSquare />} title="مجتمع مالي" desc="تواصل مع الملّاك وحلّل القرارات" color="success" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ROI CALCULATOR */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <Reveal>
          <ROICalculator />
        </Reveal>
      </section>


      {/* FEATURED PROJECTS */}
      <FeaturedProjectsSection />

      {/* NEWS PREVIEW */}
      <NewsPreviewSection />

      {/* DISPUTES CTA */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/20"><Scale className="h-6 w-6 text-warning" /></div>
              <div>
                <div className="text-xs font-extrabold text-warning">قسم المنازعات</div>
                <h3 className="mt-1 text-xl font-black">محامون مختصّون في دولتك عند أي خلاف</h3>
                <p className="mt-1 text-sm font-medium text-muted-foreground">افتح نزاعاً قانونياً على أي مشروع وتابع حالته. الرسوم تُسترد عند صدور الحكم لصالحك.</p>
              </div>
            </div>
            <Link to="/disputes">
              <Button variant="outline" className="font-extrabold">افتح نزاعاً <ArrowLeft className="ms-1 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>


      {/* TWO JOURNEYS */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="mb-10 text-center">
            <div className="text-sm font-extrabold text-primary">رحلتك في المنصة</div>
            <h2 className="mt-1 text-3xl font-black md:text-4xl">رحلتان متكاملتان — حساب واحد</h2>
            <p className="mt-2 opacity-70 font-medium">في «IDEA BUSINESS» أنت مستثمر وصاحب مشروع في نفس الوقت.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Investor Journey */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary"><Search className="h-6 w-6" /></div>
                <div>
                  <div className="text-xs font-extrabold text-primary">رحلة المستثمر</div>
                  <div className="text-xl font-black">استثمر بضمانات قبل أن تدفع</div>
                </div>
              </div>
              <ol className="mt-5 space-y-3 text-sm font-semibold">
                <JStep n="1" t="فعّل هويتك بـ AI" d="رفع الهوية + سيلفي — التحقق الذكي خلال ثوانٍ." />
                <JStep n="2" t="استعرض الضمانات" d="شاهد وصل الأمانة، الرهن العقاري، رهن السيارة قبل الشراء." />
                <JStep n="3" t="قدّم عرض شراء" d="اشترِ بالسعر المعروض أو فاوض على عدد أسهم وسعر أقل." />
                <JStep n="4" t="تابع وتداول لحظياً" d="بِع حصصك في السوق الموازي متى شئت." />
                <JStep n="5" t="نزاع؟ محامينا معك" d="قسم النزاعات يُوفّر محامياً مختصاً في دولتك." />
              </ol>
              <Link to="/market" className="mt-5 inline-flex items-center gap-1 text-sm font-extrabold text-primary hover:underline">
                ابدأ كمستثمر <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>

            {/* Project Owner Journey */}
            <div className="rounded-2xl border border-success/30 bg-success/5 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-success"><HandCoins className="h-6 w-6" /></div>
                <div>
                  <div className="text-xs font-extrabold text-success">رحلة صاحب المشروع</div>
                  <div className="text-xl font-black">موّل فكرتك بضمانات تحفظ ثقة المستثمر</div>
                </div>
              </div>
              <ol className="mt-5 space-y-3 text-sm font-semibold">
                <JStep n="1" t="فعّل هويتك بـ AI" d="نفس التحقق الذكي يؤهلك للطرفين معاً." />
                <JStep n="2" t="جهّز مشروعك" d="اسم المشروع، تكلفته، نسبة مساهمتك، الأرباح المتوقعة." />
                <JStep n="3" t="ارفع الضمانات" d="وصل أمانة · سند لأمر · رهن عقاري · رهن سيارة · ضمان بنكي." />
                <JStep n="4" t="حدّد الأسهم" d="عدد الأسهم وسعر السهم — يُدرج في السوق الموازي." />
                <JStep n="5" t="استلم التمويل" d="عند بيع الأسهم تُحوَّل الأموال لمحفظتك بعد توثيق العقد." />
              </ol>
              <Link to="/projects/new" search={{ edit: undefined }} className="mt-5 inline-flex items-center gap-1 text-sm font-extrabold text-success hover:underline">
                أطلق مشروعك <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* MEMBERSHIP — unified */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-10 text-center">
          <div className="text-sm font-extrabold text-primary">العضوية</div>
          <h2 className="mt-1 text-3xl font-black md:text-4xl">عضوية واحدة — تستثمر وتُطلق مشاريع</h2>
          <p className="mt-2 text-muted-foreground font-medium">لا تمييز بين مستثمر وصاحب مشروع. حساب واحد يفتح لك الطرفين.</p>
        </div>
        <div className="mx-auto max-w-2xl">
          <UnifiedPlan />
        </div>
      </section>

      {/* AI DYNAMIC PRICING */}
      <section className="bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-extrabold text-primary">
                <Bot className="h-3.5 w-3.5" /> تسعير ديناميكي بالذكاء الاصطناعي
              </div>
              <h2 className="mt-4 text-3xl font-black">سعر السهم يتغيّر مع كل حدث</h2>
              <p className="mt-3 font-medium text-muted-foreground">
                خوارزمية AI تُحدّث قيمة السهم تلقائياً عند: بيع كمية من الأسهم، الحصول على تمويل،
                إعلان أرباح، أو زيادة الضمانات. وقد ينخفض السعر إن مضى شهر بلا طلب أو خُفّضت الضمانات.
              </p>
            </div>
            <ul className="grid gap-3 text-sm font-semibold">
              <PriceRule up t="بيع كمية من الأسهم" />
              <PriceRule up t="الحصول على تمويل خارجي" />
              <PriceRule up t="إعلان أرباح من صاحب المشروع" />
              <PriceRule up t="زيادة الضمانات أو إضافة ضمان جديد" />
              <PriceRule t="مرور أكثر من 30 يوماً بدون شراء" />
              <PriceRule t="تخفيض الضمانات" />
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ PREVIEW */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-14">
          <Reveal>
            <div className="mb-6 text-center">
              <div className="text-sm font-extrabold text-primary">الأسئلة الشائعة</div>
              <h2 className="mt-1 text-3xl font-black md:text-4xl">إجاباتٌ سريعة لأكثر ما يُسأل</h2>
            </div>
            <FAQAccordion limit={6} />
            <div className="mt-4 text-center">
              <Link to="/faq" className="text-sm font-extrabold text-primary hover:underline">عرض كل الأسئلة ←</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <SecurityBadges />
    </div>
  );
}

function FeaturedProjectsSection() {
  const fn = useServerFn(listFeaturedProjects);
  const { data: rows, isLoading } = useQuery({
    queryKey: ["home", "featured-projects"],
    queryFn: () => fn({ data: { limit: 6 } }),
  });
  const list = rows ?? [];
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-extrabold text-primary">سوق المشاريع</div>
          <h2 className="mt-1 text-3xl font-black md:text-4xl">مشاريع مميزة قيد التداول</h2>
          <p className="mt-2 text-muted-foreground font-medium">اشترِ حصصاً تبدأ من سهم واحد، وتداولها متى شئت.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/projects/new" search={{ edit: undefined }}>
            <Button className="gradient-success text-success-foreground border-0 font-extrabold">
              <Plus className="h-4 w-4 me-1" /> أضف IDEA BUSINESS
            </Button>
          </Link>
          <Link to="/market" className="hidden text-sm font-extrabold text-primary hover:underline md:inline">
            عرض الكل ←
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-64 rounded-2xl border border-border bg-muted/30 animate-pulse" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-primary/40" />
          <h3 className="mt-4 text-xl font-black">المنصة جاهزة لاستقبال أول المشاريع</h3>
          <p className="mt-2 text-sm font-medium text-muted-foreground">كن أول من يطرح مشروعه على «IDEA BUSINESS».</p>
          <Link to="/projects/new" search={{ edit: undefined }} className="mt-5 inline-block">
            <Button className="gradient-primary text-primary-foreground border-0 font-extrabold">
              <Plus className="h-4 w-4 me-1" /> أضف IDEA BUSINESS
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => {
            const remaining = (p.shares_total ?? 0) - (p.shares_sold ?? 0);
            const pct = p.shares_total ? Math.min(100, Math.round(((p.shares_sold ?? 0) / p.shares_total) * 100)) : 0;
            return (
              <Link key={p.id} to="/projects/$id" params={{ id: p.id }} className="group block overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/50 hover:shadow-lg">
                {p.cover_image_url ? (
                  <img src={p.cover_image_url} alt={p.name} className="h-40 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-primary/10 to-success/10">
                    <Sparkles className="h-10 w-10 text-primary/40" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-base font-black group-hover:text-primary">{p.name}</div>
                      {p.ticker && <div className="text-xs font-bold text-muted-foreground">{p.ticker} · {p.sector || "—"}</div>}
                    </div>
                    {p.country && <Badge variant="secondary" className="shrink-0 text-[10px]">{p.country}</Badge>}
                  </div>
                  <div className="mt-2">
                    <ProjectBadges sharesSold={p.shares_sold} sharesTotal={p.shares_total} featured={p.owner_verified} />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Avatar className="h-7 w-7 ring-2 ring-background">
                      <AvatarImage src={p.owner_avatar ?? undefined} alt={p.owner_name ?? ""} />
                      <AvatarFallback className="text-[10px] font-black">{(p.owner_name || "؟").slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 truncate text-xs font-semibold text-muted-foreground">
                      {p.owner_name || "صاحب المشروع"}
                      {p.owner_verified && <span className="ms-1 text-primary">✓</span>}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/40 p-2">
                      <div className="text-muted-foreground">سعر السهم</div>
                      <div className="font-black">{p.current_price ?? p.share_price ?? "—"}</div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <div className="text-muted-foreground">متاح</div>
                      <div className="font-black">{remaining}</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full gradient-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function NewsPreviewSection() {
  const fn = useServerFn(listArticles);
  const { data: rows } = useQuery({
    queryKey: ["home", "news-preview"],
    queryFn: () => fn({ data: { limit: 4 } }),
  });
  const list = rows ?? [];
  if (list.length === 0) return null;
  return (
    <section className="bg-muted/30 border-y border-border">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-extrabold text-primary">
              <Newspaper className="h-4 w-4" /> الأخبار
            </div>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">آخر تحركات السوق الموازي</h2>
          </div>
          <Link to="/news" className="text-sm font-extrabold text-primary hover:underline">عرض الكل ←</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {list.map((a: any) => (
            <Link key={a.id} to="/news/$slug" params={{ slug: a.slug }} className="group block overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/50">
              {a.cover_image_url && <img src={a.cover_image_url} alt={a.title} className="h-32 w-full object-cover" loading="lazy" />}
              <div className="p-3">
                {a.category && <Badge variant="secondary" className="mb-1 text-[10px]">{a.category}</Badge>}
                <div className="line-clamp-2 text-sm font-black group-hover:text-primary">{a.title}</div>
                {a.excerpt && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.excerpt}</div>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="num text-2xl font-black md:text-3xl">{n}</div>
      <div className="text-xs font-bold text-muted-foreground">{l}</div>
    </div>
  );
}

function Pillar({ icon, title, desc, color }: { icon: React.ReactNode; title: string; desc: string; color: "primary" | "success" }) {
  const { lang } = useI18n();
  const text = `${title} ${desc}`;
  let displayTitle = title;
  let displayDesc = desc;

  if (lang === "en") {
    if (text.includes("IBAN")) {
      displayTitle = "Digital wallet";
      displayDesc = "Virtual IBAN and real wallet for every user";
    } else if (text.includes("ØªØ¯Ø§ÙˆÙ„") || text.includes("تداول")) {
      displayTitle = "Live trading";
      displayDesc = "Prices move with supply and demand";
    } else if (text.includes("Ø¶Ù…Ø§Ù†") || text.includes("ضمان")) {
      displayTitle = "Legal guarantees";
      displayDesc = "Promissory note, real estate lien, or guarantor for every project";
    } else if (text.includes("Ù…Ø¬ØªÙ…Ø¹") || text.includes("مجتمع")) {
      displayTitle = "Financial community";
      displayDesc = "Connect with owners and analyze decisions";
    }
  }

  return (
    <div className="flex gap-3">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
        color === "primary" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
      }`}>
        <div className="h-5 w-5">{icon}</div>
      </div>
      <div>
        <div className="font-extrabold">{displayTitle}</div>
        <div className="text-sm font-medium text-muted-foreground">{displayDesc}</div>
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-background/10 bg-background/5 p-5">
      <div className="num flex h-9 w-9 items-center justify-center rounded-xl gradient-primary font-black">{n}</div>
      <div className="mt-4 text-lg font-extrabold">{title}</div>
      <div className="mt-1 text-sm font-medium opacity-75">{desc}</div>
    </div>
  );
}

function JStep({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background/10 text-xs font-black">{n}</span>
      <div>
        <div className="font-extrabold">{t}</div>
        <div className="text-xs font-medium opacity-75">{d}</div>
      </div>
    </li>
  );
}

function PriceRule({ t, up }: { t: string; up?: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-xl border p-3 ${up ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${up ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
        {up ? <TrendingUp className="h-4 w-4" /> : <TrendingUp className="h-4 w-4 rotate-180" />}
      </span>
      <span>{t}</span>
    </li>
  );
}

function UnifiedPlan() {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/5 to-success/5 p-7">
      <div className="absolute left-0 top-0 rounded-br-xl bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary-foreground">
        عضوية موحّدة
      </div>
      <div className="flex items-center gap-2 pt-4">
        <Coins className="h-6 w-6 text-primary" />
        <div className="text-2xl font-black">عضوية «IDEA BUSINESS»</div>
      </div>
      <div className="mt-2 num text-4xl font-black text-primary">
        مجاناً<span className="text-sm font-bold text-muted-foreground"> — عمولة عند التداول فقط</span>
      </div>
      <ul className="mt-5 grid gap-2.5 text-sm font-semibold sm:grid-cols-2">
        <li className="flex gap-2"><ShieldCheck className="h-4 w-4 text-success" /> تحقق الهوية بـ AI</li>
        <li className="flex gap-2"><HandCoins className="h-4 w-4 text-primary" /> أطلق مشاريع بضمانات</li>
        <li className="flex gap-2"><Search className="h-4 w-4 text-primary" /> استثمر وفاوض على السعر</li>
        <li className="flex gap-2"><Scale className="h-4 w-4 text-primary" /> فض النزاعات بمحامين</li>
        <li className="flex gap-2"><FileCheck className="h-4 w-4 text-success" /> توثيق العقود والضمانات</li>
        <li className="flex gap-2"><Wallet className="h-4 w-4 text-primary" /> محفظة و IBAN افتراضي</li>
      </ul>
      <Link to="/auth">
        <Button className="mt-6 w-full gradient-primary text-primary-foreground border-0 font-extrabold h-12">
          أنشئ حسابك الآن
        </Button>
      </Link>
    </div>
  );
}

function PalmFronds() {
  const Frond = ({ className, flip = false }: { className: string; flip?: boolean }) => (
    <svg
      viewBox="0 0 300 300"
      className={className}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
      aria-hidden
    >
      <defs>
        <linearGradient id="frondG" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#7DD3FC" stopOpacity="0.55" />
          <stop offset="1" stopColor="#22D3EE" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <g stroke="url(#frondG)" strokeWidth="1.2" fill="none" strokeLinecap="round">
        <path d="M150,290 C150,200 150,120 150,30" />
        {Array.from({ length: 14 }).map((_, i) => {
          const y = 40 + i * 18;
          const len = 30 + i * 8;
          return (
            <g key={i}>
              <path d={`M150,${y} Q${150 - len * 0.6},${y - 10} ${150 - len},${y - 20}`} />
              <path d={`M150,${y} Q${150 + len * 0.6},${y - 10} ${150 + len},${y - 20}`} />
            </g>
          );
        })}
      </g>
    </svg>
  );
  return (
    <>
      <Frond className="pointer-events-none absolute -left-10 top-0 h-[420px] w-[420px] opacity-50" />
      <Frond className="pointer-events-none absolute -right-10 top-0 h-[420px] w-[420px] opacity-50" flip />
    </>
  );
}
