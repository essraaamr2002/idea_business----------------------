import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_admin_staff", { _user_id: userId });
  if (!data) throw new Error("forbidden");
}
async function requireAccountant(supabase: any, userId: string) {
  const [{ data: isAdmin }, { data: isAcc }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "accountant" }),
  ]);
  if (!isAdmin && !isAcc) throw new Error("forbidden");
}

export const listLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      userId: z.string().uuid().optional(),
      type: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(500).optional(),
      offset: z.number().int().min(0).optional(),
    }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("ledger")
      .select("id,user_id,counterparty_id,amount,type,reference,balance_before,balance_after,status,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset ?? 0, (data.offset ?? 0) + (data.limit ?? 100) - 1);
    if (data.userId) q = q.eq("user_id", data.userId);
    if (data.type) q = q.eq("type", data.type);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const findUserAndWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().min(1).max(200) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = data.query.trim();
    const isUuid = /^[0-9a-f-]{36}$/i.test(q);
    // Strip PostgREST filter delimiters to prevent injection
    const safe = q.replace(/[%_,()"']/g, "");
    const cols = "id,display_name,phone,country,membership,membership_expires_at,kyc_status,created_at";
    let profiles: any[] = [];
    if (isUuid) {
      const { data } = await supabaseAdmin.from("profiles").select(cols).eq("id", q).limit(20);
      profiles = data ?? [];
    } else if (safe) {
      const pattern = `%${safe}%`;
      const [byName, byPhone] = await Promise.all([
        supabaseAdmin.from("profiles").select(cols).ilike("display_name", pattern).limit(20),
        supabaseAdmin.from("profiles").select(cols).ilike("phone", pattern).limit(20),
      ]);
      const merged = [...(byName.data ?? []), ...(byPhone.data ?? [])];
      profiles = Array.from(new Map(merged.map((p: any) => [p.id, p])).values()).slice(0, 20);
    }
    const ids = (profiles ?? []).map((p: any) => p.id);
    let wallets: any[] = [];
    if (ids.length) {
      const { data: w } = await supabaseAdmin
        .from("wallets")
        .select("user_id,balance,held,virtual_iban,bank_iban,currency")
        .in("user_id", ids);
      wallets = w ?? [];
    }
    return (profiles ?? []).map((p: any) => ({
      ...p,
      wallet: wallets.find((w) => w.user_id === p.id) ?? null,
    }));
  });

export const adjustWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      userId: z.string().uuid(),
      deltaMinor: z.number().int(),
      reason: z.string().min(3).max(500),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAccountant(context.supabase, context.userId);
    if (data.deltaMinor === 0) throw new Error("invalid_amount");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ref = `admin-adjust:${context.userId.slice(0, 8)}:${Date.now()}`;
    if (data.deltaMinor > 0) {
      const { error } = await supabaseAdmin.rpc("wallet_deposit", {
        p_user_id: data.userId,
        p_amount_minor: data.deltaMinor,
        p_reference: ref,
      });
      if (error) throw new Error(error.message);
    } else {
      // Atomic debit via SELECT FOR UPDATE RPC (prevents race condition)
      const { error: debitErr } = await supabaseAdmin.rpc("debit_wallet", {
        p_user_id: data.userId,
        p_amount: Math.abs(data.deltaMinor),
        p_reference: ref,
      });
      if (debitErr) throw new Error(debitErr.message);
    }
    await context.supabase.rpc("log_admin_action", {
      _action: data.deltaMinor > 0 ? "wallet.credit" : "wallet.debit",
      _table: "wallets",
      _target: data.userId,
      _diff: { delta_minor: data.deltaMinor, reason: data.reason, reference: ref },
    });
    return { ok: true, reference: ref };
  });

export const listCommissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      sourceType: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("commission_ledger")
      .select("id,source_type,source_id,payer_id,amount,currency,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.sourceType) q = q.eq("source_type", data.sourceType);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    const total = (rows ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
    return { rows: rows ?? [], count: count ?? 0, total };
  });

export const listPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ status: z.string().optional() }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("payout_requests")
      .select("id,user_id,channel,destination_masked,amount_minor,currency,status,reference,reason,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const decidePayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      payoutId: z.string().uuid(),
      success: z.boolean(),
      reason: z.string().max(500).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAccountant(context.supabase, context.userId);
    const { error } = await context.supabase.rpc("complete_payout", {
      p_payout_id: data.payoutId,
      p_success: data.success,
      p_reason: data.reason ?? undefined,
    });
    if (error) throw new Error(error.message);
    await context.supabase.rpc("log_admin_action", {
      _action: data.success ? "payout.complete" : "payout.fail",
      _table: "payout_requests",
      _target: data.payoutId,
      _diff: { reason: data.reason ?? null },
    });
    return { ok: true };
  });
