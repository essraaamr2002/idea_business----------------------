import { Link, useRouterState } from "@tanstack/react-router";
import { Bot, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { reportClientEvent } from "@/lib/client-telemetry";
import { useI18n } from "@/lib/i18n";

const TEASER_KEY = "ib:assistant-teaser-dismissed:v1";

export function AssistantFab() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { lang } = useI18n();
  const [showTeaser, setShowTeaser] = useState(false);

  const label = lang === "ar" ? "المساعد الذكي" : "AI Assistant";
  const signInLabel = lang === "ar" ? "سجّل الدخول لاستخدام المساعد الذكي" : "Sign in to use the AI assistant";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem(TEASER_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setShowTeaser(true), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissTeaser = () => {
    setShowTeaser(false);
    try {
      window.localStorage.setItem(TEASER_KEY, String(Date.now()));
    } catch {}
  };

  if (pathname.startsWith("/assistant") || pathname.startsWith("/auth")) return null;

  return (
    <div className="fixed z-50 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] end-3 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 sm:end-4 md:bottom-6">
      {showTeaser && (
        <div className="relative max-w-[calc(100vw-1.5rem)] rounded-2xl border border-primary/30 bg-card/95 p-3 pe-8 text-xs shadow-xl backdrop-blur animate-in fade-in slide-in-from-bottom-2 sm:max-w-xs">
          <button type="button" onClick={dismissTeaser} aria-label={lang === "ar" ? "إغلاق" : "Close"} className="absolute top-1.5 end-1.5 rounded-full p-1 text-muted-foreground hover:bg-muted">
            <X className="h-3 w-3" />
          </button>
          <div className="font-extrabold text-primary mb-1">
            {lang === "ar" ? "6 وكلاء ذكاء اصطناعي بخدمتك" : "6 AI agents ready to help"}
          </div>
          <div className="text-muted-foreground leading-relaxed">
            {lang === "ar"
              ? "القائد، المطور، المصمم، الباحث، الكاتب، المحلل - اسأل وسيختار النظام الأنسب لك تلقائياً."
              : "Lead, developer, designer, researcher, writer, and analyst agents. Ask once and the system routes you to the best fit."}
          </div>
        </div>
      )}
      <Link
        to={user ? "/assistant" : "/auth"}
        aria-label={user ? label : signInLabel}
        className="relative group flex max-w-full items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg shadow-primary/40 transition-all hover:scale-105 hover:shadow-primary/60"
        onClick={() => {
          dismissTeaser();
          reportClientEvent({ source: "assistant-fab", action: "click", ok: true, context: { authed: !!user } });
        }}
      >
        <Bot className="h-5 w-5" />
        <span className="text-sm font-bold hidden sm:inline">{label}</span>
        <span className="absolute -top-1 -end-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
      </Link>
    </div>
  );
}
