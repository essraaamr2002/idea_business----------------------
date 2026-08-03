import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type LocalizedFaq = {
  cat: { ar: string; en: string };
  q: { ar: string; en: string };
  a: { ar: string; en: string };
};

export const FAQ_DATA: LocalizedFaq[] = [
  {
    cat: { ar: "البدء", en: "Getting started" },
    q: { ar: "كيف أبدأ كمستثمر؟", en: "How do I start as an investor?" },
    a: {
      ar: "أنشئ حساباً، فعّل KYC بالـ AI، اشحن محفظتك، ثم استعرض المشاريع في السوق وقدّم عرض شراء أو اشتر مباشرة.",
      en: "Create an account, complete AI KYC, fund your wallet, then browse market projects and place a buy offer or buy directly.",
    },
  },
  {
    cat: { ar: "البدء", en: "Getting started" },
    q: { ar: "كيف أطلق مشروعي؟", en: "How do I launch my project?" },
    a: {
      ar: "من قسم «مشروع جديد»، أدخل تفاصيل المشروع وارفع الضمانات، ثم حدّد عدد الأسهم وسعر السهم.",
      en: "From New Project, enter your project details, upload guarantees, then set share count and share price.",
    },
  },
  {
    cat: { ar: "الضمانات", en: "Guarantees" },
    q: { ar: "ما الضمانات المقبولة؟", en: "What guarantees are accepted?" },
    a: {
      ar: "سند لأمر، رهن عقاري، رهن سيارة، ضامن شخصي، أو ضمان بنكي. كل مشروع يحتاج ضماناً مرتبطاً بحجمه.",
      en: "Promissory notes, real estate liens, car liens, personal guarantors, or bank guarantees. Each project needs guarantees aligned with its size.",
    },
  },
  {
    cat: { ar: "الضمانات", en: "Guarantees" },
    q: { ar: "هل أموالي محمية؟", en: "Is my money protected?" },
    a: {
      ar: "نعم، لا تُحوّل الأموال لصاحب المشروع قبل توثيق العقد وتفعيل الضمانات. يمكنك في أي وقت فتح نزاع قانوني عبر قسم المنازعات.",
      en: "Yes. Funds are not released to the founder before contract verification and guarantee activation. You can open a legal dispute at any time.",
    },
  },
  {
    cat: { ar: "التداول", en: "Trading" },
    q: { ar: "كيف يتحرّك سعر السهم؟", en: "How does the share price move?" },
    a: {
      ar: "خوارزمية AI ترفع السعر عند بيع كميات، الحصول على تمويل، إعلان أرباح، أو زيادة الضمانات. وقد ينخفض عند ركود الطلب أو خفض الضمانات.",
      en: "The AI pricing engine can raise prices after share sales, funding, profit announcements, or stronger guarantees. It can also lower prices when demand slows or guarantees are reduced.",
    },
  },
  {
    cat: { ar: "التداول", en: "Trading" },
    q: { ar: "هل أستطيع بيع حصصي؟", en: "Can I sell my shares?" },
    a: {
      ar: "نعم، يمكنك إدراج حصصك في السوق الموازي للبيع في أي وقت بسعر تختاره أنت.",
      en: "Yes. You can list your shares in the secondary market whenever you choose, at a price you set.",
    },
  },
  {
    cat: { ar: "المحفظة", en: "Wallet" },
    q: { ar: "كيف أشحن محفظتي؟", en: "How do I fund my wallet?" },
    a: {
      ar: "ندعم البطاقات والتحويل البنكي وعدّة بوابات دفع إقليمية. يصلك IBAN افتراضي لكل حساب.",
      en: "Cards, bank transfers, and regional payment gateways are supported. Each account receives a virtual IBAN.",
    },
  },
  {
    cat: { ar: "المحفظة", en: "Wallet" },
    q: { ar: "كيف أسحب أرباحي؟", en: "How do I withdraw profits?" },
    a: {
      ar: "من «المحفظة → طلب سحب»، يصل المبلغ خلال 1-3 أيام عمل بعد التحقق.",
      en: "Use Wallet -> Withdrawal request. Funds arrive within 1-3 business days after verification.",
    },
  },
  {
    cat: { ar: "العضوية", en: "Membership" },
    q: { ar: "ما الفرق بين الباقات؟", en: "What is the difference between plans?" },
    a: {
      ar: "باقة واحدة تمنحك صفة مستثمر وصاحب مشروع معاً. الباقات الأعلى تفتح حدوداً أكبر وحضوراً أعلى في السوق.",
      en: "One membership gives you both investor and founder capabilities. Higher plans unlock larger limits and stronger market presence.",
    },
  },
  {
    cat: { ar: "النزاعات", en: "Disputes" },
    q: { ar: "ماذا لو حدث خلاف؟", en: "What if a dispute happens?" },
    a: {
      ar: "افتح نزاعاً في قسم المنازعات. نُعيّن لك محامياً مختصاً في دولتك.",
      en: "Open a case in the disputes section. We assign a specialized lawyer in your country.",
    },
  },
  {
    cat: { ar: "الأمان", en: "Security" },
    q: { ar: "هل بياناتي آمنة؟", en: "Is my data secure?" },
    a: {
      ar: "نستخدم تشفير TLS وعزل بيانات على مستوى المستخدم وسجل تدقيق لكل عملية مالية.",
      en: "We use TLS encryption, user-level data isolation, and audit logs for financial actions.",
    },
  },
  {
    cat: { ar: "الأمان", en: "Security" },
    q: { ar: "هل تدعمون 2FA؟", en: "Do you support 2FA?" },
    a: {
      ar: "ميزة المصادقة الثنائية قيد التطوير حالياً وسنُعلن عنها فور جاهزيتها.",
      en: "Two-factor authentication is currently in development and will be announced when ready.",
    },
  },
];

export function FAQAccordion({ limit }: { limit?: number } = {}) {
  const { lang, dir } = useI18n();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? FAQ_DATA.filter((f) =>
          [f.q[lang], f.a[lang], f.cat[lang]].some((value) => value.toLowerCase().includes(needle)),
        )
      : FAQ_DATA;
    return limit ? filtered.slice(0, limit) : filtered;
  }, [q, limit, lang]);

  return (
    <div className="space-y-4" dir={dir}>
      <div className="relative">
        <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={lang === "ar" ? "ابحث في الأسئلة الشائعة..." : "Search the FAQ..."}
          aria-label={lang === "ar" ? "ابحث في الأسئلة" : "Search questions"}
          className="pe-10"
        />
      </div>
      {list.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {lang === "ar" ? `لا توجد نتائج لـ «${q}»` : `No results for "${q}"`}
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {list.map((f, i) => (
            <AccordionItem key={i} value={`q-${i}`}>
              <AccordionTrigger className="text-start font-bold">
                <span className="me-2 text-[10px] font-extrabold text-primary">{f.cat[lang]}</span>
                {f.q[lang]}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a[lang]}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
