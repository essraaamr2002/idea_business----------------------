import { createFileRoute } from "@tanstack/react-router";

// Lightweight readiness probe — no external dependencies.
// Use this for load-balancer / uptime pings; use /api/public/health for deep checks.
export const Route = createFileRoute("/api/public/ping")({
  server: {
    handlers: {
      GET: async () =>
        new Response("pong", {
          status: 200,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
          },
        }),
    },
  },
});
