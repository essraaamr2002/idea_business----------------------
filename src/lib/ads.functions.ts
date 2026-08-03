import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Targeting = z.object({
  countries: z.array(z.string().min(2).max(3)).max(50).default([]),
  age_min: z.number().int().min(0).max(99).optional(),
  age_max: z.number().int().min(1).max(99).optional(),
  gender: z.enum(["any", "male", "female"]).default("any"),
  audience_type: z.enum(["all", "investor", "founder"]).default("all"),
  interests: z.array(z.string()).max(20).default([]),
});

const CreateInput = z.object({
  projectId: z.string().uuid().nullable(),
  headline: z.string().trim().min(1).max(120),
  body: z.string().trim().max(1000).optional(),
  mediaUrl: z.string().url().max(2000).refine((u) => u.startsWith("https://"), { message: "Only https:// URLs allowed" }).nullable().optional(),
  mediaType: z.enum(["image", "video"]).nullable().optional(),
  ctaLabel: z.string().trim().max(40).default("اعرف المزيد"),
  ctaUrl: z.string().url().max(500).refine((u) => u.startsWith("https://"), { message: "Only https:// URLs allowed" }),
  dailyBudget: z.number().positive().max(1_000_000),
  durationDays: z.number().int().min(1).max(60),
  currency: z.string().min(3).max(4).default("SAR"),
  objective: z.enum(["views", "investors", "shares", "clicks", "conversions"]).default("views"),
  targeting: Targeting,
});

export const createAdCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data, context }) => {
    if (data.projectId) {
      const { data: proj, error } = await context.supabase
        .from("projects").select("id, owner_id").eq("id", data.projectId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!proj || (proj as any).owner_id !== context.userId) throw new Error("forbidden: project not yours");
    }
    const total = Number((data.dailyBudget * data.durationDays).toFixed(2));
    const { data: row, error } = await context.supabase
      .from("ad_campaigns")
      .insert({
        owner_id: context.userId,
        project_id: data.projectId,
        headline: data.headline,
        body: data.body ?? null,
        media_url: data.mediaUrl ?? null,
        media_type: data.mediaType ?? null,
        cta_label: data.ctaLabel,
        cta_url: data.ctaUrl,
        daily_budget: data.dailyBudget,
        total_budget: total,
        currency: data.currency,
        duration_days: data.durationDays,
        objective: data.objective as any,
        targeting: data.targeting as any,
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id, total };
  });

export const launchAdCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await (context.supabase as any).rpc("launch_ad_campaign", { p_campaign_id: data.id });
    if (error) throw new Error(error.message);
    const row = Array.isArray(res) ? res[0] : res;
    // send email if active
    if (row?.status === "active") {
      try {
        const { emailCampaignLaunched } = await import("./email-events.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: c } = await supabaseAdmin.from("ad_campaigns").select("headline, end_at").eq("id", data.id).maybeSingle();
        await emailCampaignLaunched(context.userId, { id: data.id, headline: (c as any)?.headline ?? "", endAt: (c as any)?.end_at ?? null });
      } catch (e) { console.warn("[ad email]", e); }
    }
    return row as { status: string; balance: number; needed: number };
  });

export const pauseAdCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("pause_ad_campaign", { p_campaign_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const resumeAdCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("resume_ad_campaign", { p_campaign_id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listMyCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ad_campaigns")
      .select("id, headline, status, currency, daily_budget, total_budget, spent, impressions, clicks, duration_days, start_at, end_at, created_at, project_id, media_url, media_type, quality_score, conversions_count, review_state")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const getCampaign = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("ad_campaigns").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const getFeedAds = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(10).default(3) }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: rows, error } = await (sb as any).rpc("pick_active_ads", { p_limit: data.limit });
    if (error) throw new Error(error.message);
    return { items: (rows ?? []) as Array<{
      id: string; owner_id: string; project_id: string | null; headline: string; body: string | null;
      media_url: string | null; media_type: string | null; cta_label: string; cta_url: string;
    }> };
  });

export const recordAdEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    kind: z.enum(["impression", "click"]),
  }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    // Anonymous viewers can record; auth.uid() will simply be null and the RPC handles that
    await (sb as any).rpc("record_ad_event", { p_campaign_id: data.id, p_kind: data.kind });
    return { ok: true as const };
  });

export const cancelAdCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error: rerr } = await context.supabase
      .from("ad_campaigns").select("owner_id, status").eq("id", data.id).maybeSingle();
    if (rerr) throw new Error(rerr.message);
    if (!row || (row as any).owner_id !== context.userId) throw new Error("forbidden");
    if (!["draft", "pending_payment", "paused"].includes((row as any).status)) {
      throw new Error("لا يمكن إلغاء حملة نشطة. أوقفها أولاً ثم ألغها.");
    }
    const { error } = await context.supabase
      .from("ad_campaigns").update({ status: "canceled" } as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Create a Fatora payment intent to fund an ad campaign's total budget. */
export const createAdCampaignPaymentIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("ad_campaigns")
      .select("owner_id, total_budget, currency, headline, status")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || (row as any).owner_id !== context.userId) throw new Error("forbidden");
    const amount = Number((row as any).total_budget);
    const currency = String((row as any).currency || "SAR").toUpperCase();
    if (!amount || amount <= 0) throw new Error("ميزانية الحملة غير صالحة");
    const { createFatoraPayment } = await import("./fatora.functions");
    const result = await (createFatoraPayment as any)({
      data: { amount, currency, purpose: "checkout", note: `تمويل حملة إعلانية: ${(row as any).headline ?? data.id}` },
    });
    return result;
  });
