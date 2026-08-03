import { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface PageHeaderProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

/** Lightweight, AI-tinted page header used across all secondary pages. */
export function PageHeader({ kicker, title, subtitle, icon, actions }: PageHeaderProps) {
  return (
    <header
      className="relative mb-8 overflow-hidden rounded-3xl border border-primary/15 p-6 sm:p-8"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--color-primary) 8%, var(--color-card)) 0%, var(--color-card) 55%, color-mix(in oklab, var(--color-primary) 4%, var(--color-card)) 100%)",
      }}
    >
      {/* soft ambient glows */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -end-20 h-60 w-60 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -start-16 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
      {/* faint grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse at top left, black 20%, transparent 75%)",
        }}
      />

      <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          {kicker && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary backdrop-blur-sm">
              <span className="ai-dot" aria-hidden />
              {icon ?? <Sparkles className="h-3 w-3" />}
              {kicker}
            </div>
          )}
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
