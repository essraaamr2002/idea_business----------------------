import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PROJECT_STATUSES = ["draft", "pending_review", "active", "halted", "closed"] as const;

async function requireStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_admin_staff", { _user_id: userId });
  if (!data) throw new Error("forbidden");
}
async function requireAdminOrMod(supabase: any, userId: string) {
  const [{ data: a }, { data: m }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
  ]);
  if (!a && !m) throw new Error("forbidden");
}
async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("forbidden");
}

export const listAdminProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      status: z.enum(PROJECT_STATUSES).optional(),
      query: z.string().max(200).optional(),
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional(),
    }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("projects")
      .select(
        "id,ticker,name,owner_id,status,sector,country,currency,total_cost,shares_total,shares_sold,share_price,current_price,has_guarantee,funding_mode,created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(data.offset ?? 0, (data.offset ?? 0) + (data.limit ?? 50) - 1);
    if (data.status) q = q.eq("status", data.status);
    if (data.query?.trim()) {
      const t = data.query.trim();
      q = q.or(`name.ilike.%${t}%,ticker.ilike.%${t}%`);
    }
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const setProjectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: z.string().uuid(),
      status: z.enum(PROJECT_STATUSES),
      reason: z.string().min(3).max(500),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdminOrMod(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("projects").update({ status: data.status }).eq("id", data.projectId);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("log_admin_action", {
      _action: "project.set_status",
      _table: "projects",
      _target: data.projectId,
      _diff: { status: data.status, reason: data.reason },
    });
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), reason: z.string().min(3).max(500) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("projects").delete().eq("id", data.projectId);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("log_admin_action", {
      _action: "project.delete", _table: "projects", _target: data.projectId,
      _diff: { reason: data.reason },
    });
    return { ok: true };
  });

export const listAdminOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      status: z.string().optional(),
      projectId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(300).optional(),
    }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("investment_offers")
      .select("id,project_id,investor_id,owner_id,amount,currency,shares,price_per_share,status,created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.status) q = q.eq("status", data.status as any);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const cancelOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ offerId: z.string().uuid(), reason: z.string().min(3).max(500) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdminOrMod(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("investment_offers")
      .update({ status: "withdrawn", response_note: `[admin] ${data.reason}`, responded_at: new Date().toISOString() })
      .eq("id", data.offerId);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("log_admin_action", {
      _action: "offer.cancel", _table: "investment_offers", _target: data.offerId,
      _diff: { reason: data.reason },
    });
    return { ok: true };
  });

export const listAdminShareOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      status: z.string().optional(),
      projectId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(300).optional(),
    }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("share_orders")
      .select("id,project_id,user_id,side,shares,price,filled,status,created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.status) q = q.eq("status", data.status as any);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listGuarantees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid().optional() }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireAdminOrMod(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("project_guarantees")
      .select("id,project_id,guarantee_type,document_url,signed_to_name,guarantor_name,guarantor_phone,amount,notes,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listGuaranteeDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid().optional() }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireAdminOrMod(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("project_guarantee_documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
