import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("forbidden");
}

export const getSecurityOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.rpc("security_stats_overview");
    if (error) throw error;
    return data ?? {};
  });

export const listSecurityEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    limit: z.number().int().min(1).max(500).default(100),
    severity: z.enum(["low", "medium", "high", "critical"]).optional(),
    blockedOnly: z.boolean().default(false),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("security_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 100, 500));
    if (data.severity) q = q.eq("severity", data.severity);
    if (data.blockedOnly) q = q.eq("blocked", true);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const listBlockedIps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("ip_blocklist")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const blockIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    ip: z.union([z.ipv4(), z.ipv6()]),
    reason: z.string().trim().min(3).max(300),
    minutes: z.number().int().min(1).max(525600).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any).rpc("admin_block_ip", {
      p_ip: data.ip,
      p_reason: data.reason,
      p_minutes: data.minutes ?? undefined,
    });
    if (error) throw error;
    return { ok: true };
  });



export const unblockIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ip: z.union([z.ipv4(), z.ipv6()]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("admin_unblock_ip", { p_ip: data.ip });
    if (error) throw error;
    return { ok: true };
  });

export const listWalletPolicies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    search: z.string().trim().max(100).optional(),
    lockdownOnly: z.boolean().default(false),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("wallet_security_policies")
      .select("user_id, daily_limit_minor, per_tx_limit_minor, require_otp_above_minor, lockdown, lockdown_reason, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (data.lockdownOnly) q = q.eq("lockdown", true);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const setWalletLockdown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    userId: z.string().uuid(),
    locked: z.boolean(),
    reason: z.string().trim().max(300).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("admin_wallet_lockdown", {
      p_user_id: data.userId,
      p_locked: data.locked,
      p_reason: data.reason ?? undefined,
    });

    if (error) throw error;
    return { ok: true };
  });

export const updateWalletPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    userId: z.string().uuid(),
    dailyLimitMinor: z.number().int().min(0).max(1_000_000_000),
    perTxLimitMinor: z.number().int().min(0).max(1_000_000_000),
    requireOtpAboveMinor: z.number().int().min(0).max(1_000_000_000),
  }).refine((v) => v.perTxLimitMinor <= v.dailyLimitMinor, {
    message: "per-transaction limit cannot exceed daily limit",
    path: ["perTxLimitMinor"],
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("wallet_security_policies")
      .upsert({
        user_id: data.userId,
        daily_limit_minor: data.dailyLimitMinor,
        per_tx_limit_minor: data.perTxLimitMinor,
        require_otp_above_minor: data.requireOtpAboveMinor,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
    return { ok: true };
  });
