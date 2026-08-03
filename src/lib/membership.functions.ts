import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const MEMBERSHIP_FEE_SAR = 25; // legacy fallback (silver)

/** Public — list of all active plans (used on /membership) */
export const listMembershipPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false } as any,
  });
  const { data, error } = await sb
    .from("membership_plans")
    .select("tier,name_ar,name_en,price_sar,projects_cap,likes_cap,comments_cap,other_cap,verified_badge,priority_support,ai_advanced,dedicated_manager,sort_order,active")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

/** Authenticated — current user's tier + plan + monthly usage + wallet */
export const getMembershipStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: caps } = await supabase.rpc("get_membership_caps" as any);
    const { data: prof } = await supabase
      .from("profiles")
      .select("membership, membership_expires_at")
      .eq("id", userId)
      .maybeSingle();
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance, currency")
      .eq("user_id", userId)
      .maybeSingle();

    const c = caps as any;
    return {
      membership: prof?.membership ?? "basic",
      tier: c?.tier ?? "basic",
      plan: c?.plan ?? null,
      usage: c?.usage ?? { projects: 0, likes: 0, comments: 0, other: 0 },
      expires_at: prof?.membership_expires_at ?? null,
      wallet_balance: Number(wallet?.balance ?? 0),
      wallet_currency: wallet?.currency ?? "SAR",
    };
  });

/** Subscribe to a specific paid tier from wallet */
export const subscribeMembershipTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tier: z.enum(["silver", "gold", "platinum"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: res, error } = await supabase.rpc("subscribe_membership_tier" as any, { p_tier: data.tier });
    if (error) throw new Error(error.message);
    const r = res as any;
    if (r?.ok) {
      try {
        const { emailMembershipActivated } = await import("./email-events.server");
        await emailMembershipActivated(userId, r.expires_at);
      } catch {}
    }
    return r;
  });

/** Legacy — kept for back-compat (defaults to silver/25 SAR) */
export const subscribeMembershipFromWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("subscribe_membership_tier" as any, { p_tier: "silver" });
    if (error) throw new Error(error.message);
    return data;
  });

/** Fatora checkout — amount depends on chosen tier (defaults to silver) */
export const createMembershipPaymentIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tier: z.enum(["silver", "gold", "platinum"]).default("silver") }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const amount = data.tier === "platinum" ? 199 : data.tier === "gold" ? 75 : 25;
    const { createFatoraPayment } = await import("./fatora.functions");
    return await (createFatoraPayment as any)({
      data: {
        amount,
        currency: "SAR",
        purpose: "membership",
        note: `اشتراك العضوية (${data.tier})`,
      },
    });
  });
