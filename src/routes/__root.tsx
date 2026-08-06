import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import appCss from "../styles.css?url";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SplashScreen } from "@/components/SplashScreen";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MarketingPixels } from "@/components/MarketingPixels";
import { RouteProgress } from "@/components/RouteProgress";
import { BottomNav } from "@/components/BottomNav";
import { CommandPalette } from "@/components/CommandPalette";
import { ScrollToTop } from "@/components/ScrollToTop";
import { CookieConsent } from "@/components/CookieConsent";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Invite3WinBanner } from "@/components/Invite3WinBanner";
import { ExitIntentBar } from "@/components/ExitIntentBar";
import { SocialProofToast } from "@/components/SocialProofToast";

import { LifecycleBanners } from "@/components/LifecycleBanners";
import { PushNotifications } from "@/components/PushNotifications";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";

import { TopNav } from "@/components/TopNav";
import { VerifyPromptPopup } from "@/components/VerifyPromptPopup";
import { Footer } from "@/components/Footer";
import { AssistantFab } from "@/components/AssistantFab";
import { BrandWatermark } from "@/components/BrandWatermark";
import { DiagnosticsButton } from "@/components/DiagnosticsButton";
import { Toaster } from "sonner";
import { Home, Search, TrendingUp, Newspaper, LifeBuoy, type LucideIcon } from "lucide-react";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { Web4Provider } from "@/components/web4/Web4Provider";

function NotFoundComponent() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/~/oauth/initiate")) {
      window.location.replace("/auth");
    }
  }, []);

  const links: { to: string; label: string; icon: LucideIcon }[] = [
    { to: "/", label: "الرئيسية", icon: Home },
    { to: "/market", label: "السوق الموازي", icon: TrendingUp },
    { to: "/news", label: "الأخبار", icon: Newspaper },
    { to: "/faq", label: "الأسئلة الشائعة", icon: Search },
    { to: "/support", label: "الدعم", icon: LifeBuoy },
  ];
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-2xl text-center">
        <div className="mx-auto inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-1 text-xs font-extrabold text-primary">
          404
        </div>
        <h1 className="mt-4 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-7xl font-black text-transparent md:text-9xl">
          404
        </h1>
        <h2 className="mt-2 text-2xl font-black text-foreground">
          الصفحة التي تبحث عنها غير موجودة
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          قد يكون الرابط قديماً أو غير صحيح. اختر من الوجهات التالية:
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                className="group flex items-center gap-2 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm font-bold backdrop-blur transition hover:border-primary hover:bg-primary/5"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="group-hover:text-primary">{l.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5",
      },
      {
        httpEquiv: "Content-Security-Policy",
        content:
          "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data: blob:; connect-src 'self' https: wss:; base-uri 'self'; form-action 'self'; object-src 'none'",
      },
      { httpEquiv: "X-Content-Type-Options", content: "nosniff" },
      { httpEquiv: "Referrer-Policy", content: "strict-origin-when-cross-origin" },
      {
        httpEquiv: "Permissions-Policy",
        content: "geolocation=(), microphone=(), camera=(self), payment=(self)",
      },
      { name: "robots", content: "index, follow" },
      { title: "IDEA BUSINESS — مشاريع دول الشرق الأوسط وشمال إفريقيا" },
      {
        name: "description",
        content:
          "IDEA BUSINESS: منصة عربية لتداول الأفكار وتنمية الاستثمارات — تمويل جماعي، تداول أسهم، ضمانات قانونية، ومحفظة رقمية لكل دول الشرق الأوسط وشمال إفريقيا.",
      },
      {
        name: "keywords",
        content:
          "IDEA BUSINESS, تمويل جماعي, استثمار, مشاريع ناشئة, رواد أعمال, السوق الموازي, الشرق الأوسط, شمال إفريقيا, MENA, busniss",
      },
      { name: "application-name", content: "IDEA BUSINESS" },
      { name: "apple-mobile-web-app-title", content: "IDEA BUSINESS" },
      { name: "theme-color", content: "#06b6d4" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "IDEA BUSINESS" },
      { property: "og:title", content: "IDEA BUSINESS — حيث تتداول الأفكار وتنمو الاستثمارات" },
      {
        property: "og:description",
        content: "منصة عربية لتداول الأفكار وتنمية الاستثمارات في الشرق الأوسط وشمال إفريقيا.",
      },
      { property: "og:url", content: "https://busniss.org" },
      { property: "og:locale", content: "ar_AR" },
      { property: "og:image", content: "https://busniss.org/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "IDEA BUSINESS — شعار الهوية" },
      {
        property: "og:logo",
        content: "https://busniss.org/og-logo.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "IDEA BUSINESS — حيث تتداول الأفكار وتنمو الاستثمارات" },
      {
        name: "twitter:description",
        content: "منصة عربية لتداول الأفكار وتنمية الاستثمارات في الشرق الأوسط وشمال إفريقيا.",
      },
      { name: "twitter:image", content: "https://busniss.org/og-image.jpg" },
      { name: "twitter:image:alt", content: "IDEA BUSINESS — شعار الهوية" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/icon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/icon-16.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Libre+Baskerville:wght@400;700&family=Noto+Naskh+Arabic:wght@400;500;600;700&family=IBM+Plex+Serif:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap",
      },
      { rel: "alternate", hrefLang: "ar", href: "https://busniss.org/" },
      { rel: "alternate", hrefLang: "en", href: "https://busniss.org/" },
      { rel: "alternate", hrefLang: "fr", href: "https://busniss.org/" },
      { rel: "alternate", hrefLang: "es", href: "https://busniss.org/" },
      { rel: "alternate", hrefLang: "zh", href: "https://busniss.org/" },
      { rel: "alternate", hrefLang: "ru", href: "https://busniss.org/" },
      { rel: "alternate", hrefLang: "pt", href: "https://busniss.org/" },
      { rel: "alternate", hrefLang: "de", href: "https://busniss.org/" },
      { rel: "alternate", hrefLang: "ja", href: "https://busniss.org/" },
      { rel: "alternate", hrefLang: "hi", href: "https://busniss.org/" },
      { rel: "alternate", hrefLang: "tr", href: "https://busniss.org/" },
      { rel: "alternate", hrefLang: "ur", href: "https://busniss.org/" },
      { rel: "alternate", hrefLang: "x-default", href: "https://busniss.org/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://busniss.org/#organization",
              name: "IDEA BUSINESS",
              alternateName: [
                "IDEA BUSINESS",
                "IDEA BUSINESS Platform",
                "busniss.org",
                "iDEA Business",
              ],
              url: "https://busniss.org",
              logo: {
                "@type": "ImageObject",
                url: "https://busniss.org/og-logo.png",
                width: 512,
                height: 512,
              },
              image: "https://busniss.org/og-image.jpg",
              description:
                "منصة IDEA BUSINESS هي أول بورصة موازية للأفكار في العالم العربي. تربط رواد الأعمال بالمستثمرين الدوليين عبر الذكاء الاصطناعي مع ضمانات قانونية كاملة.",
              foundingDate: "2024",
              areaServed: {
                "@type": "GeoCircle",
                name: "العالم العربي وما يتجاوزه",
                geoMidpoint: { "@type": "GeoCoordinates", latitude: 24.7136, longitude: 46.6753 },
                geoRadius: "8000000",
              },
              knowsAbout: [
                "استثمار المشاريع الناشئة",
                "تمويل الأعمال",
                "ريادة الأعمال",
                "البورصة الموازية",
                "تداول أسهم المشاريع",
                "العقود الذكية",
                "المحافظ الرقمية",
              ],
              slogan: "حيث تتداول الأفكار وتنمو الاستثمارات",
              sameAs: [
                "https://twitter.com/fekrabusiness",
                "https://linkedin.com/company/fekrabusiness",
                "https://instagram.com/fekrabusiness",
                "https://youtube.com/@fekrabusiness",
                "https://facebook.com/fekrabusiness",
              ],
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  contactType: "customer support",
                  availableLanguage: ["Arabic", "English"],
                  url: "https://busniss.org/support",
                },
              ],
            },
            {
              "@type": "WebSite",
              "@id": "https://busniss.org/#website",
              url: "https://busniss.org",
              name: "IDEA BUSINESS",
              inLanguage: ["ar", "en"],
              publisher: { "@id": "https://busniss.org/#organization" },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://busniss.org/market?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="ib-circuit-bg min-h-screen overflow-x-hidden text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthInvalidator() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      qc.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, qc]);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <CurrencyProvider>
              <Web4Provider>
                <a
                  href="#main-content"
                  className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:font-extrabold"
                >
                  تخطّي إلى المحتوى
                </a>
                <RouteProgress />
                <OfflineBanner />
                <AnnouncementBar />
                <Invite3WinBanner />
                <LifecycleBanners />
                <AuthInvalidator />
                <SplashScreen />
                <MarketingPixels />
                <TopNav />
                <div id="main-content" className="min-w-0 overflow-x-clip pb-20 md:pb-0">
                  <Outlet />
                </div>
                <Footer />
                <BottomNav />
                <BrandWatermark />
                <AssistantFab />
                <ScrollToTop />
                {import.meta.env.DEV && <DiagnosticsButton />}
                <CommandPalette />
                <KeyboardShortcutsHelp />
                <CookieConsent />
                <SocialProofToast />
                <ExitIntentBar />
                <PushNotifications />

                <VerifyPromptPopup />

                <Toaster position="top-center" richColors closeButton />
              </Web4Provider>
            </CurrencyProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
