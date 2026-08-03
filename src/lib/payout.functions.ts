import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

const payoutSchema = z.object({
  channel: z.enum(["vodafone_cash", "barq", "bank_iban"]),
  destination: z.string().min(6).max(64),
  amountMinor: z.number().int().positive().max(100_000_000),
  currency: z.string().length(3).default("SAR"),
});

type PayoutResult =
  | { ok: true; payoutId: string; status: string; fraudScore: number; destinationMasked: string }
  | { ok: false; error: string };

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => payoutSchema.parse(input))
  .handler(async ({ data, context }): Promise<PayoutResult> => {
    const { userId } = context;

    // Channel-specific format checks
    const dest = data.destination.replace(/\s+/g, "");
    if (data.channel === "vodafone_cash" && !/^(010|011|012|015)\d{8}$/.test(dest)) {
      return { ok: false, error: "رقم فودافون كاش غير صالح." };
    }
    if (data.channel === "barq" && !/^\d{9,12}$/.test(dest)) {
      return { ok: false, error: "رقم برق غير صالح." };
    }
    if (data.channel === "bank_iban" && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(dest.toUpperCase())) {
      return { ok: false, error: "صيغة IBAN غير صالحة." };
    }

    const { encryptSecret, maskTail } = await import("./crypto.server");
    let destEnc: string;
    try {
      destEnc = encryptSecret(dest);
    } catch (e) {
      console.error("[payout] encryption failed", e);
      return { ok: false, error: "تعذّر تشفير بيانات الوجهة. حاول لاحقاً." };
    }
    const destMasked = maskTail(dest, 4);

    const ip =
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequestIP() ||
      undefined;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.rpc("request_payout", {
      p_user_id: userId,
      p_channel: data.channel,
      p_destination_masked: destMasked,
      p_destination_enc: destEnc,
      p_amount_minor: data.amountMinor,
      p_currency: data.currency,
      p_ip: ip,
    });
    if (error) {
      console.error("[payout] rpc failed", error);
      if (/insufficient funds/i.test(error.message)) {
        return { ok: false, error: "الرصيد غير كافٍ." };
      }
      if (/blocked_by_fraud_engine/i.test(error.message)) {
        return { ok: false, error: "تم رفض الطلب أمنياً. حسابك قيد المراجعة." };
      }
      return { ok: false, error: "تعذّر إنشاء طلب السحب." };
    }
    const r = Array.isArray(row) ? row[0] : row;
    return {
      ok: true,
      payoutId: r.payout_id,
      status: r.status,
      fraudScore: r.fraud_score,
      destinationMasked: destMasked,
    };
  });

export const listMyPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("payout_requests")
      .select("id, channel, destination_masked, amount_minor, currency, status, reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("[payout] list failed", error);
      return [];
    }
    return data ?? [];
  });
