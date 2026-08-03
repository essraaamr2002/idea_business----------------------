import { X, Info, Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { reportClientEvent } from "@/lib/client-telemetry";
import { useI18n } from "@/lib/i18n";

export interface ServiceTipProps {
  id: string;
  title: string;
  body: string;
  icon?: "info" | "lightbulb";
  tone?: "primary" | "emerald" | "amber";
  className?: string;
}

const KEY = (id: string) => `ib:tip-dismissed:${id}`;

const toneMap = {
  primary: "border-primary/30 bg-primary/5 text-foreground",
  emerald: "border-emerald-500/30 bg-emerald-500/5 text-foreground",
  amber: "border-amber-500/30 bg-amber-500/5 text-foreground",
} as const;

const serviceTipCopy: Record<string, { title: string; body: string }> = {
  "home-agents-v1": {
    title: "New: 6 AI agents at your service",
    body: "Tap the AI Assistant button at the bottom of the screen to get instant answers from specialized agents for investing, financing, documentation, marketing, analytics, and support. The system routes your question to the best agent automatically.",
  },
  "home-market-v1": {
    title: "Secondary market - quick overview",
    body: "IDEA BUSINESS lets verified project shares trade with legal guarantees. Browse projects, review independent signals, then make your decision with confidence.",
  },
};

export function ServiceTip({ id, title, body, icon = "info", tone = "primary", className = "" }: ServiceTipProps) {
  const { lang } = useI18n();
  const [dismissed, setDismissed] = useState(true);
  const text = lang === "en" ? serviceTipCopy[id] : undefined;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(!!window.localStorage.getItem(KEY(id)));
  }, [id]);

  if (dismissed) return null;

  const Icon = icon === "lightbulb" ? Lightbulb : Info;

  return (
    <div
      role="note"
      aria-labelledby={`tip-${id}-title`}
      className={`relative rounded-2xl border p-4 pe-10 text-sm shadow-sm animate-in fade-in slide-in-from-top-1 ${toneMap[tone]} ${className}`}
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang}
    >
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          try {
            window.localStorage.setItem(KEY(id), String(Date.now()));
          } catch {}
          reportClientEvent({ source: "service-tip", action: "dismiss", ok: true, context: { id } });
        }}
        aria-label={lang === "ar" ? "إخفاء الشرح" : "Dismiss tip"}
        className="absolute top-2 end-2 rounded-full p-1 text-muted-foreground transition hover:bg-background/80 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-background/60 p-2 border border-border/50">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div id={`tip-${id}-title`} className="font-extrabold mb-1">{text?.title ?? title}</div>
          <p className="text-muted-foreground leading-relaxed">{text?.body ?? body}</p>
        </div>
      </div>
    </div>
  );
}

export function resetAllTips() {
  if (typeof window === "undefined") return;
  const toRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k?.startsWith("ib:tip-dismissed:")) toRemove.push(k);
  }
  toRemove.forEach((k) => window.localStorage.removeItem(k));
}
