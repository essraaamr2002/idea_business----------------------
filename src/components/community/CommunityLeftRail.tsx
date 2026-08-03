import { Link } from "@tanstack/react-router";
import {
  Home, Compass, Bell, Mail, Bookmark, User as UserIcon,
  Briefcase, Wallet, ShieldCheck, Feather,
} from "lucide-react";

const items = [
  { to: "/", icon: Home, label: "الرئيسية" },
  { to: "/search", icon: Compass, label: "استكشاف" },
  { to: "/notifications", icon: Bell, label: "الإشعارات" },
  { to: "/messages", icon: Mail, label: "الرسائل" },
  { to: "/saved", icon: Bookmark, label: "المحفوظات" },
  { to: "/community", icon: Feather, label: "المجتمع" },
  { to: "/projects", icon: Briefcase, label: "الاستثمار" },
  { to: "/wallet", icon: Wallet, label: "المحفظة" },
  { to: "/verify", icon: ShieldCheck, label: "التحقق" },
  { to: "/profile", icon: UserIcon, label: "الملف الشخصي" },
] as const;

export function CommunityLeftRail({ onCompose }: { onCompose?: () => void }) {
  return (
    <aside className="sticky top-20 hidden h-fit w-full max-w-[260px] shrink-0 lg:block">
      <nav className="flex flex-col gap-1">
        {items.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to as any}
            activeProps={{ className: "bg-white/10 text-foreground" }}
            className="flex items-center gap-3 rounded-full px-4 py-2.5 text-base font-bold text-slate-200 transition-colors hover:bg-white/5"
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={onCompose}
          className="mt-3 w-full rounded-full bg-cyan-500 px-4 py-3 text-sm font-extrabold text-slate-950 transition-colors hover:bg-cyan-400"
        >
          نشر تغريدة
        </button>
      </nav>
    </aside>
  );
}
