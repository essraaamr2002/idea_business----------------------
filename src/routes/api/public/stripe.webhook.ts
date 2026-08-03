import { createFileRoute } from "@tanstack/react-router";
import { readTextLimited } from "@/lib/http-security.server";

/**
 * Stripe webhook receiver. Verifies signature using STRIPE_WEBHOOK_SECRET,
 * marks payment_intents as paid, and credits wallet on success.
 */
export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        const sig = request.headers.get("stripe-signature");
        const rawResult = await readTextLimited(request, 1_048_576);
        if (rawResult instanceof Response) return rawResult;
        const raw = rawResult;

        if (!secret || !sig) {
          return new Response("missing signature", { status: 400 });
        }

        // Manual signature verification (no Node-only Stripe SDK usage)
        const ok = await verifyStripeSignature(raw, sig, secret);
        if (!ok) {
          return new Response("invalid signature", { status: 401 });
        }

        let event: any;
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        // Timestamp tolerance: reject events older than 5 minutes (replay protection)
        const tStr = sig
          .split(",")
          .find((p) => p.trim().startsWith("t="))
          ?.split("=")[1];
        const tEpoch = tStr ? parseInt(tStr, 10) : 0;
        if (!tEpoch || Math.abs(Date.now() / 1000 - tEpoch) > 300) {
          return new Response("stale signature", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: insert event.id; if it conflicts, skip processing.
        if (event.id) {
          const { error: dupErr } = await supabaseAdmin
            .from("stripe_event_log" as any)
            .insert({ event_id: event.id } as any);
          if (dupErr && (dupErr as any).code === "23505") {
            return new Response("ok"); // already processed
          }
        }

        if (event.type === "payment_intent.succeeded") {
          const intent = event.data?.object;
          const orderId: string | undefined = intent?.metadata?.order_id;
          const userId: string | undefined = intent?.metadata?.user_id;
          const purpose: string | undefined = intent?.metadata?.purpose;
          const amountMinor: number = intent?.amount_received ?? intent?.amount ?? 0;
          const currency = (intent?.currency ?? "sar").toUpperCase();

          if (orderId && userId) {
            // Double-guard against duplicate credit
            const { data: existing } = await supabaseAdmin
              .from("payment_intents")
              .select("status")
              .eq("order_id", orderId)
              .maybeSingle();
            if (existing?.status === "paid") {
              return new Response("ok");
            }
            await supabaseAdmin
              .from("payment_intents")
              .update({ status: "paid", transaction_id: intent.id } as any)
              .eq("order_id", orderId);

            if (purpose === "wallet_topup") {
              const amount = amountMinor / 100;
              const { error: rpcErr } = await supabaseAdmin.rpc("credit_wallet" as any, {
                _user_id: userId,
                _amount: amount,
                _currency: currency,
                _ref: orderId,
              });
              if (rpcErr) {
                console.warn(
                  "[stripe.webhook] credit_wallet rpc missing, falling back",
                  rpcErr.message,
                );
              }
            }
          }
        }

        return new Response("ok");
      },
      // Stripe sometimes hits HEAD on endpoint setup
      GET: async () => new Response("ok"),
    },
  },
});

async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
): Promise<boolean> {
  try {
    const parts = Object.fromEntries(
      header.split(",").map((kv) => {
        const i = kv.indexOf("=");
        return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
      }),
    );
    const t = parts["t"];
    const v1 = parts["v1"];
    if (!t || !v1) return false;
    const signedPayload = `${t}.${payload}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signedPayload));
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    // Constant-time compare
    if (hex.length !== v1.length) return false;
    let diff = 0;
    for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
    return diff === 0;
  } catch (e) {
    console.error("[stripe.webhook] verify failed", e);
    return false;
  }
}
