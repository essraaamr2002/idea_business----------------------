import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// قائمة مشاريع المالك مع إحصاءات سريعة
export const listMyProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, status, cover_image_url, currency, share_price, shares_total, shares_sold, views_count, likes_count, marketplace_listed, created_at, updated_at, last_bumped_at" as any)
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

// تحديث/رفع المشروع (Bump) — مرّة كل 3 أيام
export const bumpMyProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await (context.supabase as any).rpc("bump_my_project", { p_project_id: data.project_id });
    if (error) throw new Error(error.message);
    const row = Array.isArray(res) ? res[0] : res;
    if (!row?.ok) {
      if (row?.message === "cooldown") {
        const next = row.next_allowed_at ? new Date(row.next_allowed_at).toLocaleString("ar") : "";
        throw new Error(`لا يمكن التحديث الآن. التحديث القادم متاح بعد: ${next}`);
      }
      if (row?.message === "forbidden") throw new Error("ليس مشروعك");
      if (row?.message === "not_found") throw new Error("المشروع غير موجود");
      throw new Error("تعذر التحديث");
    }
    return { ok: true, last_bumped_at: row.last_bumped_at, next_allowed_at: row.next_allowed_at };
  });

// حذف مشروع
export const deleteMyProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", data.project_id)
      .eq("owner_id", userId);
    if (error) throw error;
    return { ok: true };
  });

// نقل/سحب من السوق الموازي
export const toggleMarketplaceListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid(), listed: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await (supabase.from("projects") as any)
      .update({ marketplace_listed: data.listed })
      .eq("id", data.project_id)
      .eq("owner_id", userId);
    if (error) throw error;
    return { ok: true };
  });

// قائمة المستثمرين الحاليين لمشروع
export const listProjectInvestors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // تأكد أن المستخدم هو المالك
    const { data: proj } = await supabase.from("projects").select("owner_id").eq("id", data.project_id).maybeSingle();
    if (!proj || proj.owner_id !== userId) throw new Error("forbidden");
    const { data: rows, error } = await supabase
      .from("project_shares")
      .select("user_id, shares, avg_price, updated_at, profiles:profiles!project_shares_user_id_fkey(display_name, avatar_url, alias_name, use_alias_default)")
      .eq("project_id", data.project_id)
      .gt("shares", 0)
      .order("shares", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });
