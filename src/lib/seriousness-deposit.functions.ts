import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export function seriousnessDepositFeeForTier(membership?: string | null) {
  const tier = String(membership || "basic").toLowerCase();
  if (tier === "platinum") return 1;
  if (tier === "gold") return 2.5;
  if (tier === "silver") return 4;
  return 5;
}

export async function getRequiredSeriousnessDeposit(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("membership")
    .eq("id", userId)
    .maybeSingle();
  return seriousnessDepositFeeForTier(profile?.membership);
}

export async function hasRecentSeriousnessDeposit(supabase: any, userId: string) {
  const requiredAmount = await getRequiredSeriousnessDeposit(supabase, userId);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("payment_intents")
    .select("id, amount, currency, status, created_at")
    .eq("user_id", userId)
    .eq("purpose", "seriousness_deposit")
    .in("status", ["paid", "succeeded"])
    .eq("currency", "USD")
    .gte("amount", requiredAmount)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;

  // Find the most recent pending intent (for trace/verify link)
  let pendingRef: string | null = null;
  if (!data) {
    const { data: pending } = await supabase
      .from("payment_intents")
      .select("id, status, created_at")
      .eq("user_id", userId)
      .eq("purpose", "seriousness_deposit")
      .in("status", ["pending", "processing", "requires_action"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    pendingRef = pending?.id ?? null;
  }

  return { ok: !!data, requiredAmount, currency: "USD", validHours: 24, pendingRef };
}

export async function requireSeriousnessDeposit(supabase: any, userId: string) {
  const result = await hasRecentSeriousnessDeposit(supabase, userId);
  if (!result.ok) {
    // Format: seriousness_deposit_required:<amount>:<currency>:<pendingRef?>
    throw new Error(
      `seriousness_deposit_required:${result.requiredAmount}:${result.currency}:${result.pendingRef ?? ""}`,
    );
  }
  return result;
}


export const checkSeriousnessDeposit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    return hasRecentSeriousnessDeposit(supabase, userId);
  });