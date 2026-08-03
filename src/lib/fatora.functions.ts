import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function logFatora(entry: {
  trace_id: string;
  kind: string;
  order_id?: string | null;
  user_id?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  http_status?: number | null;
  request_payload?: any;
  response_payload?: any;
  error_message?: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("fatora_logs" as any).insert(entry as any);
  } catch (e) {
    console.error("[fatora] log failed", e);
  }
}

/**
 * Creates a Fatora payment session. Logs every step into public.fatora_logs
 * with a shared trace_id for end-to-end debugging.
 */
export const createFatoraPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      amount: z.number().positive().max(1_000_000),
      currency: z.string().length(3).default("SAR"),
      purpose: z.enum(["wallet_topup", "checkout", "membership"]).default("wallet_topup"),
      note: z.string().max(200).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const orderId = `${data.purpose}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const traceId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`) as string;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("payment_intents").insert({
      user_id: context.userId,
      provider: "fatora",
      order_id: orderId,
      amount: data.amount,
      currency: data.currency,
      purpose: data.purpose,
      status: "pending",
      metadata: { trace_id: traceId } as any,
    } as any);

    const apiKey = process.env.FATORA_API_KEY;
    if (!apiKey) {
      await logFatora({
        trace_id: traceId, kind: "checkout_request", order_id: orderId,
        user_id: context.userId, amount: data.amount, currency: data.currency,
        status: "skipped", error_message: "FATORA_API_KEY missing",
      });
      return {
        ok: true, orderId, traceId, checkoutUrl: null as string | null, mode: "pending" as const,
        message: "تم إنشاء طلب الدفع. سيُفعَّل التحويل التلقائي إلى بوابة Fatora بمجرد ربط مفتاح FATORA_API_KEY.",
      };
    }

    const origin = `https://${process.env.LOVABLE_PROJECT_DOMAIN ?? "nexit-aj.lovable.app"}`;
    const claims = (context as any).claims ?? {};
    const email = claims.email || claims.user_metadata?.email || `${context.userId}@users.nexit.local`;
    const phone = claims.phone || claims.user_metadata?.phone || undefined;
    const name = claims.user_metadata?.full_name || claims.user_metadata?.name || claims.email || "عميل";
    const reqBody = {
      amount: data.amount,
      currency: data.currency,
      order_id: orderId,
      client: { name, email, ...(phone ? { phone } : {}) },
      note: data.note ?? data.purpose,
      success_url: `${origin}/payment/status?order=${orderId}&trace=${traceId}`,
      failure_url: `${origin}/payment/status?order=${orderId}&trace=${traceId}`,
    };

    await logFatora({
      trace_id: traceId, kind: "checkout_request", order_id: orderId,
      user_id: context.userId, amount: data.amount, currency: data.currency,
      request_payload: reqBody,
    });

    try {
      const resp = await fetch("https://api.fatora.io/v1/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api_key": apiKey },
        body: JSON.stringify(reqBody),
      });
      const payload = await resp.json().catch(() => ({}));
      const url = (payload?.result?.checkout_url || payload?.checkout_url || null) as string | null;

      await logFatora({
        trace_id: traceId, kind: "checkout_response", order_id: orderId,
        user_id: context.userId, http_status: resp.status,
        status: url ? "ok" : "failed",
        response_payload: payload,
        error_message: url ? null :
          (payload?.error?.error_code || payload?.error?.description ||
           (typeof payload?.error === "string" ? payload.error : null) || payload?.message || "no checkout_url"),
      });

      if (!url) {
        const msg = payload?.error?.error_code || payload?.error?.description ||
          (typeof payload?.error === "string" ? payload.error : null) || payload?.message ||
          "تعذّر فتح بوابة الدفع.";
        throw new Error(msg);
      }
      return { ok: true, orderId, traceId, checkoutUrl: url, mode: "live" as const };
    } catch (e: any) {
      await logFatora({
        trace_id: traceId, kind: "checkout_response", order_id: orderId,
        user_id: context.userId, status: "exception",
        error_message: e?.message ?? String(e),
      });
      throw new Error(e?.message ?? "تعذّر الاتصال ببوابة الدفع.");
    }
  });

/** Polls the latest payment_intent status for the customer status page. */
export const getPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string().min(1).max(191) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: intent } = await supabaseAdmin
      .from("payment_intents")
      .select("order_id, status, amount, currency, purpose, transaction_id, created_at, updated_at, user_id")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (!intent || intent.user_id !== context.userId) {
      return { found: false as const };
    }
    return {
      found: true as const,
      status: intent.status as string,
      amount: Number(intent.amount),
      currency: intent.currency as string,
      purpose: intent.purpose as string,
      transactionId: intent.transaction_id as string | null,
      createdAt: intent.created_at as string,
      updatedAt: intent.updated_at as string,
    };
  });
