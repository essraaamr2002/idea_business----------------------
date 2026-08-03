import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DISPUTE_STATUSES = ["open", "in_review", "lawyer_assigned", "resolved", "escalated", "closed"] as const;
const AD_STATUSES = ["draft", "pending_payment", "active", "paused", "completed", "rejected"] as const;

async function requireAdminOrMod(supabase: any, userId: string) {
  const [{ data: a }, { data: m }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
  ]);
  if (!a && !m) throw new Error("forbidden");
}
async function requireStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_admin_staff", { _user_id: userId });
  if (!data) throw new Error("forbidden");
}

// ===== Community =====

export const listCommunityPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      status: z.string().optional(),
      query: z.string().max(200).optional(),
      limit: z.number().int().min(1).max(200).optional(),
    }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireAdminOrMod(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("community_posts")
      .select("id,user_id,content,status,category,post_type,likes_count,comments_count,reposts_count,media_urls,created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (data.status) q = q.eq("status", data.status);
    if (data.query?.trim()) q = q.ilike("content", `%${data.query.trim()}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const moderatePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      postId: z.string().uuid(),
      action: z.enum(["hide", "publish", "delete"]),
      reason: z.string().min(3).max(500),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdminOrMod(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.action === "delete") {
      const { error } = await supabaseAdmin.from("community_posts").delete().eq("id", data.postId);
      if (error) throw new Error(error.message);
    } else {
      const status = data.action === "hide" ? "hidden" : "published";
      const { error } = await supabaseAdmin.from("community_posts").update({ status }).eq("id", data.postId);
      if (error) throw new Error(error.message);
    }
    await context.supabase.rpc("log_admin_action", {
      _action: `post.${data.action}`,
      _table: "community_posts",
      _target: data.postId,
      _diff: { reason: data.reason },
    });
    return { ok: true };
  });

// ===== Disputes =====

export const listDisputes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdminOrMod(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("disputes")
      .select("id,project_id,claimant_id,reason,amount_claimed,fee_amount,fee_currency,fee_paid,lawyer_name,lawyer_country,status,resolution,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      disputeId: z.string().uuid(),
      status: z.enum(DISPUTE_STATUSES).optional(),
      lawyerName: z.string().max(200).nullable().optional(),
      lawyerCountry: z.string().max(80).nullable().optional(),
      resolution: z.string().max(2000).nullable().optional(),
      feePaid: z.boolean().optional(),
      reason: z.string().min(3).max(500),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdminOrMod(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, any> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.lawyerName !== undefined) patch.lawyer_name = data.lawyerName;
    if (data.lawyerCountry !== undefined) patch.lawyer_country = data.lawyerCountry;
    if (data.resolution !== undefined) patch.resolution = data.resolution;
    if (data.feePaid !== undefined) patch.fee_paid = data.feePaid;
    if (!Object.keys(patch).length) throw new Error("nothing_to_update");
    const { error } = await supabaseAdmin.from("disputes").update(patch as any).eq("id", data.disputeId);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("log_admin_action", {
      _action: "dispute.update", _table: "disputes", _target: data.disputeId,
      _diff: { ...patch, reason: data.reason },
    });
    return { ok: true };
  });

// ===== Ads admin =====

export const listAdCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ status: z.string().optional(), limit: z.number().int().min(1).max(300).optional() }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("ad_campaigns")
      .select("id,owner_id,project_id,headline,body,cta_label,cta_url,media_url,media_type,daily_budget,total_budget,currency,duration_days,start_at,end_at,status,impressions,clicks,spent,rejection_reason,created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.status) q = q.eq("status", data.status as any);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setAdStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      campaignId: z.string().uuid(),
      status: z.enum(AD_STATUSES),
      rejectionReason: z.string().max(500).nullable().optional(),
      reason: z.string().min(3).max(500),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdminOrMod(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, any> = { status: data.status };
    if (data.rejectionReason !== undefined) patch.rejection_reason = data.rejectionReason;
    const { error } = await supabaseAdmin.from("ad_campaigns").update(patch as any).eq("id", data.campaignId);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("log_admin_action", {
      _action: "ad.set_status", _table: "ad_campaigns", _target: data.campaignId,
      _diff: { ...patch, reason: data.reason },
    });
    return { ok: true };
  });
