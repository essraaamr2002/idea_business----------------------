// Server-only sync logic for pending Fatora payments. Called by the public
// cron route and by the manual admin trigger. Uses the bearer token to list
// recent transactions and reconciles them with local payment_intents.
const FATORA_BASE = "https://api.fatora.io";

async function logFatora(entry: Record<string, any>) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("fatora_logs" as any).insert(entry as any);
  } catch (e) { console.error("[fatora-sync] log failed", e); }
}

export async function runFatoraPendingSync(): Promise<{
  scanned: number; updated: number; confirmed: number; failed: number; errors: string[];
}> {
  const traceId = (globalThis.crypto?.randomUUID?.() ?? `sync-${Date.now()}`) as string;
  const errors: string[] = [];
  const token = process.env.FATORA_BEARER_TOKEN;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Pending intents older than 2 minutes (give the webhook a chance first),
  // newer than 7 days (Fatora reporting window).
  const cutoffNew = new Date(Date.now() - 2 * 60_000).toISOString();
  const cutoffOld = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: pending, error } = await supabaseAdmin
    .from("payment_intents")
    .select("order_id, user_id, amount, currency, purpose, transaction_id, created_at")
    .eq("provider", "fatora")
    .eq("status", "pending")
    .lt("created_at", cutoffNew)
    .gt("created_at", cutoffOld)
    .limit(100);
  if (error) {
    await logFatora({ trace_id: traceId, kind: "sync_run", status: "error", error_message: error.message });
    return { scanned: 0, updated: 0, confirmed: 0, failed: 0, errors: [error.message] };
  }
  const list = pending ?? [];
  if (!token) {
    await logFatora({ trace_id: traceId, kind: "sync_run", status: "skipped", error_message: "FATORA_BEARER_TOKEN missing" });
    return { scanned: list.length, updated: 0, confirmed: 0, failed: 0, errors: ["FATORA_BEARER_TOKEN missing"] };
  }

  let confirmed = 0, failed = 0, updated = 0;
  const headers = { "Content-Type": "application/json", Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}` };

  for (const intent of list) {
    try {
      const body = { order_id: intent.order_id };
      const resp = await fetch(`${FATORA_BASE}/v1/payments/list`, {
        method: "POST", headers, body: JSON.stringify(body),
      });
      const payload: any = await resp.json().catch(() => ({}));
      const items: any[] = payload?.result || payload?.transactions || payload?.data || (Array.isArray(payload) ? payload : []);
      const match = items.find((it) => (it.order_id || it.orderId) === intent.order_id) ?? items[0];
      const status: string = String(match?.status ?? match?.payment_status ?? "").toUpperCase();
      const txId: string | null = match?.transaction_id ?? match?.id ?? null;

      await logFatora({
        trace_id: traceId, kind: "sync_lookup", order_id: intent.order_id,
        user_id: intent.user_id, http_status: resp.status, status,
        transaction_id: txId, response_payload: payload,
      });

      if (status === "SUCCESS" || status === "PAID" || status === "COMPLETED") {
        if (intent.purpose === "subscription" || intent.purpose === "membership") {
          await supabaseAdmin.from("payment_intents")
            .update({ status: "succeeded", transaction_id: txId ?? intent.transaction_id })
            .eq("order_id", intent.order_id);
          await supabaseAdmin.rpc("activate_membership_paid" as any, { p_user_id: intent.user_id }).then(() => {}, () => {});
        } else {
          const amountMinor = Math.round(Number(intent.amount) * 100);
          const { error: rpcErr } = await supabaseAdmin.rpc("process_fatora_deposit", {
            p_user_id: intent.user_id,
            p_order_id: intent.order_id,
            p_amount_minor: amountMinor,
            p_transaction_id: txId ?? intent.order_id,
            p_currency: intent.currency,
          });
          if (rpcErr) {
            errors.push(`${intent.order_id}: ${rpcErr.message}`);
            await logFatora({ trace_id: traceId, kind: "sync_confirm", order_id: intent.order_id, status: "error", error_message: rpcErr.message });
            continue;
          }
        }
        confirmed++; updated++;
        await logFatora({ trace_id: traceId, kind: "sync_confirm", order_id: intent.order_id, user_id: intent.user_id, status: "succeeded", transaction_id: txId });
      } else if (status === "FAILED" || status === "DECLINED" || status === "CANCELLED" || status === "EXPIRED") {
        await supabaseAdmin.from("payment_intents")
          .update({ status: "failed", transaction_id: txId ?? intent.transaction_id })
          .eq("order_id", intent.order_id);
        failed++; updated++;
        await logFatora({ trace_id: traceId, kind: "sync_confirm", order_id: intent.order_id, user_id: intent.user_id, status: "failed" });
      }
    } catch (e: any) {
      errors.push(`${intent.order_id}: ${e?.message ?? e}`);
      await logFatora({ trace_id: traceId, kind: "sync_lookup", order_id: intent.order_id, status: "exception", error_message: e?.message ?? String(e) });
    }
  }

  await logFatora({
    trace_id: traceId, kind: "sync_run",
    status: errors.length ? "partial" : "ok",
    response_payload: { scanned: list.length, updated, confirmed, failed, errors: errors.slice(0, 10) },
  });
  return { scanned: list.length, updated, confirmed, failed, errors };
}
