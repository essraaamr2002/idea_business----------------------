import { createFileRoute } from "@tanstack/react-router";
import { constantTimeSecretEqual } from "@/lib/http-security.server";

export const Route = createFileRoute("/api/public/hooks/renew-memberships")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (!constantTimeSecretEqual(request.headers.get("x-cron-secret"), secret)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("renew_memberships_daily" as any);
        if (error)
          return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
        // Notify expired members
        try {
          const { data: expired } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("membership", "basic")
            .gte("updated_at", new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString());
          const { emailMembershipExpired } = await import("@/lib/email-events.server");
          for (const p of expired ?? []) await emailMembershipExpired((p as any).id);
        } catch {}
        return Response.json({ ok: true, result: data });
      },
    },
  },
});
