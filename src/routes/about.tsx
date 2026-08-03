import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Handshake,
  Users,
  ShieldCheck,
  MapPin,
  GraduationCap,
  ExternalLink,
  Quote,
} from "lucide-react";
import logoAsset from "@/assets/idea-business-logo-transparent.png.asset.json";
import ideaLogo from "@/assets/logo-idea.png.asset.json";
import firerLogo from "@/assets/logo-firer.png.asset.json";
import hejazLogo from "@/assets/logo-hejaz.png.asset.json";
import bidjobsLogo from "@/assets/logo-bidjobs.png.asset.json";
import founderPortrait from "@/assets/founder-portrait.png.asset.json";


export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "من نحن — IDEA BUSINESS | IDEA BUSINESS" },
      {
        name: "description",
        content:
          "IDEA BUSINESS — منصة استثمارية رائدة تحتضن الأفكار الواعدة وتحوّلها إلى مشاريع ناجحة، تابعة لشركة فايرير السعودية برأس مال 3 ملايين دولار.",
      },
      { property: "og:title", content: "من نحن — IDEA BUSINESS" },
      {
        property: "og:description",
        content:
          "مبادرة استثمارية من مجموعة فايرير السعودية تدعم رواد الأعمال في الوطن العربي.",
      },
      { property: "twitter:title", content: "من نحن — IDEA BUSINESS" },
      {
        property: "twitter:description",
        content:
          "مبادرة استثمارية من مجموعة فايرير السعودية تدعم رواد الأعمال في الوطن العربي.",
      },
    ],
  }),
  component: AboutPage,
});

const stats = [
  { v: "$3M", l: "رأس المال" },
  { v: "+120", l: "موظف وموظفة" },
  { v: "﷼24M", l: "عائدات 2025" },
  { v: "+13", l: "سنة خبرة" },
];

const teamStats = [
  { v: "+120", l: "موظف وموظفة" },
  { v: "+8", l: "جنسية عربية" },
  { v: "24/7", l: "دعم متواصل" },
  { v: "3", l: "قطاعات" },
];

const values = [
  { icon: Sparkles, t: "الابتكار", d: "كل فكرة واعدة تستحق فرصتها الكاملة." },
  { icon: Handshake, t: "الشراكة", d: "نبني جسور التعاون بين رواد الأعمال عربياً." },
  { icon: Users, t: "التمكين", d: "نزود الشباب بالأدوات لبناء مستقبلهم." },
  { icon: ShieldCheck, t: "الثقة", d: "أعلى معايير الشفافية في كل تعاملاتنا." },
];

const education = [
  { d: "بكالوريوس القانون (الأنظمة)", s: "جامعة تبوك" },
  { d: "ماجستير إدارة الأعمال التنفيذية", s: "جامعة تبوك" },
  { d: "دبلوم الموارد البشرية", s: "معهد أليسون — أيرلندا" },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <main dir="rtl" className="text-foreground">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/10 via-background to-background">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
          <div className="mx-auto max-w-5xl px-4 py-16 text-center md:py-24">
            <img
              src={logoAsset.url}
              alt="IDEA BUSINESS"
              className="mx-auto h-24 w-24 object-contain md:h-32 md:w-32"
            />
            <div className="mt-6 text-xs tracking-[0.3em] text-muted-foreground">
              IDEA BUSINESS · IDEA BUSINESS
            </div>

            {/* All group logos above “من نحن” */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:gap-6">
              {[
                { src: ideaLogo, alt: "IDEA BUSINESS" },
                { src: firerLogo, alt: "جامعة فايرير — FiReR University" },
                { src: hejazLogo, alt: "شركة شمال الحجاز العقارية" },
                { src: bidjobsLogo, alt: "Bid Jobs" },
              ].map((logo) => (
                <div
                  key={logo.alt}
                  title={logo.alt}
                  className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-primary/40 bg-background p-2 shadow-sm ring-4 ring-primary/10"
                >
                  <img
                    src={logo.src.url}
                    alt={logo.alt}
                    className="h-full w-full object-contain"
                  />
                </div>
              ))}
            </div>

            <h1 className="mt-6 text-4xl font-black md:text-6xl">من نحن</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-foreground/85 md:text-lg">
              منصة استثمارية رائدة تحتضن الأفكار الواعدة وتُحوّلها إلى مشاريع
              ناجحة، دعماً للاقتصاد العربي وتمكيناً لرواد الأعمال.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <a
                href="https://busniss.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground hover:bg-primary/90"
              >
                busniss.org <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href="https://www.faireer.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-extrabold hover:border-primary"
              >
                faireer.com <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Stats bar */}
          <div className="border-t border-border bg-card/40 backdrop-blur">
            <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-border md:grid-cols-4 [direction:ltr]">
              {stats.map((s) => (
                <div key={s.l} className="px-4 py-6 text-center" dir="rtl">
                  <div className="text-2xl font-black text-primary md:text-3xl">
                    {s.v}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MISSION */}
        <section className="mx-auto max-w-4xl px-4 py-16">
          <div className="text-sm font-bold text-primary">| البداية والرسالة</div>
          <h2 className="mt-2 text-3xl font-black md:text-4xl">
            منصة تُحوّل الأفكار إلى واقع
          </h2>
          <div className="mt-6 space-y-4 text-base leading-8 text-foreground/85">
            <p>
              في الأول من مارس 2026م، أطلقت{" "}
              <strong>شركة فايرير السعودية</strong> مبادرتها الاستثمارية{" "}
              <strong>IDEA BUSINESS</strong>، لتُشكّل إضافةً نوعيةً في مشهد ريادة
              الأعمال العربي. جاءت تتويجاً لرؤية استراتيجية راسخة وإيمان عميق
              بأن الوطن العربي يزخر بطاقات إبداعية تستحق أن تُحتضن وتُنمَّى.
            </p>
            <p>
              تقوم المنصة على مبدأ جوهري:{" "}
              <strong>لكل فكرة واعدة الحق في أن تصبح مشروعاً ناجحاً.</strong>{" "}
              تعمل على احتضان المشاريع الناشئة وتزويدها بمنظومة متكاملة من الدعم
              الاستراتيجي والتوجيه المتخصص والبنية التقنية والمالية اللازمة
              لنموها المستدام.
            </p>
          </div>
        </section>

        {/* CORPORATE ENTITY */}
        <section className="border-y border-border bg-card/30">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <div className="text-sm font-bold text-primary">| الكيان المؤسسي</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">
              مجموعة فايرير السعودية
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-foreground/85">
              شركة فايرير السعودية (رقم الترخيص:{" "}
              <strong dir="ltr" className="font-mono">7053781691</strong>) هي
              الحاضنة الرئيسية لمبادرة IDEA BUSINESS، برأس مال مؤسسي يبلغ{" "}
              <strong>ثلاثة ملايين دولار أمريكي</strong> وفق عقد التأسيس الرسمي.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <a
                href="https://busniss.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-border bg-card p-6 hover:border-primary"
              >
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/40 bg-background p-2 shadow-sm ring-4 ring-primary/10">
                  <img
                    src={ideaLogo.url}
                    alt="IDEA BUSINESS"
                    className="h-full w-full rounded-full object-contain"
                  />
                </div>
                <div className="mt-3 text-lg font-black">IDEA BUSINESS</div>
                <div className="text-xs text-muted-foreground">IDEA BUSINESS</div>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:underline">
                  busniss.org <ExternalLink className="h-3 w-3" />
                </div>
              </a>
              <a
                href="https://www.faireer.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-2xl border border-border bg-card p-6 hover:border-primary"
              >
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/40 bg-background p-2 shadow-sm ring-4 ring-primary/10">
                  <img
                    src={firerLogo.url}
                    alt="جامعة فايرير — FiReR University"
                    className="h-full w-full rounded-full object-contain"
                  />
                </div>
                <div className="mt-3 text-lg font-black">جامعة فايرير</div>
                <div className="text-xs text-muted-foreground">FiReR University</div>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:underline">
                  faireer.com <ExternalLink className="h-3 w-3" />
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* EXPANSION ARM */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="text-sm font-bold text-primary">| ذراع التوسع</div>
          <h2 className="mt-2 text-3xl font-black md:text-4xl">
            مجموعة شمال الحجاز
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-foreground/85">
            تضم مجموعة فايرير تحت مظلتها <strong>شركة شمال الحجاز</strong> بجميع
            فروعها، كيان متعدد الأذرع يجمع بين قطاعَي التوظيف والعقارات بنتائج
            استثنائية موثّقة.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/40 bg-background p-2 shadow-sm ring-4 ring-primary/10">
                <img
                  src={bidjobsLogo.url}
                  alt="Bid Jobs"
                  className="h-full w-full rounded-full object-contain"
                />
              </div>
              <div className="mt-3 text-lg font-black">فرع التوظيف — Bid Jobs</div>
              <p className="mt-3 text-sm leading-7 text-foreground/85">
                حقّق عام 2025م عائداتٍ بلغت{" "}
                <strong>٢٤ مليون ريال سعودي</strong>، مما أتاح تأسيس{" "}
                <strong>Bid Jobs Co.</strong> في الولايات المتحدة الأمريكية،
                شركةً مساهمةً بـ <strong>١٠٠,٠٠٠ سهم</strong>.
              </p>
              <a
                href="https://www.bidijobs.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                bidijobs.com <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/40 bg-background p-2 shadow-sm ring-4 ring-primary/10">
                <img
                  src={hejazLogo.url}
                  alt="شركة شمال الحجاز العقارية"
                  className="h-full w-full rounded-full object-contain"
                />
              </div>
              <div className="mt-3 text-lg font-black">
                فرع العقارية — شمال الحجاز
              </div>
              <p className="mt-3 text-sm leading-7 text-foreground/85">
                يعمل على رصد الفرص العقارية الواعدة وتطويرها، مستثمراً الخبرة
                المتراكمة والشبكة الواسعة لتقديم حلول عقارية متميزة في شمال
                المملكة العربية السعودية.
              </p>
            </div>
          </div>
        </section>

        {/* TEAM */}
        <section className="border-y border-border bg-card/30">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <div className="text-sm font-bold text-primary">| الفريق</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">
              المنظومة البشرية
            </h2>
            <div className="mt-5 max-w-3xl space-y-4 text-base leading-8 text-foreground/85">
              <p>
                يقف خلف هذا الكيان{" "}
                <strong>جيش من الكفاءات العربية</strong> يتجاوز عددهم{" "}
                <strong>١٢٠ موظفاً وموظفة</strong>، يحملون جنسيات عربية متنوعة،
                يعملون ليلاً ونهاراً بتفانٍ وإخلاص لا يعرف التوقف.
              </p>
              <p>
                كل فرد منهم خبير في تخصصه، يُسهم بمعرفته وكفاءته في بناء منظومة
                تصبّ في خدمة رؤية واحدة: دعم الاستثمار وتمكين رواد الأعمال في
                الوطن العربي.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {teamStats.map((s) => (
                <div
                  key={s.l}
                  className="rounded-xl border border-border bg-card p-4 text-center"
                >
                  <div className="text-2xl font-black text-primary">{s.v}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOUNDER */}
        <section className="mx-auto max-w-5xl px-4 py-16">
          <div className="text-sm font-bold text-primary">| المؤسس</div>
          <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr]">
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              {/* Founder portrait — circular with dual green/blue ring + verified badge */}
              <div className="relative mx-auto h-40 w-40">
                {/* Dual ring: outer green, inner blue */}
                <div className="absolute inset-0 rounded-full p-[3px]" style={{ background: "linear-gradient(135deg, #16a34a 0%, #16a34a 50%, #2563eb 50%, #2563eb 100%)" }}>
                  <div className="h-full w-full rounded-full bg-background p-[3px]">
                    <div className="h-full w-full overflow-hidden rounded-full bg-gradient-to-b from-primary/15 to-primary/5">
                      <img
                        src={founderPortrait.url}
                        alt="المستشار عبدالعزيز أحمد الفاير"
                        className="h-full w-full object-cover object-top"
                      />
                    </div>
                  </div>
                </div>
                {/* Verified blue check */}
                <div className="absolute -bottom-1 -left-1 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-[#2563eb] shadow-md">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
              <div className="mt-5 text-sm font-bold text-muted-foreground">
                المستشار
              </div>
              <div className="mt-1 text-lg font-black">عبدالعزيز أحمد الفاير</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> تبوك — السعودية
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-xl font-black">
                المستشار / عبدالعزيز أحمد عبدالكريم الفاير
              </h3>
              <div className="mt-1 text-sm text-primary">
                المؤسس والرئيس التنفيذي — مجموعة فايرير
              </div>
              <p className="mt-4 text-sm leading-7 text-foreground/85">
                يجمع المستشار الفاير بين عمق المعرفة الأكاديمية وتجربة ميدانية
                تمتد لأكثر من <strong>ثلاثة عشر عاماً</strong> في الأعمال
                والتجارة والإدارة. يؤمن بأن الشباب العربي يحمل طاقات استثنائية
                تنتظر البيئة المناسبة لتتفجّر إنجازاً ونجاحاً.
              </p>
              <ul className="mt-5 space-y-2">
                {education.map((e) => (
                  <li
                    key={e.d}
                    className="flex items-start gap-3 rounded-lg border border-border bg-background/50 p-3"
                  >
                    <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="text-sm">
                      <div className="font-bold">{e.d}</div>
                      <div className="text-xs text-muted-foreground">{e.s}</div>
                    </div>
                  </li>
                ))}
              </ul>

              <blockquote className="mt-6 rounded-xl border-r-4 border-primary bg-primary/5 p-5">
                <Quote className="h-5 w-5 text-primary/60" />
                <p className="mt-2 text-sm italic leading-7 text-foreground/90">
                  "طموحنا أن نُحوّل كل فكرة طموحة إلى مشروع ناجح، وكل شاب يحلم
                  إلى رائد أعمال يُلهم، وأن نجعل من الوطن العربي ساحةً خصبةً
                  للإبداع والازدهار المشترك."
                </p>
                <footer className="mt-3 text-xs font-bold text-muted-foreground">
                  — عبدالعزيز أحمد الفاير، المؤسس والرئيس التنفيذي
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        {/* VALUES */}
        <section className="border-t border-border bg-card/30">
          <div className="mx-auto max-w-5xl px-4 py-16">
            <div className="text-sm font-bold text-primary">| قيمنا</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">
              المبادئ التي نبني عليها
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((v) => (
                <div
                  key={v.t}
                  className="rounded-2xl border border-border bg-card p-6"
                >
                  <v.icon className="h-7 w-7 text-primary" />
                  <h3 className="mt-3 text-lg font-black">{v.t}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {v.d}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/how-it-works"
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground hover:bg-primary/90"
              >
                كيف تعمل المنصة؟
              </Link>
              <Link
                to="/contact"
                className="rounded-md border border-border px-5 py-2.5 text-sm font-bold hover:border-primary"
              >
                تواصل معنا
              </Link>
            </div>
          </div>
        </section>

        {/* FOOTER NOTE */}
        <section className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-muted-foreground">
          © 2026 IDEA BUSINESS — شركة فايرير السعودية ·{" "}
          <span dir="ltr" className="font-mono">7053781691</span>
        </section>
      </main>
    </div>
  );
}
