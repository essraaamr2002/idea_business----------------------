import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FATORA_BASE = "https://api.fatora.io";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("forbidden");
}

async function bearerHeaders() {
  const token = process.env.FATORA_BEARER_TOKEN;
  if (!token) throw new Error("FATORA_BEARER_TOKEN غير مهيأ");
  return {
    "Content-Type": "application/json",
    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
  };
}

async function apiKeyHeaders() {
  const k = process.env.FATORA_API_KEY;
  if (!k) throw new Error("FATORA_API_KEY غير مهيأ");
  return { "Content-Type": "application/json", api_key: k };
}

async function logFatora(entry: Record<string, any>) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("fatora_logs" as any).insert(entry as any);
  } catch (e) { console.error("[fatora-admin] log failed", e); }
}

/* -------- Refund -------- */
export const fatoraRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      orderId: z.string().min(1),
      amount: z.number().positive().optional(),
      reason: z.string().max(500).optional(),
      payoutId: z.string().uuid().optional(),
      ticketId: z.string().uuid().optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const traceId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`) as string;

    const { data: intent, error: intentErr } = await supabaseAdmin
      .from("payment_intents")
      .select("order_id, user_id, amount, currency, status, transaction_id, purpose")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (intentErr || !intent) throw new Error("لم يتم العثور على عملية الدفع");

    const amount = data.amount ?? Number(intent.amount);
    const body = {
      order_id: data.orderId,
      transaction_id: intent.transaction_id ?? undefined,
      amount,
      reason: data.reason ?? "admin_refund",
    };
    await logFatora({
      trace_id: traceId, kind: "refund_request", order_id: data.orderId,
      user_id: intent.user_id, amount, currency: intent.currency,
      request_payload: body,
    });

    let resp: Response, payload: any = {};
    try {
      resp = await fetch(`${FATORA_BASE}/v1/refunds`, {
        method: "POST", headers: await apiKeyHeaders(), body: JSON.stringify(body),
      });
      payload = await resp.json().catch(() => ({}));
    } catch (e: any) {
      await logFatora({ trace_id: traceId, kind: "refund_response", order_id: data.orderId, status: "exception", error_message: e?.message ?? String(e) });
      throw new Error("تعذّر الاتصال بـ Fatora");
    }

    const ok = resp.ok && (payload?.status === "SUCCESS" || payload?.result?.status === "SUCCESS" || payload?.success === true);
    await logFatora({
      trace_id: traceId, kind: "refund_response", order_id: data.orderId,
      user_id: intent.user_id, http_status: resp.status,
      status: ok ? "ok" : "failed",
      response_payload: payload,
      error_message: ok ? null : (payload?.error?.description || payload?.message || "refund failed"),
    });
    if (!ok) throw new Error(payload?.error?.description || payload?.message || "فشل الاسترداد لدى Fatora");

    await supabaseAdmin.from("payment_intents")
      .update({ status: "refunded" })
      .eq("order_id", data.orderId);

    if (data.payoutId) {
      await supabaseAdmin.from("payout_requests")
        .update({ status: "refunded", admin_notes: `Refund via Fatora — ${data.reason ?? ""}`.trim() })
        .eq("id", data.payoutId);
    }
    if (data.ticketId) {
      await supabaseAdmin.from("support_tickets" as any)
        .update({ admin_reply: `تم تنفيذ استرداد ${amount} ${intent.currency} عبر Fatora.`, replied_at: new Date().toISOString(), status: "resolved", resolved_at: new Date().toISOString() } as any)
        .eq("id", data.ticketId);
    }
    return { ok: true, traceId, amount };
  });

/* -------- Settlements (transactions + payouts) -------- */
export const fatoraSettlements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const headers = await bearerHeaders();
    const qs = new URLSearchParams();
    if (data.from) qs.set("from", data.from);
    if (data.to) qs.set("to", data.to);
    qs.set("limit", String(data.limit));

    const [txResp, poResp] = await Promise.all([
      fetch(`${FATORA_BASE}/v1/payments/transactions?${qs.toString()}`, { headers }).catch((e) => e),
      fetch(`${FATORA_BASE}/v1/payouts?${qs.toString()}`, { headers }).catch((e) => e),
    ]);
    const tx = txResp instanceof Response ? await txResp.json().catch(() => ({})) : { error: String(txResp) };
    const po = poResp instanceof Response ? await poResp.json().catch(() => ({})) : { error: String(poResp) };

    const txList: any[] = tx?.result || tx?.transactions || tx?.data || (Array.isArray(tx) ? tx : []);
    const poList: any[] = po?.result || po?.payouts || po?.data || (Array.isArray(po) ? po : []);

    const orderIds = txList.map((t) => t.order_id || t.orderId).filter(Boolean);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let localMap = new Map<string, any>();
    if (orderIds.length) {
      const { data: locals } = await supabaseAdmin
        .from("payment_intents")
        .select("order_id, status, user_id, amount, currency, purpose, transaction_id, created_at")
        .in("order_id", orderIds);
      (locals ?? []).forEach((l: any) => localMap.set(l.order_id, l));
    }
    const enriched = txList.map((t) => ({
      raw: t,
      local: localMap.get(t.order_id || t.orderId) ?? null,
    }));
    return { transactions: enriched, payouts: poList, generatedAt: new Date().toISOString() };
  });

/* -------- Manual trigger of pending sync (admin button) -------- */
export const fatoraSyncPending = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { runFatoraPendingSync } = await import("./fatora-sync.server");
    return await runFatoraPendingSync();
  });

/* -------- Recent failures feed for admin alerts -------- */
export const fatoraRecentFailures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(100).default(25) }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("fatora_logs" as any)
      .select("id, trace_id, kind, order_id, user_id, http_status, status, signature_valid, error_message, created_at")
      .gte("created_at", since)
      .or("status.eq.failed,status.eq.error,status.eq.exception,status.eq.unknown_order,status.eq.user_mismatch,signature_valid.eq.false,error_message.not.is.null")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { items: rows ?? [] };
  });

