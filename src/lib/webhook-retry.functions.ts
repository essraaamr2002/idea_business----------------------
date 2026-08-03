import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Unauthorized — admin only");
}

/** List recent webhook failures grouped by trace_id. */
export const listWebhookFailures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ days: z.number().int().min(1).max(30).default(7), limit: z.number().int().min(1).max(200).default(50) }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();

    // Fetch failed events
    const { data: rows, error } = await supabaseAdmin
      .from("fatora_logs" as any)
      .select("id, trace_id, kind, order_id, user_id, status, http_status, signature_valid, error_message, created_at")
      .gte("created_at", since)
      .or("status.eq.failed,status.eq.error,status.eq.exception,signature_valid.eq.false,error_message.not.is.null,http_status.gte.400")
      .order("created_at", { ascending: false })
      .limit(data.limit * 4);
    if (error) throw new Error(error.message);

    // Group by trace_id
    const groups = new Map<string, any>();
    for (const r of rows ?? []) {
      const key = (r as any).trace_id || (r as any).order_id || (r as any).id;
      const g = groups.get(key) ?? { trace_id: key, order_id: (r as any).order_id, attempts: 0, last_attempt_at: null, last_reason: null, last_status: null, kinds: new Set<string>(), id: (r as any).id };
      g.attempts++;
      if (!g.last_attempt_at || (r as any).created_at > g.last_attempt_at) {
        g.last_attempt_at = (r as any).created_at;
        g.last_reason = (r as any).error_message || `HTTP ${(r as any).http_status} / ${(r as any).status}`;
        g.last_status = (r as any).status;
      }
      g.kinds.add((r as any).kind);
      groups.set(key, g);
    }
    const items = Array.from(groups.values())
      .map((g) => ({ ...g, kinds: Array.from(g.kinds) }))
      .slice(0, data.limit);
    return { items };
  });

/** Retry a failed webhook by re-running Fatora verify for that order_id. */
export const retryWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string().min(1).max(100) }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up the payment_intent for this order
    const intentRes: any = await (supabaseAdmin as any)
      .from("payment_intents")
      .select("id, status, provider, amount, currency, user_id, purpose, metadata, order_id")
      .eq("order_id", data.orderId)
      .maybeSingle();
    const intent: any = intentRes?.data ?? null;

    // Re-run verify via fatora-sync logic if it's a Fatora order
    const apiKey = process.env.FATORA_API_KEY;
    const verifyUrl = "https://api.fatora.io/v1/payments/verify";
    let result: any = { provider: "fatora", verified: false };
    if (apiKey) {
      try {
        const res = await fetch(verifyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "api_key": apiKey },
          body: JSON.stringify({ order_id: data.orderId }),
        });
        const txt = await res.text();
        let parsed: any = null;
        try { parsed = JSON.parse(txt); } catch {}
        result = { http: res.status, response: parsed ?? txt, verified: res.ok && parsed?.status === "SUCCESS" };

        await supabaseAdmin.from("fatora_logs" as any).insert({
          trace_id: `retry-${Date.now()}`,
          kind: "verify_request",
          order_id: data.orderId,
          http_status: res.status,
          status: result.verified ? "success" : "failed",
          response_payload: parsed ?? { raw: txt.slice(0, 500) },
          error_message: result.verified ? null : `Manual retry by admin — ${parsed?.message ?? txt.slice(0,200)}`,
        });
      } catch (e: any) {
        result.error = e?.message;
      }
    } else {
      result.error = "FATORA_API_KEY missing";
    }

    return { orderId: data.orderId, intent_status: intent?.status ?? "unknown", result };
  });
