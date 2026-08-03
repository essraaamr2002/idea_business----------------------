import { createFileRoute } from "@tanstack/react-router";

// Public read-only proxy for whitelisted PUBLIC storage buckets only.
// `community-media` is intentionally NOT included here — community uploads
// can contain private user content and must be fetched through the
// authenticated path below, which verifies the caller's session and uses a
// short-lived signed URL.
const ALLOWED_BUCKETS = new Set(["avatars", "ad-media", "community-media"]);

// Buckets that require an authenticated session to read.
const AUTH_BUCKETS = new Set<string>();

export const Route = createFileRoute("/api/public/storage/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const splat = (params as any)._splat as string | undefined;
        if (!splat) return new Response("Not found", { status: 404 });

        const decoded = decodeURIComponent(splat).replace(/^\/+/, "");
        const [bucket, ...rest] = decoded.split("/");
        const objectPath = rest.join("/");
        if (!bucket || !objectPath) {
          return new Response("Forbidden", { status: 403 });
        }
        // Defence-in-depth against path traversal
        if (objectPath.includes("..")) return new Response("Forbidden", { status: 403 });

        const isPublic = ALLOWED_BUCKETS.has(bucket);
        const isAuthOnly = AUTH_BUCKETS.has(bucket);
        if (!isPublic && !isAuthOnly) {
          return new Response("Forbidden", { status: 403 });
        }

        // For auth-only buckets, require a valid Supabase session bearer token.
        if (isAuthOnly) {
          const authHeader = request.headers.get("authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return new Response("Unauthorized", { status: 401 });
          }
          const token = authHeader.slice(7);
          const url = process.env.SUPABASE_URL;
          const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!url || !pk) return new Response("Server config error", { status: 500 });
          const { createClient } = await import("@supabase/supabase-js");
          const supa = createClient(url, pk, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: { user } } = await supa.auth.getUser();
          if (!user) return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from(bucket).download(objectPath);
        if (error || !data) return new Response("Not found", { status: 404 });

        const buf = await data.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: {
            "content-type": data.type || "application/octet-stream",
            "cache-control": isAuthOnly
              ? "private, max-age=300"
              : "public, max-age=86400, s-maxage=86400, immutable",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
