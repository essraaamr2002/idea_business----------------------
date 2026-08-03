import { createFileRoute } from "@tanstack/react-router";

// IndexNow key file. The URL key may include the .txt suffix, e.g. /api/public/indexnow/ABC123.txt
export const Route = createFileRoute("/api/public/indexnow/$key")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = process.env.INDEXNOW_KEY;
        if (!key) return new Response("Not configured", { status: 404 });
        const raw = (params as Record<string, string>).key ?? "";
        const reqKey = raw.replace(/\.txt$/i, "");
        if (reqKey !== key) return new Response("Not found", { status: 404 });
        return new Response(key, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
        });
      },
    },
  },
});
