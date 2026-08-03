import { createFileRoute } from "@tanstack/react-router";
import { constantTimeSecretEqual } from "@/lib/http-security.server";

export const Route = createFileRoute("/api/public/hooks/fatora-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET;
        const provided =
          request.headers.get("x-cron-secret") ||
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!constantTimeSecretEqual(provided, cronSecret)) {
          return new Response("unauthorized", { status: 401 });
        }
        const { runFatoraPendingSync } = await import("@/lib/fatora-sync.server");
        const result = await runFatoraPendingSync();
        return Response.json({ ok: true, ...result });
      },
      GET: async () => new Response("method not allowed", { status: 405 }),
    },
  },
});
