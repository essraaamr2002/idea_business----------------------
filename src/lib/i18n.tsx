import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const LANGS = [
  { code: "ar", name: "العربية", flag: "SA", dir: "rtl" as const },
  { code: "en", name: "English", flag: "GB", dir: "ltr" as const },
] as const;

export type Lang = typeof LANGS[number]["code"];
const RTL_LANGS: Lang[] = ["ar"];

const dict: Record<Lang, Record<string, string>> = {
  ar: {
    "nav.home": "الرئيسية",
    "nav.market": "السوق",
    "nav.marketIdx": "السوق و IDX",
    "nav.feed": "مشاريع المنصة",
    "nav.dashboard": "لوحتي",
    "nav.wallet": "المحفظة",
    "nav.disputes": "المنازعات",
    "nav.supervisor": "مشرف مشروع",
    "nav.support": "الدعم",
    "nav.admin": "الإدارة",
    "nav.login": "تسجيل دخول",
    "nav.signup": "إنشاء حساب",
    "nav.logout": "خروج",
    "nav.profile": "ملفي",
    "nav.account": "حسابي",
    "nav.journey": "رحلتي",
    "nav.more": "المزيد",
    "nav.newProject": "مشروع جديد",
    "nav.assistant": "المساعد الذكي",
    "nav.referrals": "ادع صديقاً - إحالاتي",
    "nav.services": "مزودو الخدمات",
    "nav.servicesRegister": "افتح متجر خدمات",
    "nav.orders": "طلباتي",
    "nav.myBids": "مزايداتي ومناقصاتي",
    "nav.community": "المجتمع والعروض المباشرة",
    "nav.about": "من نحن",
    "nav.news": "الأخبار",
    "nav.watchlist": "المتابعة",
    "nav.secondaryMarket": "السوق الثانوي",
    "nav.verify": "توثيق الحساب (KYC)",
    "nav.kycAi": "التوثيق بالذكاء الاصطناعي",
    "nav.membership": "العضوية",
    "nav.faq": "الأسئلة",
    "nav.messages": "الرسائل",
    "nav.settings": "الإعدادات",
    "nav.menu": "القائمة",
    "nav.bottom": "التنقل السفلي",
    "settings.theme": "المظهر",
    "settings.language": "اللغة",
    "settings.currency": "العملة",
    "cta.create": "أنشئ مشروعك",
    "cta.invest": "استثمر الآن",
    "cta.explore": "استكشف المشاريع",
    "cta.launch": "أطلق مشروعك",
    "cta.learnMore": "اعرف أكثر",
    "search.placeholder": "ابحث عن مشروع، رمز، أو شخص...",
    "brand.tag": "حيث تتداول الأفكار وتنمو الاستثمارات",
    "hero.badge": "أول بورصة موازية للأفكار حول العالم",
    "hero.title1": "IDEA BUSINESS",
    "hero.title2": "تكسر الحدود حول العالم",
    "hero.subtitle": "رائد أعمال في أي مكان يطرح مشروعه بضمانات موثقة، ومستثمر دولي يشارك بثقة. نضمن أموالك من خلال محامين معتمدين لفض النزاعات.",
    "stat.countries": "190+ دولة",
    "stat.guarantees": "ضمانات موثقة",
    "stat.support": "فض نزاعات 24/7",
    "footer.tagline": "حيث تتداول الأفكار وتنمو الاستثمارات. منصة عالمية تجمع التمويل الجماعي والتداول والمجتمع المالي.",
    "footer.copyright": "© 2026 IDEA BUSINESS - منصة عالمية. جميع الحقوق محفوظة.",
    "footer.platform": "المنصة",
    "footer.projects": "للمشاريع",
    "footer.company": "الشركة",
    "footer.turningIdeas": "Turning Ideas Into Projects",
    "commission": "عمولة المنصة 7%",
    "language.select": "اختيار اللغة",
    "currency.select": "اختيار العملة",
    "currency.display": "العملة المعروضة",
    "currency.loading": "جاري تحميل أسعار الصرف...",
    "currency.note": "العملة المعروضة (الأسعار الأصلية تبقى محفوظة)",
    "currency.usd": "دولار أمريكي",
    "notifications.title": "الإشعارات",
    "notifications.markAll": "تمييز الكل",
    "notifications.empty": "لا توجد إشعارات",
    "verify.prompt": "وثّق حسابك",
    "verify.promptTitle": "وثّق حسابك بالذكاء الاصطناعي",
    "cookie.message": "نستخدم الكوكيز لتحسين تجربتك وقياس الأداء. يمكنك القبول أو الرفض في أي وقت.",
    "cookie.accept": "قبول",
    "cookie.reject": "رفض",
    "offline.message": "لا يوجد اتصال بالإنترنت - بعض الميزات قد لا تعمل.",
    "announcement.badge": "جديد:",
    "announcement.message": "برنامج الإحالة بمكافآت فورية + سوق موازٍ مطوّر.",
    "announcement.close": "إغلاق الإعلان",
    "notFound.title": "الصفحة التي تبحث عنها غير موجودة",
    "notFound.body": "قد يكون الرابط قديماً أو غير صحيح. اختر من الوجهات التالية:",
    "notFound.backHome": "العودة للرئيسية",
    "skip.content": "تخطّ إلى المحتوى",
  },
  en: {
    "nav.home": "Home",
    "nav.market": "Market",
    "nav.marketIdx": "Market & IDX",
    "nav.feed": "Platform Projects",
    "nav.dashboard": "Dashboard",
    "nav.wallet": "Wallet",
    "nav.disputes": "Disputes",
    "nav.supervisor": "Project Supervisor",
    "nav.support": "Support",
    "nav.admin": "Admin",
    "nav.login": "Sign in",
    "nav.signup": "Sign up",
    "nav.logout": "Sign out",
    "nav.profile": "Profile",
    "nav.account": "Account",
    "nav.journey": "My Journey",
    "nav.more": "More",
    "nav.newProject": "New Project",
    "nav.assistant": "AI Assistant",
    "nav.referrals": "Invite a Friend - Referrals",
    "nav.services": "Service Providers",
    "nav.servicesRegister": "Open a Services Store",
    "nav.orders": "My Orders",
    "nav.myBids": "My Bids and Tenders",
    "nav.community": "Community and Live Offers",
    "nav.about": "About",
    "nav.news": "News",
    "nav.watchlist": "Watchlist",
    "nav.secondaryMarket": "Secondary Market",
    "nav.verify": "Account Verification (KYC)",
    "nav.kycAi": "AI Verification",
    "nav.membership": "Membership",
    "nav.faq": "FAQ",
    "nav.messages": "Messages",
    "nav.settings": "Settings",
    "nav.menu": "Menu",
    "nav.bottom": "Bottom navigation",
    "settings.theme": "Theme",
    "settings.language": "Language",
    "settings.currency": "Currency",
    "cta.create": "List your project",
    "cta.invest": "Invest now",
    "cta.explore": "Explore projects",
    "cta.launch": "Launch your project",
    "cta.learnMore": "Learn more",
    "search.placeholder": "Search projects, tickers, or people...",
    "brand.tag": "Where ideas trade and investments grow",
    "hero.badge": "The first parallel idea exchange worldwide",
    "hero.title1": "IDEA BUSINESS",
    "hero.title2": "breaks borders worldwide",
    "hero.subtitle": "Founders anywhere can list projects with notarized guarantees, and international investors can participate with confidence. We safeguard capital through certified legal dispute resolution.",
    "stat.countries": "190+ countries",
    "stat.guarantees": "Notarized guarantees",
    "stat.support": "24/7 dispute resolution",
    "footer.tagline": "Where ideas trade and investments grow. A global platform combining crowdfunding, trading, and the financial community.",
    "footer.copyright": "© 2026 IDEA BUSINESS - a global platform. All rights reserved.",
    "footer.platform": "Platform",
    "footer.projects": "For Projects",
    "footer.company": "Company",
    "footer.turningIdeas": "Turning Ideas Into Projects",
    "commission": "Platform commission 7%",
    "language.select": "Select language",
    "currency.select": "Select currency",
    "currency.display": "Display currency",
    "currency.loading": "Loading exchange rates...",
    "currency.note": "Display currency (original prices remain unchanged)",
    "currency.usd": "US Dollar",
    "notifications.title": "Notifications",
    "notifications.markAll": "Mark all read",
    "notifications.empty": "No notifications",
    "verify.prompt": "Verify account",
    "verify.promptTitle": "Verify your account with AI",
    "cookie.message": "We use cookies to improve your experience and measure performance. You can accept or reject them at any time.",
    "cookie.accept": "Accept",
    "cookie.reject": "Reject",
    "offline.message": "No internet connection - some features may not work.",
    "announcement.badge": "New:",
    "announcement.message": "Instant referral rewards + an upgraded parallel market.",
    "announcement.close": "Close announcement",
    "notFound.title": "The page you are looking for does not exist",
    "notFound.body": "The link may be outdated or incorrect. Choose one of these destinations:",
    "notFound.backHome": "Back to home",
    "skip.content": "Skip to content",
  },
};

interface Ctx {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  t: (k: string) => string;
}

const I18nContext = createContext<Ctx | null>(null);

function readLangFromUrl(): Lang | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const q = url.searchParams.get("lang");
  if (q === "ar" || q === "en") return q;
  const seg = url.pathname.split("/").filter(Boolean)[0];
  if (seg === "en" || seg === "ar") return seg;
  return null;
}

function writeLangToUrl(lang: Lang) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("lang", lang);
  window.history.replaceState({}, "", url.toString());
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromUrl = readLangFromUrl();
    if (fromUrl) {
      setLangState(fromUrl);
      localStorage.setItem("lang", fromUrl);
      writeLangToUrl(fromUrl);
      return;
    }
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved && dict[saved]) {
      setLangState(saved);
      writeLangToUrl(saved);
      return;
    }
    const browser = (navigator.language || "en").slice(0, 2).toLowerCase() as Lang;
    const initial: Lang = dict[browser] ? browser : "ar";
    setLangState(initial);
    writeLangToUrl(initial);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => {
    if (typeof document === "undefined" || lang !== "en") return;
    let cleanup = () => {};
    import("./auto-translate-dom").then(({ enableEnglishDomAutoTranslate }) => {
      cleanup = enableEnglishDomAutoTranslate();
    });
    return () => cleanup();
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("lang", l);
      writeLangToUrl(l);
    }
  };

  const value = useMemo<Ctx>(() => {
    const t = (k: string) => dict[lang]?.[k] ?? dict.en[k] ?? k;
    const dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
    return { lang, dir, setLang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
