import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Newspaper, TrendingUp, User, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

type Tab = { to: string; labelKey: string; icon: any; exact?: boolean; auth?: boolean };

export function BottomNav() {
  const { user } = useAuth();
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs: Tab[] = [
    { to: "/", labelKey: "nav.home", icon: Home, exact: true },
    { to: "/market", labelKey: "nav.market", icon: TrendingUp },
    { to: "/news", labelKey: "nav.news", icon: Newspaper },
    { to: "/wallet", labelKey: "nav.wallet", icon: Wallet, auth: true },
    { to: "/profile", labelKey: "nav.account", icon: User, auth: true },
  ].filter((tab) => !tab.auth || user);

  return (
    <nav
      aria-label={t("nav.bottom")}
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.exact ? pathname === tab.to : pathname.startsWith(tab.to);
          const label = t(tab.labelKey);
          return (
            <li key={tab.to} className="flex-1">
              <Link
                to={tab.to}
                aria-label={label}
                className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-bold transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "fill-primary/10" : ""}`} />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
