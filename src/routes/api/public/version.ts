import { createFileRoute } from "@tanstack/react-router";

const VERSION = "1.0.0";

export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          {
            name: "busniss.org",
            arabic_name: "iDEA Business — IDEA BUSINESS",
            version: VERSION,
            commit: process.env.COMMIT_SHA ?? null,
            built_at: process.env.BUILD_TIME ?? null,
            node_env: process.env.NODE_ENV ?? "production",
          },
          {
            headers: {
              "cache-control": "public, max-age=60",
              "access-control-allow-origin": "*",
            },
          },
        ),
    },
  },
});
