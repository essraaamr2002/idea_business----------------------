import { createFileRoute } from "@tanstack/react-router";
import { constantTimeSecretEqual } from "@/lib/http-security.server";
import { sealDailyTrustBlock } from "@/lib/trust-chain.functions";

export const Route = createFileRoute("/api/public/seal-trust-block")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const provided =
          request.headers.get("x-cron-secret") ||
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
          request.headers.get("apikey");
        if (!constantTimeSecretEqual(provided, secret)) {
          return new Response("unauthorized", { status: 401 });
        }
        const block = await sealDailyTrustBlock();
        return Response.json(block);
      },
    },
  },
});
