import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Settle the platform fee for a dispute: charges 15% of the claimed amount
 * from the claimant's wallet and records it in commission_ledger.
 */
export const settleDisputeFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ disputeId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("disputes")
      .select("id, claimant_id, amount_claimed, fee_currency, fee_paid")
      .eq("id", data.disputeId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("dispute not found");
    if ((row as any).claimant_id !== context.userId) throw new Error("forbidden");
    if ((row as any).fee_paid) return { ok: true, alreadyPaid: true };
    const base = Number((row as any).amount_claimed || 0);
    if (base <= 0) throw new Error("invalid amount");
    const currency = String((row as any).fee_currency || "SAR").toUpperCase();
    const { data: fee, error: rpcErr } = await (context.supabase as any).rpc("charge_commission", {
      p_user_id: context.userId,
      p_base_amount: base,
      p_source_type: "dispute",
      p_source_id: data.disputeId,
      p_currency: currency,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    await context.supabase
      .from("disputes")
      .update({ fee_paid: true, fee_amount: Number(fee || 0) } as any)
      .eq("id", data.disputeId);
    return { ok: true, fee: Number(fee || 0), currency };
  });

/**
 * Charge the monthly supervisor fee from the investor and credit the supervisor
 * with the net amount after a 15% platform commission.
 */
export const billSupervisorFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ subscriptionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: sub, error } = await context.supabase
      .from("supervisor_subscriptions")
      .select("id, investor_id, project_id, monthly_fee, currency, status, supervisor_name")
      .eq("id", data.subscriptionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sub) throw new Error("subscription not found");
    if ((sub as any).investor_id !== context.userId) throw new Error("forbidden");
    if ((sub as any).status !== "active") throw new Error("inactive subscription");
    const fee = Number((sub as any).monthly_fee || 0);
    if (fee <= 0) throw new Error("invalid fee");
    const currency = String((sub as any).currency || "SAR").toUpperCase();
    const { data: commission, error: rpcErr } = await (context.supabase as any).rpc("charge_commission", {
      p_user_id: context.userId,
      p_base_amount: fee,
      p_source_type: "supervisor",
      p_source_id: data.subscriptionId,
      p_currency: currency,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    await context.supabase
      .from("supervisor_subscriptions")
      .update({ next_billing_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() } as any)
      .eq("id", data.subscriptionId);
    return { ok: true, gross: fee, commission: Number(commission || 0), currency };
  });
