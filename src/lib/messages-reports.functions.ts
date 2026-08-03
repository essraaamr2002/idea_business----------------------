import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const REASONS = ["harassment", "scam", "spam", "inappropriate", "other"] as const;

export const reportConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      conversationId: z.string().uuid(),
      reportedUserId: z.string().uuid(),
      reason: z.enum(REASONS),
      notes: z.string().max(1000).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    if (data.reportedUserId === context.userId) throw new Error("لا يمكنك الإبلاغ عن نفسك");
    const { error } = await context.supabase.from("message_reports").insert({
      conversation_id: data.conversationId,
      reporter_id: context.userId,
      reported_user_id: data.reportedUserId,
      reason: data.reason,
      notes: data.notes ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyMessagePrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_preferences")
      .select("messages_email, messages_push, messages_silent, hide_read_receipts")
      .eq("user_id", context.userId).maybeSingle();
    return {
      messages_email: (data as any)?.messages_email ?? true,
      messages_push: (data as any)?.messages_push ?? true,
      messages_silent: (data as any)?.messages_silent ?? false,
      hide_read_receipts: (data as any)?.hide_read_receipts ?? false,
    };
  });

export const setMyMessagePrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      messages_email: z.boolean().optional(),
      messages_push: z.boolean().optional(),
      messages_silent: z.boolean().optional(),
      hide_read_receipts: z.boolean().optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const row: any = { user_id: context.userId, ...data, updated_at: new Date().toISOString() };
    const { error } = await context.supabase
      .from("user_preferences")
      .upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListMessageReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ status: z.enum(["open", "reviewing", "resolved", "dismissed", "all"]).optional() }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: isAdmin }, { data: isMod }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
    ]);
    if (!isAdmin && !isMod) throw new Error("FORBIDDEN");
    let q = supabase.from("message_reports")
      .select("id, conversation_id, reporter_id, reported_user_id, reason, notes, status, created_at, resolved_at")
      .order("created_at", { ascending: false }).limit(200);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set([...(rows ?? []).map((r: any) => r.reporter_id), ...(rows ?? []).map((r: any) => r.reported_user_id)]));
    const profMap: Record<string, any> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      (profs ?? []).forEach((p: any) => { profMap[p.id] = p; });
    }
    return { reports: (rows ?? []).map((r: any) => ({ ...r, reporter: profMap[r.reporter_id], reported: profMap[r.reported_user_id] })) };
  });

export const adminUpdateReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["open", "reviewing", "resolved", "dismissed"]) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: isAdmin }, { data: isMod }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
    ]);
    if (!isAdmin && !isMod) throw new Error("FORBIDDEN");
    const patch: any = { status: data.status };
    if (data.status === "resolved" || data.status === "dismissed") {
      patch.resolved_by = userId; patch.resolved_at = new Date().toISOString();
    }
    const { error } = await supabase.from("message_reports").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: list all users' message-notification prefs. */
export const adminListMessagePrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prefs } = await supabaseAdmin
      .from("user_preferences")
      .select("user_id, messages_email, messages_push, messages_silent, hide_read_receipts")
      .order("updated_at", { ascending: false }).limit(500);
    const ids = (prefs ?? []).map((p: any) => p.user_id);
    const profMap: Record<string, any> = {};
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id, display_name, avatar_url").in("id", ids);
      (profs ?? []).forEach((p: any) => { profMap[p.id] = p; });
    }
    return { rows: (prefs ?? []).map((p: any) => ({ ...p, profile: profMap[p.user_id] })) };
  });

export const adminSetUserMessagePrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      userId: z.string().uuid(),
      messages_email: z.boolean().optional(),
      messages_push: z.boolean().optional(),
      messages_silent: z.boolean().optional(),
      hide_read_receipts: z.boolean().optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId, ...patch } = data;
    const { error } = await supabaseAdmin
      .from("user_preferences")
      .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
