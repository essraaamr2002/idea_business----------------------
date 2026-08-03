import { ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Wallet as WalletIcon,
  LifeBuoy,
  UserCog,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Megaphone,
} from "lucide-react";
import { useAuth as _useAuthIgnored } from "@/hooks/useAuth";
void _useAuthIgnored;
import { useAuth } from "@/hooks/useAuth";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; auth?: boolean };
type NavGroup = { title: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    title: "مساحة العمل",
    items: [
      { to: "/profile", label: "لوحة التحكم", icon: LayoutDashboard, auth: true },
      { to: "/community", label: "المجتمع والمشاريع", icon: Users },
      { to: "/ads", label: "إعلاناتي", icon: Megaphone, auth: true },
    ],
  },
  {
    title: "المالية",
    items: [
      { to: "/wallet", label: "المحفظة و IBAN", icon: WalletIcon, auth: true },
    ],
  },
  {
    title: "الحساب والدعم",
    items: [
      { to: "/profile", label: "ملفي الشخصي والتوثيق", icon: UserCog, auth: true },
      { to: "/support", label: "الدعم والتذاكر", icon: LifeBuoy },
    ],
  },
];
void Sparkles;

export function WorkspaceShell({
  children,
  ticker,
}: {
  children: ReactNode;
  ticker?: ReactNode;
}) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Global AI ambient layer — visible on every page */}
      <div className="ai-backdrop" aria-hidden="true" />
      <div className="ai-grid-overlay" aria-hidden="true" />
      <div className="relative z-10 flex flex-col flex-1">
      {ticker}
      <div className="flex-1 mx-auto w-full max-w-[1600px] flex gap-0">
        {/* Sidebar */}
        <aside
          className={`hidden md:flex sticky top-20 self-start h-[calc(100vh-5rem)] flex-col border-s border-border bg-card/40 backdrop-blur-sm transition-all duration-300 ${
            collapsed ? "w-16" : "w-64"
          }`}
        >
          <div className="flex items-center justify-between p-3 border-b border-border">
            {!collapsed && (
              <span className="text-xs font-bold text-muted-foreground tracking-wider">
                المنصة الموحدة
              </span>
            )}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground"
              aria-label="طي/فتح القائمة الجانبية"
            >
              {collapsed ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-4">
            {GROUPS.map((group) => (
              <div key={group.title}>
                {!collapsed && (
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                    {group.title}
                  </div>
                )}
                <ul className="space-y-0.5">
                  {group.items
                    .filter((i) => !i.auth || user)
                    .map((item) => {
                      const active =
                        pathname === item.to ||
                        (item.to !== "/" && pathname.startsWith(item.to));
                      const Icon = item.icon;
                      return (
                        <li key={item.to}>
                          <Link
                            to={item.to}
                            className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                              active
                                ? "bg-primary text-primary-foreground shadow-soft"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                            title={item.label}
                          >
                            <Icon className={`h-4 w-4 shrink-0 ${active ? "" : "text-primary/70"}`} />
                            {!collapsed && <span className="truncate">{item.label}</span>}
                          </Link>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="p-3 border-t border-border">
            {!collapsed ? (
              <div className="ai-card ai-beam-line rounded-xl p-3 text-xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="ai-dot" />
                  <p className="font-bold ai-glow-text">منصة مدعومة بالذكاء</p>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  محرّك AI يقترح، يحلّل المخاطر، ويرصد الاحتيال لحظياً.
                </p>
              </div>
            ) : (
              <div className="grid place-items-center text-primary">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
      </div>

    </div>
  );
}
