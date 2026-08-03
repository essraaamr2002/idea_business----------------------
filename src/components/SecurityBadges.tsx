import { BadgeCheck, FileCheck2, KeyRound, Lock, Server, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const items = [
  {
    icon: Lock,
    title: { ar: "تشفير SSL/TLS", en: "SSL/TLS encryption" },
    desc: { ar: "اتصال مشفر 256-bit لكل البيانات", en: "256-bit encrypted connections for all data" },
  },
  {
    icon: ShieldCheck,
    title: { ar: "حماية HIBP", en: "HIBP protection" },
    desc: { ar: "فحص كلمات المرور المسربة تلقائياً", en: "Automatic leaked-password checks" },
  },
  {
    icon: KeyRound,
    title: { ar: "مصادقة JWT", en: "JWT authentication" },
    desc: { ar: "جلسات آمنة وقابلة للتجديد", en: "Secure refreshable sessions" },
  },
  {
    icon: Server,
    title: { ar: "RLS على قاعدة البيانات", en: "Database RLS" },
    desc: { ar: "كل صف محمي بسياسات صارمة", en: "Every row is protected by strict policies" },
  },
  {
    icon: FileCheck2,
    title: { ar: "ضمانات قانونية موثقة", en: "Verified legal guarantees" },
    desc: { ar: "سند لأمر - رهن - ضامن بنكي", en: "Promissory notes, liens, and bank guarantees" },
  },
  {
    icon: BadgeCheck,
    title: { ar: "متوافق GDPR", en: "GDPR aligned" },
    desc: { ar: "خصوصية وحقوق المستخدم محفوظة", en: "User privacy and rights are protected" },
  },
];

export function SecurityBadges() {
  const { dir, lang } = useI18n();
  return (
    <section dir={dir} className="border-y border-[#E9ECEF] bg-[#F8F9FA] py-14">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8 text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#1B4F8A]/10 px-3 py-1 text-xs font-extrabold text-[#1B4F8A]">
            <ShieldCheck className="h-3.5 w-3.5" /> {lang === "ar" ? "شهادات الحماية والأمان" : "Security and protection badges"}
          </div>
          <h2 className="text-2xl font-black text-[#0F2D52] md:text-3xl">
            {lang === "ar" ? "منصة مبنية على أعلى معايير الأمان" : "A platform built on high security standards"}
          </h2>
          <p className="mt-2 text-sm text-[#6C757D]">
            {lang === "ar" ? "بياناتك وأموالك محمية بطبقات متعددة من التشفير والمراجعة" : "Your data and funds are protected by multiple layers of encryption and review"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title.en} className="flex items-start gap-3 rounded-2xl border border-[#E9ECEF] bg-white p-4 shadow-sm transition hover:border-[#1B4F8A]/40 hover:shadow-md">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#1B4F8A] to-[#2E6FBE] text-white">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-[#0F2D52]">{title[lang]}</div>
                <div className="mt-0.5 text-xs leading-relaxed text-[#6C757D]">{desc[lang]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SecurityStrip() {
  const { dir, lang } = useI18n();
  return (
    <div dir={dir} className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-xl border border-[#E9ECEF] bg-[#F8F9FA] px-4 py-3 text-[11px] font-extrabold text-[#495057]">
      <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-[#27AE60]" /> SSL 256-bit</span>
      <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#1B4F8A]" /> {lang === "ar" ? "HIBP محمي" : "HIBP protected"}</span>
      <span className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5 text-[#F58220]" /> {lang === "ar" ? "JWT آمن" : "Secure JWT"}</span>
      <span className="flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-[#27AE60]" /> GDPR</span>
    </div>
  );
}
