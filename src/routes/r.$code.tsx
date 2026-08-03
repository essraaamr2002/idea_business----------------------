import { createFileRoute, redirect } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

// Public route: /r/:code → logs the click server-side, then 302 to /auth?ref=CODE
export const Route = createFileRoute("/r/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const code = String(params.code || "")
          .toUpperCase()
          .slice(0, 16);
        if (!/^[A-Z0-9]{4,16}$/.test(code)) {
          return Response.redirect(new URL("/", request.url).toString(), 302);
        }
        try {
          const h = request.headers;
          const ip =
            h.get("cf-connecting-ip") ||
            h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            h.get("x-real-ip") ||
            "0.0.0.0";
          const ua = h.get("user-agent") || "";
          const referer = h.get("referer") || "";
          const salt = process.env.REFERRAL_HASH_SALT;
          if (!salt || salt.length < 32)
            return Response.redirect(new URL("/", request.url).toString(), 302);
          const ipHash = createHash("sha256")
            .update(salt + ip)
            .digest("hex")
            .slice(0, 32);
          const uaHash = createHash("sha256")
            .update(salt + ua)
            .digest("hex")
            .slice(0, 32);

          const sb = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
          );
          const url = new URL(request.url);
          const utm: Record<string, string> = {};
          for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
            const v = url.searchParams.get(k);
            if (v) utm[k] = v.slice(0, 80);
          }
          await sb.rpc("log_referral_click", {
            p_code: code,
            p_ip_hash: ipHash,
            p_ua_hash: uaHash,
            p_referer: referer.slice(0, 200) || null,
            p_utm: Object.keys(utm).length ? utm : null,
          });
        } catch {
          // non-fatal
        }
        const dest = new URL("/auth", request.url);
        dest.searchParams.set("ref", code);
        return Response.redirect(dest.toString(), 302);
      },
    },
  },
});
