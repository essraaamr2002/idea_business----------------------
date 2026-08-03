import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdminStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_admin_staff", { _user_id: userId });
  if (!data) throw new Error("forbidden");
}
async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("forbidden");
}

export const listSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ category: z.string().optional() }).parse(input ?? {})
  )
  .handler(async ({ data, context }) => {
    await requireAdminStaff(context.supabase, context.userId);
    let q = context.supabase
      .from("platform_settings")
      .select("key,value,category,label,description,value_type,updated_at")
      .order("category", { ascending: true })
      .order("key", { ascending: true });
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ key: z.string().min(1).max(120), value: z.any() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: prev } = await context.supabase
      .from("platform_settings").select("value").eq("key", data.key).maybeSingle();
    const { error } = await context.supabase
      .from("platform_settings")
      .update({ value: data.value, updated_at: new Date().toISOString(), updated_by: context.userId })
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    await context.supabase.rpc("log_admin_action", {
      _action: "settings.update",
      _table: "platform_settings",
      _target: data.key,
      _diff: { before: prev?.value ?? null, after: data.value },
    });
    return { ok: true };
  });

export const getPublicPixels = createServerFn({ method: "GET" })
  .handler(async () => {
    // Public read of marketing pixel IDs only (non-sensitive client-side IDs)
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    // Use admin client because settings are admin-only read; pixel IDs are not secrets.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("platform_settings")
      .select("key,value")
      .in("key", [
        "pixel_meta_id",
        "pixel_tiktok_id",
        "pixel_snapchat_id",
        "pixel_google_analytics_id",
        "pixel_google_ads_id",
        "pixel_twitter_id",
        "pixel_linkedin_id",
        "pixel_pinterest_id",
      ]);
    // Strict allowlist: legitimate ad-platform pixel IDs are alphanumeric
    // with optional hyphen/underscore. Prevents stored XSS via pixel settings.
    const PIXEL_ID_RE = /^[A-Za-z0-9_\-]{1,64}$/;
    const out: Record<string, string> = {};
    for (const r of data ?? []) {
      const v = (r as any).value;
      const raw = typeof v === "string" ? v : JSON.stringify(v ?? "");
      const id = raw.replace(/^"|"$/g, "");
      if (PIXEL_ID_RE.test(id)) out[(r as any).key] = id;
    }
    return out;
    // Note: sb intentionally unused (kept for future narrow public policy)
    void sb;
  });
