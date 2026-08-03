import { useEffect, useRef, useState, type ReactNode } from "react";
import { HelpCircle, X } from "lucide-react";
import { useTipsPreference } from "@/hooks/useTipsPreference";

interface SmartTipProps {
  /** Stable id used to remember dismissal per-tip (optional). */
  id?: string;
  /** Short Arabic label shown as the tip title. */
  title?: string;
  /** Body of the tip. Plain text or JSX. */
  children: ReactNode;
  /** Auto-hide delay in ms. Default 6000. */
  autoHideMs?: number;
  /** Tip side relative to the trigger. */
  side?: "top" | "bottom" | "left" | "right";
  /** Optional className for the trigger button. */
  className?: string;
}

/**
 * SmartTip — small "?" badge that opens a contextual explainer popover.
 * - Auto-closes after `autoHideMs` (default 6s).
 * - Globally disabled via the user preference (useTipsPreference).
 * - Click outside / press Esc / press the × button to close immediately.
 */
export function SmartTip({
  id,
  title,
  children,
  autoHideMs = 6000,
  side = "top",
  className = "",
}: SmartTipProps) {
  const { enabled } = useTipsPreference();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    if (autoHideMs > 0) {
      timerRef.current = window.setTimeout(() => setOpen(false), autoHideMs);
    }
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, autoHideMs]);

  if (!enabled) return null;

  const sideClass =
    side === "bottom" ? "top-full mt-2 start-1/2 -translate-x-1/2"
    : side === "left" ? "end-full me-2 top-1/2 -translate-y-1/2"
    : side === "right" ? "start-full ms-2 top-1/2 -translate-y-1/2"
    : "bottom-full mb-2 start-1/2 -translate-x-1/2";

  return (
    <span ref={wrapRef} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        aria-label={title ?? "شرح"}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          role="tooltip"
          data-tip-id={id}
          className={`absolute z-50 w-64 max-w-[80vw] rounded-xl border border-border bg-popover p-3 text-start text-xs text-popover-foreground shadow-xl ${sideClass}`}
        >
          <div className="flex items-start justify-between gap-2">
            {title && <div className="text-sm font-extrabold text-foreground">{title}</div>}
            <button
              type="button"
              aria-label="إغلاق"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-1 leading-relaxed text-muted-foreground">{children}</div>
          {autoHideMs > 0 && (
            <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary"
                style={{ animation: `smartTipBar ${autoHideMs}ms linear forwards` }}
              />
            </div>
          )}
          <style>{`@keyframes smartTipBar { from { width: 100% } to { width: 0% } }`}</style>
        </div>
      )}
    </span>
  );
}

/** Toggle control for the global tips preference. Use in settings pages. */
export function SmartTipsToggle() {
  const { enabled, setEnabled } = useTipsPreference();
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => setEnabled(e.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      <span>عرض الشروحات الذكية على المنصة</span>
    </label>
  );
}
