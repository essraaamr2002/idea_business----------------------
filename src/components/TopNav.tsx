import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  LifeBuoy,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  UserCog,
  Wallet as WalletIcon,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "./BrandLogo";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSelector } from "./LanguageSelector";
import { CurrencySelector } from "./CurrencySelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AvatarRing } from "./UserBadges";
import { supabase } from "@/integrations/supabase/client";

type NavLink = { to: string; label: string; exact?: boolean; auth?: boolean };

export function TopNav() {
  const { dir, t } = useI18n();
  const { user, isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<{
    display_name?: string | null;
    avatar_url?: string | null;
    verified_green?: boolean;
    verified_blue?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      setMe(null);
      return;
    }
    supabase
      .from("profiles")
      .select("display_name, avatar_url, verified_green, verified_blue")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setMe(data as any));
  }, [user?.id]);

  const primaryLinks: NavLink[] = [
    { to: "/", label: t("nav.home"), exact: true },
    { to: "/market", label: t("nav.marketIdx") },
    { to: "/community", label: t("nav.feed") },
    { to: "/journey", label: t("nav.journey"), auth: true },
    { to: "/profile", label: t("nav.profile"), auth: true },
  ];

  const moreLinks: NavLink[] = [
    { to: "/projects/new", label: t("nav.newProject"), auth: true },
    { to: "/assistant", label: t("nav.assistant"), auth: true },
    { to: "/referrals", label: t("nav.referrals"), auth: true },
    { to: "/services", label: t("nav.services") },
    { to: "/services/register", label: t("nav.servicesRegister"), auth: true },
    { to: "/orders", label: t("nav.orders"), auth: true },
    { to: "/my-bids", label: t("nav.myBids") },
    { to: "/community", label: t("nav.community") },
    { to: "/about", label: t("nav.about") },
    { to: "/news", label: t("nav.news") },
    { to: "/watchlist", label: t("nav.watchlist"), auth: true },
    { to: "/secondary-market", label: t("nav.secondaryMarket") },
    { to: "/verify", label: t("nav.verify"), auth: true },
    { to: "/kyc", label: t("nav.kycAi"), auth: true },
    { to: "/wallet", label: t("nav.wallet"), auth: true },
    { to: "/disputes", label: t("nav.disputes"), auth: true },
    { to: "/membership", label: t("nav.membership") },
    { to: "/calculators", label: t("nav.calculators") },
    { to: "/faq", label: t("nav.faq") },
    { to: "/support", label: t("nav.support") },
  ];

  const navLinks = [...primaryLinks, ...moreLinks];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur-md" dir={dir}>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-[72px] sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 xl:gap-5">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                aria-label={t("nav.menu")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border xl:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-[85vw] max-w-xs p-0" dir={dir}>
              <SheetHeader className="border-b border-border p-4">
                <SheetTitle className="text-start">
                  <BrandLogo size={72} withWordmark orientation="stacked" />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col p-3">
                {navLinks.filter((l) => !l.auth || user).map((l) => (
                  <Link
                    key={`${l.to}-${l.label}`}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground [&.active]:bg-primary/10 [&.active]:text-primary"
                    activeProps={{ className: "active" }}
                    activeOptions={{ exact: !!l.exact }}
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="mt-3 flex items-center justify-around border-t border-border pt-3">
                  <LanguageSelector />
                  <CurrencySelector />
                  <ThemeToggle />
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <div className="relative">
                    <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      placeholder={t("search.placeholder")}
                      className="w-full rounded-full border border-border bg-muted/60 py-2 pe-10 ps-4 text-sm font-medium outline-none focus:border-primary focus:bg-background"
                    />
                  </div>
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex shrink-0 items-center" aria-label="IDEA BUSINESS">
            <span className="xl:hidden">
              <BrandLogo size={52} parallax />
            </span>
            <span className="hidden xl:inline-flex">
              <BrandLogo size={68} withWordmark orientation="horizontal" parallax />
            </span>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {primaryLinks.filter((l) => !l.auth || user).map((l) => (
              <NavItem key={l.to} to={l.to} label={l.label} exact={l.exact} />
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                  {t("nav.more")} <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {moreLinks.filter((l) => !l.auth || user).map((l) => (
                  <DropdownMenuItem key={`${l.to}-${l.label}`} onClick={() => nav({ to: l.to })}>
                    {l.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        <div className="hidden min-w-0 flex-1 max-w-sm 2xl:block">
          <div className="relative">
            <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder={t("search.placeholder")}
              className="w-full rounded-full border border-border bg-muted/60 py-2 pe-10 ps-4 text-sm font-medium outline-none transition focus:border-primary focus:bg-background"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            to="/projects/new"
            search={{ edit: undefined }}
            className="hidden lg:inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground shadow-soft hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> {t("nav.newProject")}
          </Link>
          {user && (
            <Link
              to="/messages"
              search={{ c: undefined }}
              aria-label={t("nav.messages")}
              title={t("nav.messages")}
              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-muted"
            >
              <MessageSquare className="h-4 w-4" />
            </Link>
          )}
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={t("nav.settings")}
                className="hidden lg:flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-muted"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2">
              <div className="flex items-center justify-between gap-2 px-1 py-1.5">
                <span className="text-xs font-bold text-muted-foreground">{t("settings.theme")}</span>
                <ThemeToggle />
              </div>
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between gap-2 px-1 py-1.5">
                <span className="text-xs font-bold text-muted-foreground">{t("settings.language")}</span>
                <LanguageSelector />
              </div>
              <DropdownMenuSeparator />
              <div className="flex items-center justify-between gap-2 px-1 py-1.5">
                <span className="text-xs font-bold text-muted-foreground">{t("settings.currency")}</span>
                <CurrencySelector />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {user && !me?.verified_green && (
            <Link
              to="/verify"
              title={t("verify.promptTitle")}
              className="hidden 2xl:inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-extrabold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {t("verify.prompt")}
            </Link>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-10 max-w-[150px] items-center gap-2 rounded-full border border-border ps-1 pe-2.5 text-xs font-bold transition hover:bg-muted sm:max-w-[190px]">
                  <AvatarRing
                    src={me?.avatar_url}
                    alt={me?.display_name ?? user.email ?? "?"}
                    size={32}
                    verified={!!me?.verified_green}
                    premium={!!me?.verified_blue}
                    fallback={me?.display_name ?? user.email ?? "?"}
                  />
                  <span className="hidden sm:inline truncate">{me?.display_name || user.email?.split("@")[0]}</span>
                  {me?.verified_blue && <CheckCircle2 className="h-3.5 w-3.5 text-[#1d9bf0] fill-[#1d9bf0]" />}
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => nav({ to: "/profile" })}>
                  <UserCog className="h-4 w-4 me-2" /> {t("nav.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav({ to: "/wallet" })}>
                  <WalletIcon className="h-4 w-4 me-2" /> {t("nav.wallet")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav({ to: "/support" })}>
                  <ShieldAlert className="h-4 w-4 me-2" /> {t("nav.supervisor")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav({ to: "/support" })}>
                  <LifeBuoy className="h-4 w-4 me-2" /> {t("nav.support")}
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => nav({ to: "/admin" })}>
                      <ShieldAlert className="h-4 w-4 me-2" /> {t("nav.admin")}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 me-2" /> {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button size="sm" variant="outline" className="font-bold">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">{t("nav.login")}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, label, exact }: { to: string; label: string; exact?: boolean }) {
  return (
    <Link
      to={to}
      className="rounded-full px-3 py-1.5 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground [&.active]:bg-primary/10 [&.active]:text-primary"
      activeProps={{ className: "active" }}
      activeOptions={{ exact: !!exact }}
    >
      {label}
    </Link>
  );
}
