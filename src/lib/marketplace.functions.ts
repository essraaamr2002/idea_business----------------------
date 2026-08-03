import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: any) {
  const { data, error } = await (ctx.supabase as any).rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const listMarketplaceProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const supabase: any = (context.supabase as any);
    const { data: providers, error } = await supabase
      .from("providers")
      .select("*")
      .order("category")
      .order("sort_order");
    if (error) throw new Error(error.message);
    const { data: configs } = await supabase
      .from("tenant_provider_configs")
      .select("*");
    return { providers: providers ?? [], configs: configs ?? [] };
  });

export const saveProviderConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider_id: string; credentials: Record<string, any>; settings?: Record<string, any> }) =>
    z.object({
      provider_id: z.string().uuid(),
      credentials: z.record(z.string(), z.any()),
      settings: z.record(z.string(), z.any()).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const supabase: any = (context.supabase as any);
    const { data: existing } = await supabase
      .from("tenant_provider_configs")
      .select("id")
      .eq("provider_id", data.provider_id)
      .is("tenant_id", null)
      .maybeSingle();
    const payload = {
      provider_id: data.provider_id,
      credentials: data.credentials,
      settings: data.settings ?? {},
      status: "connected" as const,
      connected_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
      last_error: null,
    };
    if (existing) {
      const { error } = await supabase.from("tenant_provider_configs").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: existing.id };
    }
    const { data: ins, error } = await supabase.from("tenant_provider_configs").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const disconnectProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { config_id: string }) => z.object({ config_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any)
      .from("tenant_provider_configs")
      .update({ status: "disconnected", connected_at: null })
      .eq("id", data.config_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testProviderConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider_id: string }) => z.object({ provider_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const supabase: any = (context.supabase as any);
    const { data: prov } = await supabase.from("providers").select("slug,category").eq("id", data.provider_id).single();
    const { data: cfg } = await supabase
      .from("tenant_provider_configs")
      .select("credentials")
      .eq("provider_id", data.provider_id)
      .maybeSingle();
    if (!prov || !cfg) return { ok: false, message: "لم يتم إعداد المزود بعد" };
    const creds = cfg.credentials as Record<string, string>;
    try {
      let ok = false;
      let message = "";
      switch (prov.slug) {
        case "stripe": {
          const r = await fetch("https://api.stripe.com/v1/balance", {
            headers: { Authorization: `Bearer ${creds.secret_key}` },
          });
          ok = r.ok;
          message = ok ? "Stripe متصل" : `فشل: ${r.status}`;
          break;
        }
        case "resend": {
          const r = await fetch("https://api.resend.com/domains", {
            headers: { Authorization: `Bearer ${creds.api_key}` },
          });
          ok = r.ok;
          message = ok ? "Resend متصل" : `فشل: ${r.status}`;
          break;
        }
        case "wordpress-headless": {
          const r = await fetch(`${creds.site_url?.replace(/\/$/, "")}/wp-json/wp/v2/posts?per_page=1`);
          ok = r.ok;
          message = ok ? "WP REST يعمل" : `فشل: ${r.status}`;
          break;
        }
        default:
          ok = Object.values(creds).every((v) => typeof v === "string" && v.length > 0);
          message = ok ? "الحقول محفوظة (لا يوجد فحص مباشر)" : "حقول ناقصة";
      }
      await supabase
        .from("tenant_provider_configs")
        .update({
          status: ok ? "connected" : "error",
          last_verified_at: new Date().toISOString(),
          last_error: ok ? null : message,
        })
        .eq("provider_id", data.provider_id);
      return { ok, message };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? "خطأ غير معروف" };
    }
  });
