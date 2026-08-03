import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- User wallet snapshot ----------
export const getMyWalletReal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: wallet } = await supabase
      .from("wallets")
      .select("user_id, wallet_code, virtual_iban, currency, balance, held, status, kyc_tier, pin_hash, self_frozen, last_activity_at, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: ledger } = await supabase
      .from("ledger")
      .select("id, amount, type, reference, balance_before, balance_after, counterparty_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return {
      wallet: wallet
        ? { ...wallet, has_pin: !!wallet.pin_hash, pin_hash: undefined }
        : null,
      ledger: ledger ?? [],
    };
  });

// ---------- PIN ----------
export const setWalletPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { oldPin?: string; newPin: string }) =>
    z.object({
      oldPin: z.string().regex(/^\d{6}$/).optional(),
      newPin: z.string().regex(/^\d{6}$/),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("wallet_set_pin", {
      p_old_pin: (data.oldPin ?? null) as any,
      p_new_pin: data.newPin,
    });
    if (error) throw new Error(error.message);
    return res;
  });

// ---------- Deposit (bank transfer flow) ----------
export const createDepositRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amountSar: number; method?: "bank_transfer" | "gateway" }) =>
    z.object({
      amountSar: z.number().min(1).max(1_000_000),
      method: z.enum(["bank_transfer", "gateway"]).default("bank_transfer"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const amountMinor = Math.round(data.amountSar * 100);
    const { data: req, error } = await supabase.rpc("wallet_create_deposit_request", {
      p_amount_minor: amountMinor,
      p_method: data.method,
    });
    if (error) throw new Error(error.message);
    return req;
  });

export const listMyDeposits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("deposit_requests")
      .select("*")
      .eq("wallet_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

// ---------- Admin: deposit queue ----------
export const adminListDeposits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string }) =>
    z.object({ status: z.string().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: isAcct } = await supabase.rpc("has_role", { _user_id: userId, _role: "accountant" });
    if (!isAdmin && !isAcct) throw new Error("forbidden");
    let q = supabase.from("deposit_requests").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const adminConfirmDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; senderIbanMasked?: string }) =>
    z.object({ id: z.string().uuid(), senderIbanMasked: z.string().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("wallet_admin_confirm_deposit", {
      p_request_id: data.id,
      p_sender_iban_masked: data.senderIbanMasked ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res;
  });

export const adminRejectDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; reason: string }) =>
    z.object({ id: z.string().uuid(), reason: z.string().min(2).max(500) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: isAcct } = await supabase.rpc("has_role", { _user_id: userId, _role: "accountant" });
    if (!isAdmin && !isAcct) throw new Error("forbidden");
    const { error } = await supabase
      .from("deposit_requests")
      .update({ status: "rejected", rejection_reason: data.reason })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- P2P transfer ----------
export const p2pTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { toWalletCode?: string; toUserId?: string; amountSar: number; pin: string; note?: string }) =>
    z.object({
      toWalletCode: z.string().optional(),
      toUserId: z.string().uuid().optional(),
      amountSar: z.number().min(0.01).max(500_000),
      pin: z.string().regex(/^\d{6}$/),
      note: z.string().max(140).optional(),
    }).refine((v) => v.toWalletCode || v.toUserId, { message: "recipient_required" })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    let toUser = data.toUserId;
    if (!toUser && data.toWalletCode) {
      const { data: w } = await supabase
        .from("wallets")
        .select("user_id")
        .eq("wallet_code", data.toWalletCode)
        .maybeSingle();
      if (!w) throw new Error("recipient_not_found");
      toUser = w.user_id;
    }
    const { data: res, error } = await supabase.rpc("wallet_p2p_transfer", {
      p_to_user: toUser as string,
      p_amount_minor: Math.round(data.amountSar * 100),
      p_pin: data.pin,
      p_note: data.note ?? undefined,
    });
    if (error) throw new Error(error.message);
    return res;
  });

// ---------- Self freeze ----------
export const freezeWalletSelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { reason?: string }) =>
    z.object({ reason: z.string().max(200).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("wallet_freeze_self", { p_reason: data.reason ?? undefined });
    if (error) throw new Error(error.message);
    return res;
  });

export const unfreezeWalletSelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { otp: string }) =>
    z.object({ otp: z.string().regex(/^\d{6}$/) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: res, error } = await supabase.rpc("wallet_unfreeze_self", { p_otp: data.otp });
    if (error) throw new Error(error.message);
    return res;
  });

// ---------- Lookup recipient by wallet code ----------
export const lookupRecipient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { walletCode: string }) =>
    z.object({ walletCode: z.string().regex(/^IDB-\d{8}$/) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: w } = await supabase
      .from("wallets")
      .select("user_id, wallet_code, status")
      .eq("wallet_code", data.walletCode)
      .maybeSingle();
    if (!w) return null;
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", w.user_id)
      .maybeSingle();
    const name = prof?.display_name ?? "";
    const parts = name.split(" ");
    const masked = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : name;
    return {
      user_id: w.user_id,
      wallet_code: w.wallet_code,
      masked_name: masked,
      avatar_url: prof?.avatar_url ?? null,
      status: w.status,
    };
  });

// ---------- Admin AML queue ----------
export const adminListAmlFlags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("forbidden");
    const { data } = await supabase
      .from("aml_flags")
      .select("*")
      .order("auto_detected_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const adminResolveAmlFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; resolution: string; status: "cleared" | "escalated" | "reported" }) =>
    z.object({
      id: z.string().uuid(),
      resolution: z.string().min(2).max(500),
      status: z.enum(["cleared", "escalated", "reported"]),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("forbidden");
    const { error } = await supabase
      .from("aml_flags")
      .update({ status: data.status, resolution: data.resolution, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
