import { forwardRef, useState, type ButtonHTMLAttributes, type MouseEvent } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

type Props = ButtonProps & {
  trackId?: string;
  onClickAsync?: (e: MouseEvent<HTMLButtonElement>) => Promise<unknown> | unknown;
};

// Drop-in Button with click tracking + automatic failure toast + telemetry.
// Use in critical flows (wallet, auctions, deposits) — replaces <Button>.
export const SafeButton = forwardRef<HTMLButtonElement, Props>(function SafeButton(
  { onClickAsync, onClick, trackId, children, ...rest }, ref,
) {
  const [busy, setBusy] = useState(false);

  async function handle(e: MouseEvent<HTMLButtonElement>) {
    const id = trackId || (typeof children === "string" ? children : "btn");
    try {
      if (typeof window !== "undefined") {
        // best-effort lightweight track via diagnostics buffer
        // eslint-disable-next-line no-console
        console.info(`[click] ${id} @ ${location.pathname}`);
      }
      setBusy(true);
      if (onClick) onClick(e);
      if (onClickAsync) await onClickAsync(e);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`فشل الإجراء: ${msg}`, { description: `الزر: ${id}` });
      try {
        await fetch("/api/public/client-log", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            source: "onclick-failure",
            action: id,
            ok: false,
            error: msg.slice(0, 500),
            context: { path: location.pathname },
            url: location.href,
          }),
          keepalive: true,
        });
      } catch { /* swallow */ }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button ref={ref} disabled={busy || rest.disabled} onClick={handle} {...rest}>
      {children}
    </Button>
  );
});
