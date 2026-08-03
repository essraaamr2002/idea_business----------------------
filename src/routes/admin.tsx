import { createFileRoute, Link, Outlet, useRouterState, redirect } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdminOrSeo } from "@/lib/auth-check.functions";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Wallet, Users, FolderKanban, MessagesSquare, Megaphone,
  Settings as SettingsIcon, ScrollText, Plug, Scale, ShieldCheck,
  Coins, ArrowDownToLine, BadgeCheck, Sparkles, Package, ShoppingCart, Zap,
  Activity, FileText, Search, KeyRound, Handshake,
  CreditCard, Globe2, TrendingUp, Rocket, BookOpen,
} from "lucide-react";




export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    try {
      const { isAdmin, isSeo } = await checkIsAdminOrSeo();
      const path = location.pathname;
      const isSeoSurface = path === "/admin/seo" || path.startsWith("/admin/seo/");
      if (!isAdmin && !(isSeo && isSeoSurface)) {
        throw redirect({ to: "/" });
      }
    } catch (e: any) {
      if (e?.isRedirect) throw e;
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});

const groups: { label: string; items: { title: string; to: string; icon: any; exact?: boolean }[] }[] = [
  {
    label: "نظرة عامة",
    items: [
      { title: "لوحة التحكم", to: "/admin", icon: LayoutDashboard, exact: true },
      { title: "فريق الوكلاء الستة", to: "/admin/agents-team", icon: Sparkles },
      { title: "صحة النظام", to: "/admin/health", icon: Activity },
      { title: "حالة النشر", to: "/admin/deploy-status", icon: Rocket },
    ],
  },
  {
    label: "التجارة والطلبات",
    items: [
      { title: "كتالوج المنتجات", to: "/admin/catalog", icon: Package },
      { title: "الطلبات", to: "/admin/orders", icon: ShoppingCart },
      { title: "طلبات الشراء والعروض", to: "/admin/purchases", icon: Handshake },
      { title: "الفواتير", to: "/admin/invoices", icon: FileText },
      { title: "سوق مزودي الخدمات", to: "/admin/marketplace", icon: Package },
    ],
  },
  {
    label: "المالية والمحافظ",
    items: [
      { title: "المحافظ والحسابات", to: "/admin/wallets", icon: Wallet },
      { title: "العمولات", to: "/admin/commissions", icon: Coins },
      { title: "طلبات السحب", to: "/admin/payouts", icon: ArrowDownToLine },
      { title: "طابور الإيداعات", to: "/admin/deposits", icon: Wallet },
      { title: "تسويات Fatora", to: "/admin/fatora", icon: CreditCard },
      { title: "تسويات العملات (FX)", to: "/admin/fx-reconciliation", icon: Coins },
      { title: "العملات", to: "/admin/currencies", icon: Coins },
      { title: "الاشتراكات والتسعير", to: "/admin/subscriptions", icon: CreditCard },
      { title: "السوق الموازي", to: "/admin/market", icon: TrendingUp },
      { title: "طلبات التمويل بالرافعة", to: "/admin/financing-requests", icon: Zap },
      { title: "إعادة محاولة Webhooks", to: "/admin/webhooks-retry", icon: Zap },
    ],
  },
  {
    label: "المستخدمون والمحتوى",
    items: [
      { title: "الأعضاء", to: "/admin/members", icon: Users },
      { title: "طلبات التحقق KYC", to: "/admin/kyc", icon: BadgeCheck },
      { title: "الأوسمة التلقائية", to: "/admin/badges", icon: BadgeCheck },
      { title: "المشاريع والاستثمار", to: "/admin/projects", icon: FolderKanban },
      { title: "المحتوى والمجتمع", to: "/admin/content", icon: MessagesSquare },
      { title: "الرسائل الخاصة", to: "/admin/messages", icon: MessagesSquare },
      { title: "بلاغات الرسائل", to: "/admin/messages/reports", icon: ScrollText },
      { title: "النزاعات", to: "/admin/disputes", icon: Scale },
      { title: "العملاء المحتملون", to: "/admin/leads", icon: Users },
    ],
  },
  {
    label: "التسويق والاتصال",
    items: [
      { title: "البث الجماعي", to: "/admin/broadcast", icon: Megaphone },
      { title: "الإعلانات", to: "/admin/ads-admin", icon: Megaphone },
      { title: "مراجعة الإعلانات", to: "/admin/ads-review", icon: Megaphone },
      { title: "التسويق والبكسلات", to: "/admin/marketing", icon: TrendingUp },
      { title: "إدارة CMS", to: "/admin/cms", icon: FileText },
      { title: "هوية العلامة", to: "/admin/brand-kit", icon: Sparkles },
      { title: "العلامة المائية", to: "/admin/watermark", icon: BadgeCheck },
    ],
  },
  {
    label: "SEO ومحرّك المحتوى",
    items: [
      { title: "لوحة SEO", to: "/admin/seo", icon: Search, exact: true },
      { title: "الكلمات المفتاحية", to: "/admin/seo/keywords", icon: KeyRound },
      { title: "المقالات والمدوّنة", to: "/admin/seo/articles", icon: BookOpen },
      { title: "مولّد المحتوى AI", to: "/admin/seo/generator", icon: Sparkles },
      { title: "Search Console", to: "/admin/seo/search-console", icon: Globe2 },
      { title: "Sitemap", to: "/admin/seo/sitemap", icon: FileText },
    ],
  },
  {
    label: "التكاملات الخارجية",
    items: [
      { title: "مزودو الخدمات (SMS/Email/CRM)", to: "/admin/integrations", icon: Plug },
      { title: "مفاتيح API و Self-Hosted", to: "/admin/integrations-hub", icon: KeyRound },
      { title: "تكاملات الذكاء الاصطناعي", to: "/admin/ai-integrations", icon: Sparkles },
      { title: "أتمتة سير العمل", to: "/admin/automations", icon: Zap },
    ],
  },
  {
    label: "الأمان والنظام",
    items: [
      { title: "مركز عمليات الأمن", to: "/admin/security", icon: ShieldCheck },
      { title: "جدار الحماية (WAF)", to: "/admin/firewall", icon: ShieldCheck },
      { title: "مراقبة AML", to: "/admin/aml", icon: ShieldCheck },
      { title: "Web4 / 14D", to: "/admin/web4", icon: Globe2 },
      { title: "الأدوار والصلاحيات", to: "/admin/roles", icon: ShieldCheck },
      { title: "الإعدادات", to: "/admin/settings", icon: SettingsIcon },
      { title: "سجل التدقيق", to: "/admin/audit", icon: ScrollText },
      { title: "سجلات الأنظمة", to: "/admin/logs", icon: ScrollText },
      { title: "تقرير الفحص الأمني", to: "/admin/security-report", icon: ShieldCheck },
      { title: "التراجع التلقائي (Rollback)", to: "/admin/rollback", icon: ScrollText },
    ],
  },

];





function AdminLayout() {
  const { isAdmin, isSeo, rolesLoading, user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (!user || rolesLoading) {
    return <div className="p-10 text-center text-muted-foreground">جارٍ التحقق…</div>;
  }
  // SEO role is allowed only inside /admin/seo/* (plus the overview /admin/seo).
  const isSeoSurface = path === "/admin/seo" || path.startsWith("/admin/seo/");
  const allowed = isAdmin || (isSeo && isSeoSurface);
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-2xl font-bold">صلاحيات غير كافية</h1>
          <p className="mt-2 text-muted-foreground">يجب أن تكون أدمن للوصول إلى لوحة الإدارة.</p>
          <Link to="/" className="mt-6 inline-block text-primary underline">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div dir="rtl" className="min-h-screen flex w-full bg-muted/30">
        <Sidebar collapsible="icon" side="right">
          <SidebarContent>
            {groups.filter((g) => isAdmin || g.label === "SEO ومحرّك المحتوى").map((g) => (
              <SidebarGroup key={g.label}>
                <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {g.items.map((it) => {
                      const active = it.exact ? path === it.to : path.startsWith(it.to);
                      return (
                        <SidebarMenuItem key={it.to}>
                          <SidebarMenuButton asChild isActive={active}>
                            <Link to={it.to} className="flex items-center gap-2">
                              <it.icon className="h-4 w-4" />
                              <span>{it.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 h-12 flex items-center gap-2 border-b bg-background/95 backdrop-blur px-2 sm:px-3">
            <SidebarTrigger />
            <span className="truncate text-xs sm:text-sm font-semibold">لوحة إدارة IDEA BUSINESS</span>
          </header>
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-auto">
            <Outlet />
          </main>
        </div>
        
      </div>
    </SidebarProvider>
  );
}
