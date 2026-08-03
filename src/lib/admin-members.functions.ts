import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "moderator", "seo", "user", "accountant", "support"] as const;
type Role = typeof ROLES[number];

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("forbidden");
}
async function requireStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_admin_staff", { _user_id: userId });
  if (!data) throw new Error("forbidden");
}

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      query: z.string().max(200).optional(),
      kycStatus: z.string().optional(),
      membership: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional(),
    }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select(
        "id,display_name,phone,country,city,kyc_status,membership,membership_expires_at,verified_blue,verified_green,points,followers_count,created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(data.offset ?? 0, (data.offset ?? 0) + (data.limit ?? 50) - 1);
    if (data.query && data.query.trim()) {
      const term = data.query.trim();
      if (/^[0-9a-f-]{36}$/i.test(term)) q = q.eq("id", term);
      else q = q.or(`display_name.ilike.%${term}%,phone.ilike.%${term}%`);
    }
    if (data.kycStatus) q = q.eq("kyc_status", data.kycStatus as any);
    if (data.membership) q = q.eq("membership", data.membership as any);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r: any) => r.id);
    let roles: Record<string, string[]> = {};
    if (ids.length) {
      const { data: rs } = await supabaseAdmin
        .from("user_roles").select("user_id,role").in("user_id", ids);
      for (const r of rs ?? []) {
        (roles[(r as any).user_id] ||= []).push((r as any).role);
      }
    }
    return {
      rows: (rows ?? []).map((r: any) => ({ ...r, roles: roles[r.id] ?? [] })),
      count: count ?? 0,
    };
  });

export const updateMemberFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      userId: z.string().uuid(),
      membership: z.enum(["basic", "full"]).optional(),
      membershipExpiresAt: z.string().nullable().optional(),
      verifiedBlue: z.boolean().optional(),
      verifiedGreen: z.boolean().optional(),
      reason: z.string().min(3).max(500),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, any> = {};
    if (data.membership !== undefined) patch.membership = data.membership;
    if (data.membershipExpiresAt !== undefined) patch.membership_expires_at = data.membershipExpiresAt;
    if (data.verifiedBlue !== undefined) patch.verified_blue = data.verifiedBlue;
    if (data.verifiedGreen !== undefined) patch.verified_green = data.verifiedGreen;
    if (!Object.keys(patch).length) throw new Error("nothing_to_update");
    const { error } = await supabaseAdmin.from("profiles").update(patch as any).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("log_admin_action", {
      _action: "member.update_flags",
      _table: "profiles",
      _target: data.userId,
      _diff: { ...patch, reason: data.reason },
    });
    return { ok: true };
  });

export const listKyc = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ status: z.string().optional() }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("kyc_verifications")
      .select("id,user_id,document_url,selfie_url,status,ai_score,ai_decision,ai_reasoning,created_at,reviewed_at,document_type,document_expiry,document_meta,liveness_challenge,pledge_accepted,arbitration_accepted,pledge_full_name,pledge_signature_url,pledge_signed_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
    let profiles: Record<string, any> = {};
    if (ids.length) {
      const { data: ps } = await supabaseAdmin
        .from("profiles").select("id,display_name,phone,country,kyc_status").in("id", ids);
      for (const p of ps ?? []) profiles[(p as any).id] = p;
    }
    // Sign URLs for the admin to view document / selfie / signature
    const sign = async (bucket: string, path?: string | null) => {
      if (!path) return null;
      const { data: s } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 600);
      return s?.signedUrl ?? null;
    };
    const out = await Promise.all((rows ?? []).map(async (r: any) => ({
      ...r,
      profile: profiles[r.user_id] ?? null,
      document_signed_url: await sign("kyc-documents", r.document_url),
      selfie_signed_url: await sign("kyc-documents", r.selfie_url),
      signature_signed_url: await sign("kyc-signatures", r.pledge_signature_url),
    })));
    return out;
  });

export const decideKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      kycId: z.string().uuid(),
      approve: z.boolean(),
      reason: z.string().max(500).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rec, error: rErr } = await supabaseAdmin
      .from("kyc_verifications").select("id,user_id,status").eq("id", data.kycId).maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!rec) throw new Error("not_found");
    const newStatus = data.approve ? "verified" : "rejected";
    const { error: uErr } = await supabaseAdmin
      .from("kyc_verifications")
      .update({ status: newStatus, reviewed_at: new Date().toISOString() })
      .eq("id", data.kycId);
    if (uErr) throw new Error(uErr.message);
    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({ kyc_status: newStatus, verified_green: data.approve })
      .eq("id", (rec as any).user_id);
    if (pErr) throw new Error(pErr.message);
    await context.supabase.rpc("log_admin_action", {
      _action: data.approve ? "kyc.approve" : "kyc.reject",
      _table: "kyc_verifications",
      _target: data.kycId,
      _diff: { user_id: (rec as any).user_id, reason: data.reason ?? null },
    });
    return { ok: true };
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(ROLES),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role as Role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    await context.supabase.rpc("log_admin_action", {
      _action: "role.grant", _table: "user_roles", _target: data.userId, _diff: { role: data.role },
    });
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(ROLES),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && data.role === "admin") {
      throw new Error("cannot_revoke_self_admin");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("log_admin_action", {
      _action: "role.revoke", _table: "user_roles", _target: data.userId, _diff: { role: data.role },
    });
    return { ok: true };
  });

export const listRolePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("role_permissions").select("role,permission").order("role");
    if (error) throw new Error(error.message);
    return data ?? [];
  });
