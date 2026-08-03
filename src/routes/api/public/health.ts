import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Cache-Control": "no-store",
};

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const startedAt = Date.now();
        const checks: Record<string, { ok: boolean; latency_ms?: number; error?: string }> = {};

        // DB check via publishable client + narrow public read
        try {
          const t0 = Date.now();
          const supa = createClient<Database>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
          );
          const { error } = await supa.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
          if (error) throw error;
          checks.database = { ok: true, latency_ms: Date.now() - t0 };
        } catch (e: any) {
          checks.database = { ok: false, error: String(e?.message ?? e).slice(0, 200) };
        }

        // Env presence (no values)
        checks.env = {
          ok: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY),
        };

        const ok = Object.values(checks).every((c) => c.ok);
        const body = {
          status: ok ? "ok" : "degraded",
          service: "busniss.org",
          version: process.env.APP_VERSION ?? "1.0.0",
          timestamp: new Date().toISOString(),
          uptime_check_ms: Date.now() - startedAt,
          checks,
        };

        return new Response(JSON.stringify(body, null, 2), {
          status: ok ? 200 : 503,
          headers: { ...CORS, "content-type": "application/json; charset=utf-8" },
        });
      },
    },
  },
});
