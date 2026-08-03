import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function safeError(err: unknown, userMessage: string): never {
  console.error("[wallet-fn]", err);
  throw new Error(userMessage);
}

// قراءة محفظة المستخدم الحالي + إنشاؤها إن لم تكن موجودة
export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("wallets")
      .select("user_id, balance, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) safeError(error, "تعذّر إتمام العملية. يرجى المحاولة لاحقاً.");
    return data ?? { user_id: userId, balance: 0, created_at: null };
  });

// قراءة سجل القيود للمستخدم الحالي (مع دعم pagination + فلترة)
const ledgerFilterSchema = z.object({
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(10),
  typeFilter: z.string().max(50).optional(),
  searchRef: z.string().max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.number().int().optional(),
  maxAmount: z.number().int().optional(),
  sortOrder: z.enum(["desc", "asc"]).default("desc"),
});

type LedgerFilterInput = {
  typeFilter?: string;
  searchRef?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
};


export const getMyLedgerPaged = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ledgerFilterSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let query = supabase
      .from("ledger")
      .select("id, amount, type, reference, balance_after, balance_before, status, counterparty_id, created_at, metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: data.sortOrder === "asc" })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.typeFilter) query = query.eq("type", data.typeFilter);
    if (data.searchRef) query = query.ilike("reference", `%${data.searchRef}%`);
    if (data.startDate) query = query.gte("created_at", data.startDate);
    if (data.endDate) query = query.lte("created_at", data.endDate);
    if (typeof data.minAmount === "number") query = query.gte("amount", data.minAmount);
    if (typeof data.maxAmount === "number") query = query.lte("amount", data.maxAmount);

    const { data: rows, error } = await query;
    if (error) safeError(error, "تعذّر إتمام العملية. يرجى المحاولة لاحقاً.");
    return rows ?? [];
  });

export const countMyLedger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      typeFilter: z.string().max(50).optional(),
      searchRef: z.string().max(100).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      minAmount: z.number().int().optional(),
      maxAmount: z.number().int().optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let query = supabase
      .from("ledger")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (data.typeFilter) query = query.eq("type", data.typeFilter);
    if (data.searchRef) query = query.ilike("reference", `%${data.searchRef}%`);
    if (data.startDate) query = query.gte("created_at", data.startDate);
    if (data.endDate) query = query.lte("created_at", data.endDate);
    if (typeof data.minAmount === "number") query = query.gte("amount", data.minAmount);
    if (typeof data.maxAmount === "number") query = query.lte("amount", data.maxAmount);

    const { count, error } = await query;
    if (error) safeError(error, "تعذّر إتمام العملية. يرجى المحاولة لاحقاً.");
    return count ?? 0;
  });

// قائمة المستخدمين الآخرين (للتحويل)
export const listOtherUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .neq("id", userId)
      .order("display_name");
    if (error) safeError(error, "تعذّر إتمام العملية. يرجى المحاولة لاحقاً.");
    return (data ?? []).map((u) => ({ id: u.id, display_name: u.display_name, email: null as string | null }));
  });

// إيداع للمستخدم الحالي (محاكاة webhook الدفع — في الإنتاج يستبدل بتحقق توقيع المزوّد)
const depositSchema = z.object({
  amountMinor: z.number().int().positive().max(100_000_000),
  reference: z.string().min(1).max(191),
});

export const depositToMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => depositSchema.parse(input))
  .handler(async () => {
    // Self-service deposits are disabled. Real deposits must come through a
    // verified payment-provider webhook (Fatora) that calls the wallet_deposit
    // RPC with service_role after verifying the payment signature.
    throw new Error("الإيداع المباشر معطّل. الرجاء استخدام بوابة الدفع.");
  });

// تحويل من المستخدم الحالي لمستخدم آخر
const transferSchema = z.object({
  toUserId: z.string().uuid(),
  amountMinor: z.number().int().positive().max(100_000_000),
  reference: z.string().min(1).max(191),
  type: z.enum(["investment", "share_trade", "subscription", "escrow"]),
});

export const transferFromMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => transferSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.rpc("wallet_transfer", {
      p_from_user: userId,
      p_to_user: data.toUserId,
      p_amount_minor: data.amountMinor,
      p_reference: data.reference,
      p_type: data.type,
    });
    if (error) {
      const msg = /insufficient funds/i.test(error.message)
        ? "الرصيد غير كافٍ لإتمام التحويل."
        : "تعذّر إتمام التحويل. يرجى المحاولة لاحقاً.";
      safeError(error, msg);
    }
    return row;
  });
