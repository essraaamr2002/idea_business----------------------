import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function safeError(err: unknown, fallback: string): never {
  console.error("[wallet-actions]", err);
  throw new Error(fallback);
}

/** Insert in-app notification (best effort). */
async function notify(supabase: any, userId: string, kind: string, title: string, body: string, href?: string) {
  try {
    await supabase.from("notifications").insert({ user_id: userId, kind, title, body, href: href ?? null });
  } catch (e) { console.warn("notify failed", e); }
}

/** اقتراح مبالغ شحن ذكية بناءً على عادات المستخدم */
export const suggestTopupAmounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("wallet_suggest_topup_amounts");
    if (error) safeError(error, "تعذّر جلب الاقتراحات");
    return data as { suggestions: number[]; last_amount: number | null; avg_amount: number | null };
  });

/** تحويل P2P (شراء سهم/مشروع من عضو لآخر) — يتطلب PIN المحفظة */
const p2pSchema = z.object({
  toUserId: z.string().uuid(),
  amountMinor: z.number().int().min(100).max(100_000_000),
  pin: z.string().min(4).max(12),
  note: z.string().max(280).optional(),
});

export const p2pTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => p2pSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.rpc("wallet_p2p_transfer", {
      p_to_user: data.toUserId,
      p_amount_minor: data.amountMinor,
      p_pin: data.pin,
      p_note: data.note ?? undefined,
    });
    if (error) {
      const m = error.message || "";
      const friendly =
        /pin_incorrect/i.test(m) ? "رمز PIN غير صحيح" :
        /insufficient/i.test(m) ? "الرصيد غير كافٍ" :
        /recipient_not_found/i.test(m) ? "المستلم غير موجود" :
        /recipient_not_active/i.test(m) ? "محفظة المستلم غير نشطة" :
        /self_transfer/i.test(m) ? "لا يمكن التحويل لنفسك" :
        /amount_too_small/i.test(m) ? "المبلغ صغير جداً" :
        "تعذّر إتمام التحويل";
      safeError(error, friendly);
    }
    const out = row as { ok: boolean; reference: string };
    const amount = (data.amountMinor / 100).toFixed(2);
    // Notify sender + recipient
    await notify(supabase, userId, "wallet_transfer_sent",
      "تم تحويل المبلغ بنجاح",
      `أرسلت ${amount} ر.س — مرجع ${out.reference}`, "/wallet/history");
    await notify(supabase, data.toUserId, "wallet_transfer_received",
      "وصلك تحويل جديد",
      `استلمت ${amount} ر.س — مرجع ${out.reference}`, "/wallet/history");
    return out;
  });

/** طلب سحب ذكي (ينشئ تذكرة + يحجز المبلغ + ETA 14 يوم) */
const payoutSchema = z.object({
  channel: z.enum(["vodafone_cash", "barq", "bank_iban"]),
  destination: z.string().min(5).max(64),
  amountMinor: z.number().int().min(1000).max(100_000_000),
  currency: z.string().length(3).default("SAR"),
});

export const smartPayoutRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => payoutSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.rpc("wallet_request_smart_payout", {
      p_channel: data.channel,
      p_destination: data.destination,
      p_amount_minor: data.amountMinor,
      p_currency: data.currency,
    });
    if (error) {
      const m = error.message || "";
      const friendly =
        /insufficient_funds/i.test(m) ? "الرصيد غير كافٍ" :
        /wallet_not_active/i.test(m) ? "المحفظة غير نشطة" :
        /amount_too_small/i.test(m) ? "الحد الأدنى للسحب 10 ر.س" :
        "تعذّر إنشاء طلب السحب";
      safeError(error, friendly);
    }
    const out = row as {
      ok: boolean; payout_id: string; reference: string; ticket_id: string;
      destination_masked: string; eta_release_at: string; status: string;
    };
    const amount = (data.amountMinor / 100).toFixed(2);
    const eta = new Date(out.eta_release_at).toLocaleDateString("ar-SA");
    await notify(supabase, userId, "wallet_payout_requested",
      "تم إنشاء طلب السحب",
      `طلب سحب ${amount} ر.س قيد المراجعة — الإفراج: ${eta} — مرجع ${out.reference}`,
      "/wallet/history");
    await notify(supabase, userId, "wallet_amount_held",
      "تم حجز المبلغ",
      `حُجز ${amount} ر.س من رصيدك حتى مراجعة طلب السحب.`,
      "/wallet/history");
    return out;
  });

/** فتح تذكرة دعم خاصة بالمحفظة */
const ticketSchema = z.object({
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(5000),
  category: z.enum(["wallet_issue", "topup_problem", "transfer_problem", "withdrawal_problem", "other"]).default("wallet_issue"),
});

export const openWalletTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ticketSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.rpc("wallet_open_support_ticket", {
      p_subject: data.subject,
      p_message: data.message,
      p_category: data.category,
    });
    if (error) safeError(error, "تعذّر فتح التذكرة");
    const out = row as { ok: boolean; ticket_id: string };
    await notify(supabase, userId, "wallet_ticket_opened",
      "تم فتح تذكرة الدعم",
      `تذكرة رقم ${out.ticket_id.slice(0, 8)} — سيرد عليك فريق الدعم قريباً.`,
      "/support");
    return out;
  });
