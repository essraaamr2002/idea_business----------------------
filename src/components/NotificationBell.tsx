import { useState } from "react";
import { Bell, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markAllRead, markNotificationRead } from "@/lib/notifications.functions";
import { useAuth } from "@/hooks/useAuth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";

export function NotificationBell() {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const list = useServerFn(listNotifications);
  const markAll = useServerFn(markAllRead);
  const markOne = useServerFn(markNotificationRead);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => list(),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  if (!user) return null;
  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("notifications.title")}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background hover:bg-muted transition"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -end-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="text-sm font-bold">{t("notifications.title")}</div>
          {unread > 0 && (
            <button
              onClick={async () => {
                await markAll();
                qc.invalidateQueries({ queryKey: ["notifications"] });
              }}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> {t("notifications.markAll")}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">{t("notifications.empty")}</div>
          ) : (
            items.map((n: any) => (
              <button
                key={n.id}
                onClick={async () => {
                  if (!n.read_at) {
                    await markOne({ data: { id: n.id } });
                    qc.invalidateQueries({ queryKey: ["notifications"] });
                  }
                  if (n.href) window.location.href = n.href;
                }}
                className={`block w-full border-b border-border p-3 text-start transition hover:bg-muted ${n.read_at ? "opacity-60" : "bg-primary/5"}`}
              >
                <div className="text-sm font-semibold">{n.title}</div>
                {n.body && <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString(lang === "ar" ? "ar" : "en-US")}
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
