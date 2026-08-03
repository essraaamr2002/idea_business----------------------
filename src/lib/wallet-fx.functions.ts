import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function fail(err: unknown, msg: string): never {
  console.error("[wallet-fx]", err);
  throw new Error(msg);
}

export const listCurrencies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("currency_config" as any)
      .select("*")
      .eq("is_active", true)
      .order("tier")
      .order("code");
    if (error) fail(error, "تعذّر تحميل العملات");
    return data ?? [];
  });

export const listMySubWallets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("wallet_sub_accounts" as any)
      .select("*, currency_config:currency(*)")
      .eq("user_id", context.userId)
      .order("is_primary", { ascending: false });
    if (error) fail(error, "تعذّر تحميل المحافظ");
    return data ?? [];
  });

export const createSubWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ currency: z.string().length(3) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.rpc("wallet_get_or_create_sub" as any, {
      p_user: context.userId,
      p_currency: data.currency.toUpperCase(),
    });
    if (error) fail(error, "تعذّر إنشاء المحفظة");
    return row;
  });

export const getLiveRates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("exchange_rates_live" as any)
      .select("from_currency,to_currency,mid_rate,buy_rate,sell_rate,fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(200);
    if (error) fail(error, "تعذّر تحميل الأسعار");
    return data ?? [];
  });

export const createRateLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      from: z.string().length(3),
      to: z.string().length(3),
      fromAmountMinor: z.number().int().positive(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.rpc("fx_create_rate_lock" as any, {
      p_user: context.userId,
      p_from: data.from.toUpperCase(),
      p_to: data.to.toUpperCase(),
      p_from_amount_minor: data.fromAmountMinor,
    });
    if (error) fail(error, error.message || "تعذّر قفل السعر");
    return row;
  });

export const executeRateLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      lockId: z.string().uuid(),
      recipientId: z.string().uuid().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.rpc("fx_execute_lock" as any, {
      p_user: context.userId,
      p_lock_id: data.lockId,
      p_recipient: data.recipientId ?? null,
    });
    if (error) fail(error, error.message || "تعذّر تنفيذ التحويل");
    return row;
  });

// Bank accounts
const bankSchema = z.object({
  nickname: z.string().max(50).optional(),
  bank_name: z.string().min(2).max(100),
  account_holder_name: z.string().min(2).max(100),
  iban: z.string().max(40).optional(),
  account_number: z.string().max(40).optional(),
  swift_code: z.string().max(20).optional(),
  currency: z.string().length(3),
  country_code: z.string().length(2),
});

export const listMyBankAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_bank_accounts" as any)
      .select("*")
      .eq("user_id", context.userId)
      .order("is_default", { ascending: false });
    if (error) fail(error, "تعذّر تحميل الحسابات");
    return data ?? [];
  });

export const addBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => bankSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("user_bank_accounts" as any)
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) fail(error, "تعذّر إضافة الحساب البنكي");
    return row;
  });

export const deleteBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_bank_accounts" as any)
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) fail(error, "تعذّر الحذف");
    return { ok: true };
  });

export const getMyFxTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("fx_transactions" as any)
      .select("*")
      .or(`user_id.eq.${context.userId},counterparty_id.eq.${context.userId}`)
      .order("executed_at", { ascending: false })
      .limit(50);
    if (error) fail(error, "تعذّر تحميل العمليات");
    return data ?? [];
  });

// Admin
export const adminSetSpread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      from: z.string().length(3),
      to: z.string().length(3),
      spreadPct: z.number().min(0).max(20),
      feePct: z.number().min(0).max(20),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ok) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("currency_pair_config" as any).upsert({
      from_currency: data.from.toUpperCase(),
      to_currency: data.to.toUpperCase(),
      spread_pct: data.spreadPct,
      fx_fee_pct: data.feePct,
      updated_at: new Date().toISOString(),
    });
    if (error) fail(error, "تعذّر الحفظ");
    return { ok: true };
  });

export const adminRunReconciliation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ok) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("fx_run_reconciliation" as any);
    if (error) fail(error, "تعذّر التشغيل");
    return data ?? [];
  });

export const adminReconciliationLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ok) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("fx_reconciliation_log" as any)
      .select("*")
      .order("run_at", { ascending: false })
      .limit(100);
    if (error) fail(error, "تعذّر التحميل");
    return data ?? [];
  });
