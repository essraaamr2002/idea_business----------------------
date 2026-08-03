// Cron endpoint: GET /api/public/cron/news-sweep
// Runs the six-agent SEO pipeline to enrich recent articles that are missing
// meta_description / focus_keyword / tags. Safe to call repeatedly.
// Protect with CRON_SECRET header `x-cron-secret` (if env set).
import { createFileRoute } from "@tanstack/react-router";
import { constantTimeSecretEqual } from "@/lib/http-security.server";

const HEADERS = {
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-cron-secret",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export const Route = createFileRoute("/api/public/cron/news-sweep")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: HEADERS }),
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (!secret) {
          return new Response(JSON.stringify({ ok: false, error: "server_misconfigured" }), {
            status: 500,
            headers: { ...HEADERS, "content-type": "application/json; charset=utf-8" },
          });
        }
        // Header only — never accept secret in URL (it leaks into access logs)
        const got = request.headers.get("x-cron-secret");
        if (!constantTimeSecretEqual(got, secret)) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401,
            headers: { ...HEADERS, "content-type": "application/json; charset=utf-8" },
          });
        }
        try {
          const { enrichRecentArticlesSEO } = await import("@/lib/news-auto.server");
          const result = await enrichRecentArticlesSEO(25);
          return new Response(JSON.stringify({ ok: true, ...result }), {
            status: 200,
            headers: { ...HEADERS, "content-type": "application/json; charset=utf-8" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
            status: 500,
            headers: { ...HEADERS, "content-type": "application/json; charset=utf-8" },
          });
        }
      },
    },
  },
});
