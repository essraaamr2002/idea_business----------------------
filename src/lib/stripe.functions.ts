import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns the Stripe publishable key (safe to expose to the client).
 */
export const getStripePublishableKey = createServerFn({ method: "GET" }).handler(
  async () => {
    return { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? null };
  },
);

/**
 * Creates a Stripe PaymentIntent and returns its client secret.
 * Apple Pay & Google Pay appear automatically inside Stripe Payment Element
 * on supported devices/browsers — no extra setup required.
 */
export const createStripeIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      amount: z.number().positive().max(1_000_000),
      currency: z.string().length(3).default("SAR"),
      purpose: z.enum(["wallet_topup", "checkout", "membership", "seriousness_deposit"]).default("wallet_topup"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      throw new Error("لم يتم ضبط مفتاح Stripe بعد. يرجى التواصل مع الإدارة.");
    }

    const orderId = `${data.purpose}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("payment_intents").insert({
      user_id: context.userId,
      provider: "stripe",
      order_id: orderId,
      amount: data.amount,
      currency: data.currency,
      purpose: data.purpose,
      status: "pending",
    } as any);

    // Stripe expects amounts in minor units (e.g. halalas / cents)
    const amountMinor = Math.round(data.amount * 100);

    const body = new URLSearchParams();
    body.append("amount", String(amountMinor));
    body.append("currency", data.currency.toLowerCase());
    body.append("automatic_payment_methods[enabled]", "true");
    body.append("metadata[order_id]", orderId);
    body.append("metadata[user_id]", context.userId);
    body.append("metadata[purpose]", data.purpose);

    const resp = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const payload: any = await resp.json().catch(() => ({}));
    if (!resp.ok || !payload?.client_secret) {
      console.error("[stripe] create intent failed", payload);
      throw new Error(payload?.error?.message ?? "تعذّر إنشاء عملية الدفع.");
    }

    // Update intent row with Stripe transaction id
    await supabaseAdmin
      .from("payment_intents")
      .update({ transaction_id: payload.id } as any)
      .eq("order_id", orderId);

    return {
      ok: true,
      orderId,
      clientSecret: payload.client_secret as string,
      intentId: payload.id as string,
    };
  });
