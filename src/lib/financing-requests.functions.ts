import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MIN_DEPOSIT = 10000;
const LEVERAGE = 1.40;

function throwFinancingError(error: { message?: string; code?: string } | null) {
  if (!error) return;
  const message = String(error.message ?? "");
  console.error("[financing-request]", { code: error.code, message });
  if (error.code === "23514" || /check constraint/i.test(message)) {
    throw new Error("إعدادات حالات طلبات التمويل غير متزامنة. يرجى المحاولة بعد تحديث النظام.");
  }
  if (error.code === "23503" || /foreign key constraint/i.test(message)) {
    throw new Error("تعذر ربط طلب التمويل بحساب التداول. تأكد من تفعيل الحساب أولاً.");
  }
  if (error.code === "42501" || /row-level security|permission denied/i.test(message)) {
    throw new Error("ليس لديك صلاحية لتنفيذ هذا الإجراء.");
  }
  throw new Error("تعذر حفظ طلب التمويل حالياً. يرجى المحاولة مرة أخرى.");
}

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("forbidden");
}

/** Member submits a financing request. Auto-rejects with reasons if ineligible. */
export const submitFinancingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      deposit_amount: z.number().positive().max(50_000_000),
      requested_loan: z.number().positive().max(50_000_000),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const reasons: string[] = [];

    // KYC check
    const { data: kyc } = await supabase
      .from("kyc_verifications")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();
    const kycOk = kyc?.status === "approved" || kyc?.status === "verified";
    if (!kycOk) reasons.push("لا يوجد توثيق هوية معتمد (KYC غير مكتمل).");

    // Deposit min
    if (data.deposit_amount < MIN_DEPOSIT) {
      reasons.push(`الحد الأدنى للإيداع هو ${MIN_DEPOSIT.toLocaleString("ar")} ر.س، وأنت أودعت ${data.deposit_amount.toLocaleString("ar")} ر.س.`);
    }

    // Leverage cap: requested_loan × 1.40 must be ≤ deposit
    const requiredCollateral = data.requested_loan * LEVERAGE;
    if (requiredCollateral > data.deposit_amount) {
      reasons.push(`الرافعة تتجاوز 140٪: الضمان المطلوب ${requiredCollateral.toFixed(0)} ر.س بينما إيداعك ${data.deposit_amount.toFixed(0)} ر.س.`);
    }

    // Account presence
    const { data: acc } = await supabase
      .from("sm_accounts")
      .select("id, status, kyc_tier")
      .eq("user_id", userId)
      .maybeSingle();
    if (!acc) reasons.push("لا يوجد حساب سوق موازي مفعّل. افتح حسابك أولاً.");
    else if (acc.status !== "active") reasons.push("حساب السوق الموازي غير نشط.");
    else if (acc.kyc_tier === "unverified") reasons.push("مستوى KYC للسوق الموازي غير موثّق.");

    // Actual cash balance check
    if (acc?.id) {
      const { data: w } = await supabase
        .from("sm_wallets")
        .select("balance")
        .eq("account_id", acc.id)
        .eq("wallet_type", "trading_cash")
        .maybeSingle();
      const cash = Number(w?.balance ?? 0);
      if (cash < data.deposit_amount) {
        reasons.push(`رصيدك الفعلي في محفظة التداول ${cash.toFixed(2)} ر.س لا يغطي مبلغ الضمان المطلوب.`);
      }
    }

    const autoReject = reasons.length > 0;

    // An ineligible request does not need a database row. Returning the
    // reasons directly also keeps this flow compatible with legacy databases
    // whose status constraint only permits the original values.
    if (autoReject) {
      return { ok: false, request: null, reasons };
    }

    const { data: inserted, error } = await supabase
      .from("sm_financing_requests")
      .insert({
        user_id: userId,
        account_id: acc?.id ?? null,
        deposit_amount: data.deposit_amount,
        requested_loan: data.requested_loan,
        leverage_pct: LEVERAGE,
        // Let the database apply its own legacy-compatible default status.
        auto_reasons: [],
      })
      .select("id, status, auto_reasons, created_at")
      .single();
    throwFinancingError(error);

    return { ok: true, request: inserted, reasons: [] };
  });

export const listMyFinancingRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sm_financing_requests")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    throwFinancingError(error);
    return data ?? [];
  });

export const cancelFinancingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sm_financing_requests")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "pending");
    throwFinancingError(error);
    return { ok: true };
  });

/* -------- Admin -------- */

export const adminListFinancingRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ status: z.enum(["pending","auto_rejected","approved","rejected","cancelled"]).optional() }).parse(i ?? {})
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("sm_financing_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    throwFinancingError(error);
    return rows ?? [];
  });

export const adminDecideFinancingRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
      notes: z.string().max(2000).optional(),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("sm_financing_requests")
      .update({
        status: data.decision,
        admin_notes: data.notes ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("status", "pending");
    throwFinancingError(error);
    return { ok: true };
  });

/** Withdraw cash — enforces surplus-above-leverage rule server-side via RPC. */
export const requestWithdrawCash = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ amount: z.number().positive().max(50_000_000) }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("sm_request_withdraw_cash", {
      _amount: data.amount,
    });
    throwFinancingError(error);
    return res as {
      ok: boolean;
      reason?: string;
      cash?: number;
      outstanding_loan?: number;
      required_collateral?: number;
      withdrawable_surplus?: number;
      withdrawn?: number;
      new_cash?: number;
      remaining_surplus?: number;
    };
  });
