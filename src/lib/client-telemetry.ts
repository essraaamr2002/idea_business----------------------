// Best-effort client telemetry. Posts a structured event to
// /api/public/client-log which writes to integration_logs (admin-readable).
// Use for production-only signals you want surfaced quickly; never block UI.

export type TelemetrySource =
  | "community-profiles-rpc"
  | "assistant-fab"
  | "service-tip"
  | "assistant-chat"
  | "journey";

export type TelemetryContext = {
  /** Current journey stage name, when the event happened inside a stage-aware surface. */
  stageName?: string;
  /** Stable CTA identifier — makes it easy to rank which button gets used most. */
  ctaId?: string;
  [key: string]: unknown;
};

type ReportInput = {
  source: TelemetrySource;
  action: string;
  ok: boolean;
  error?: string | null;
  context?: TelemetryContext;
};

export function reportClientEvent(input: ReportInput): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      ...input,
      url: window.location.href,
    });
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/public/client-log", blob);
      return;
    }
    void fetch("/api/public/client-log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Never throw from telemetry.
  }
}
