import { createFileRoute } from "@tanstack/react-router";
import { readTextLimited } from "@/lib/http-security.server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const payloadSchema = z.object({
  order_id: z.string().min(1).max(191),
  transaction_id: z.string().min(1).max(191),
  amount: z.number().positive(),
  currency: z.string().length(3).default("SAR"),
  status: z.string(),
  user_id: z.string().uuid(),
});

function safeEqHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length || ba.length === 0) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/fatora/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const traceId = (globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random()}`) as string;
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
        const secret = process.env.FATORA_WEBHOOK_SECRET;
        const rawResult = await readTextLimited(request, 1_048_576);
        if (rawResult instanceof Response) return rawResult;
        const raw = rawResult;
        const sig = request.headers.get("x-fatora-signature") || "";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const log = (entry: Record<string, any>) =>
          supabaseAdmin
            .from("fatora_logs" as any)
            .insert({ trace_id: traceId, ip_address: ip, ...entry } as any)
            .then(
              () => {},
              () => {},
            );

        if (!secret) {
          await log({
            kind: "webhook_received",
            error_message: "FATORA_WEBHOOK_SECRET missing",
            http_status: 500,
            request_payload: safeJson(raw),
          });
          return new Response("misconfigured", { status: 500 });
        }
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const sigValid = safeEqHex(sig, expected);
        if (!sigValid) {
          await log({
            kind: "webhook_received",
            signature_valid: false,
            error_message: "invalid signature",
            http_status: 401,
            request_payload: safeJson(raw),
          });
          return new Response("invalid signature", { status: 401 });
        }

        let parsed;
        try {
          parsed = payloadSchema.parse(JSON.parse(raw));
        } catch (e: any) {
          await log({
            kind: "webhook_received",
            signature_valid: true,
            error_message: `bad payload: ${e?.message ?? e}`,
            http_status: 400,
            request_payload: safeJson(raw),
          });
          return new Response("bad payload", { status: 400 });
        }

        await log({
          kind: "webhook_received",
          signature_valid: true,
          order_id: parsed.order_id,
          user_id: parsed.user_id,
          transaction_id: parsed.transaction_id,
          amount: parsed.amount,
          currency: parsed.currency,
          status: parsed.status,
          http_status: 200,
          request_payload: parsed,
        });

        if (parsed.status.toUpperCase() !== "SUCCESS") {
          await supabaseAdmin
            .from("payment_intents")
            .update({ status: "failed", transaction_id: parsed.transaction_id })
            .eq("order_id", parsed.order_id);
          await log({
            kind: "webhook_processed",
            order_id: parsed.order_id,
            user_id: parsed.user_id,
            status: "failed",
            error_message: `status=${parsed.status}`,
          });
          return Response.json({ ok: true, ignored: true });
        }

        const amountMinor = Math.round(parsed.amount * 100);
        const { data: intent } = await supabaseAdmin
          .from("payment_intents")
          .select("purpose, user_id, status, transaction_id")
          .eq("order_id", parsed.order_id)
          .maybeSingle();

        if (!intent) {
          await log({
            kind: "webhook_processed",
            order_id: parsed.order_id,
            status: "unknown_order",
            error_message: "no matching payment_intent",
          });
          return new Response("unknown order", { status: 404 });
        }
        if (intent.user_id !== parsed.user_id) {
          await log({
            kind: "webhook_processed",
            order_id: parsed.order_id,
            status: "user_mismatch",
            error_message: `intent.user=${intent.user_id} payload.user=${parsed.user_id}`,
          });
          return new Response("user mismatch", { status: 400 });
        }
        if (
          intent.status === "succeeded" ||
          (intent.transaction_id && intent.transaction_id === parsed.transaction_id)
        ) {
          await log({
            kind: "webhook_processed",
            order_id: parsed.order_id,
            user_id: parsed.user_id,
            status: "duplicate",
          });
          return Response.json({ ok: true, duplicate: true });
        }

        const authoritativeUserId = intent.user_id;

        if (intent.purpose === "subscription" || intent.purpose === "membership") {
          await supabaseAdmin
            .from("payment_intents")
            .update({ status: "succeeded", transaction_id: parsed.transaction_id })
            .eq("order_id", parsed.order_id);
          const { error: mErr } = await supabaseAdmin.rpc("activate_membership_paid" as any, {
            p_user_id: authoritativeUserId,
          });
          if (mErr) {
            await log({
              kind: "webhook_processed",
              order_id: parsed.order_id,
              user_id: authoritativeUserId,
              status: "error",
              error_message: `membership: ${mErr.message}`,
            });
            return new Response("internal", { status: 500 });
          }
          try {
            const { emailMembershipActivated } = await import("@/lib/email-events.server");
            const { data: prof } = await supabaseAdmin
              .from("profiles")
              .select("membership_expires_at")
              .eq("id", authoritativeUserId)
              .maybeSingle();
            await emailMembershipActivated(
              authoritativeUserId,
              (prof as any)?.membership_expires_at ?? null,
            );
          } catch {}
          await log({
            kind: "webhook_processed",
            order_id: parsed.order_id,
            user_id: authoritativeUserId,
            status: "paid_membership",
          });
          return Response.json({ ok: true, purpose: intent.purpose });
        }

        const { data, error } = await supabaseAdmin.rpc("process_fatora_deposit", {
          p_user_id: authoritativeUserId,
          p_order_id: parsed.order_id,
          p_amount_minor: amountMinor,
          p_transaction_id: parsed.transaction_id,
          p_currency: parsed.currency,
        });
        if (error) {
          await log({
            kind: "webhook_processed",
            order_id: parsed.order_id,
            user_id: authoritativeUserId,
            status: "error",
            error_message: `deposit rpc: ${error.message}`,
          });
          return new Response("internal", { status: 500 });
        }
        await log({
          kind: "webhook_processed",
          order_id: parsed.order_id,
          user_id: authoritativeUserId,
          transaction_id: parsed.transaction_id,
          amount: parsed.amount,
          currency: parsed.currency,
          status: "succeeded",
          response_payload: data as any,
        });
        return Response.json({ ok: true, result: data });
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});

function safeJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw: raw.slice(0, 4000) };
  }
}
