import { createFileRoute } from "@tanstack/react-router";

// Lightweight client telemetry sink. Used by the browser to report RPC /
// query failures (e.g. get_public_profiles) so they're visible in production
// without needing a Sentry account. Writes to public.integration_logs
// (admin-only RLS) via the service-role client.
//
// Hardened against abuse:
//   * Only the `community-profiles-rpc` source is accepted right now.
//   * Payload is truncated and shape-validated.
//   * Simple in-memory IP throttle (best-effort; Workers are stateless so
//     this only blocks bursty same-instance floods).

function responseHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const ownOrigin = new URL(request.url).origin;
  return {
    ...(origin === ownOrigin ? { "Access-Control-Allow-Origin": ownOrigin } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Cache-Control": "no-store",
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

const ALLOWED_SOURCES = new Set([
  "community-profiles-rpc",
  "diagnostics-report",
  "onclick-failure",
]);

const ipHits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

function throttle(ip: string): boolean {
  const now = Date.now();
  const slot = ipHits.get(ip);
  if (!slot || slot.resetAt < now) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  slot.count += 1;
  return slot.count > MAX_PER_WINDOW;
}

function clip(value: unknown, max = 500): string {
  const s = typeof value === "string" ? value : JSON.stringify(value ?? null);
  return s.length > max ? s.slice(0, max) : s;
}

export const Route = createFileRoute("/api/public/client-log")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: responseHeaders(request) }),
      POST: async ({ request }) => {
        const CORS = responseHeaders(request);
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin) {
          return new Response(JSON.stringify({ ok: false, error: "cross_origin_rejected" }), {
            status: 403,
            headers: { ...CORS, "content-type": "application/json" },
          });
        }
        const contentType = request.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().startsWith("application/json")) {
          return new Response(JSON.stringify({ ok: false, error: "unsupported_media_type" }), {
            status: 415,
            headers: { ...CORS, "content-type": "application/json" },
          });
        }
        const declaredLength = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(declaredLength) && declaredLength > 16_384) {
          return new Response(JSON.stringify({ ok: false, error: "payload_too_large" }), {
            status: 413,
            headers: { ...CORS, "content-type": "application/json" },
          });
        }

        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";

        if (throttle(ip)) {
          return new Response(JSON.stringify({ ok: false, error: "rate_limited" }), {
            status: 429,
            headers: { ...CORS, "content-type": "application/json" },
          });
        }

        let body: any;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "bad_json" }), {
            status: 400,
            headers: { ...CORS, "content-type": "application/json" },
          });
        }

        const source = String(body?.source ?? "");
        if (!ALLOWED_SOURCES.has(source)) {
          return new Response(JSON.stringify({ ok: false, error: "source_not_allowed" }), {
            status: 400,
            headers: { ...CORS, "content-type": "application/json" },
          });
        }

        const action = clip(body?.action ?? "unknown", 80);
        const status = body?.ok === true ? "success" : "error";
        const errorText = body?.error ? clip(body.error, 500) : null;
        const payload = {
          context: clip(body?.context ?? {}, 1000),
          url: clip(body?.url ?? "", 300),
          ua: clip(request.headers.get("user-agent") ?? "", 200),
          ip,
        };

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("integration_logs").insert({
            provider: source,
            action,
            status,
            error: errorText,
            payload,
          });
        } catch (e) {
          // Never fail the client — telemetry is best-effort.
          console.error("[client-log] insert failed", e);
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 202,
          headers: { ...CORS, "content-type": "application/json" },
        });
      },
    },
  },
});
