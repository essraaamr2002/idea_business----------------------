import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Whitelisted Zod schemas for admin upserts. Service-role writes bypass RLS,
// so every field must be explicitly allowed; unknown keys are stripped.
const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(80).optional(),
  description: z.string().max(5000).optional().nullable(),
  price: z.number().nonnegative().optional(),
  currency: z.string().trim().max(10).optional(),
  category_id: z.string().uuid().optional().nullable(),
  image_url: z.string().url().max(1000).optional().nullable(),
  stock: z.number().int().min(0).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  is_featured: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).strict();

const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(60).optional(),
  description: z.string().max(2000).optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  image_url: z.string().url().max(1000).optional().nullable(),
}).strict();

const AutomationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(150),
  description: z.string().max(2000).optional().nullable(),
  trigger_type: z.string().trim().min(1).max(80),
  trigger_config: z.record(z.string(), z.any()).optional(),
  action_type: z.string().trim().min(1).max(80),
  action_config: z.record(z.string(), z.any()).optional(),
  enabled: z.boolean().optional(),
  conditions: z.record(z.string(), z.any()).optional(),
}).strict();

const BroadcastSchema = z.object({
  name: z.string().trim().min(1).max(200),
  subject: z.string().trim().max(300).optional().nullable(),
  content: z.string().trim().min(1).max(20000),
  channel: z.enum(["inapp", "email", "sms", "push"]),
  segment: z.record(z.string(), z.any()).optional(),
  scheduled_at: z.string().datetime().optional().nullable(),
}).strict();

const PageSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(300),
  content: z.string().max(100000).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  meta_title: z.string().max(200).optional().nullable(),
  meta_description: z.string().max(500).optional().nullable(),
}).strict();

const BannerSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().max(300).optional().nullable(),
  image_url: z.string().url().max(1000).optional().nullable(),
  link_url: z.string().url().max(1000).optional().nullable(),
  cta_label: z.string().max(80).optional().nullable(),
  placement: z.string().trim().max(80).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
}).strict();



async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("forbidden");
}

// ============== INTEGRATIONS ==============
export const listIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("integration_settings").select("*").order("category").order("display_name");
    if (error) throw error;
    return data ?? [];
  });

export const toggleIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: string; enabled: boolean; config?: any }) => d)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = { enabled: data.enabled };
    if (data.config) patch.config = data.config;
    const { error } = await (supabaseAdmin as any)
      .from("integration_settings").update(patch).eq("provider", data.provider);
    if (error) throw error;
    return { ok: true };
  });

export const testIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: string; recipient?: string; message?: string }) => d)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const log = async (status: string, response: any, error?: string) => {
      await (supabaseAdmin as any).from("integration_logs").insert({
        provider: data.provider, action: "test", status,
        recipient: data.recipient ?? null,
        payload: { message: data.message ?? "Test from Admin" },
        response, error: error ?? null, triggered_by: context.userId,
      });
      await (supabaseAdmin as any).from("integration_settings").update({
        last_test_at: new Date().toISOString(),
        last_test_status: status,
        last_test_error: error ?? null,
      }).eq("provider", data.provider);
    };

    try {
      const gateway = "https://connector-gateway.lovable.dev";
      const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      let result: any = { skipped: true, reason: "no live test for this provider" };

      if (data.provider === "twilio_sms" && process.env.TWILIO_API_KEY && data.recipient) {
        const r = await fetch(`${gateway}/twilio/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": process.env.TWILIO_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: data.recipient, Body: data.message ?? "Test", From: "" }),
        });
        result = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(result));
      } else if (data.provider === "slack_chat" && process.env.SLACK_API_KEY) {
        const r = await fetch(`${gateway}/slack/api/auth.test`, {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": process.env.SLACK_API_KEY },
        });
        result = await r.json();
      } else if (data.provider === "hubspot_crm" && process.env.HUBSPOT_API_KEY) {
        const r = await fetch(`${gateway}/hubspot/crm/v3/objects/contacts?limit=1`, {
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": process.env.HUBSPOT_API_KEY },
        });
        result = { status: r.status, ok: r.ok };
      } else {
        result = { skipped: true, reason: "Connector not linked yet — connect it from the Integrations Hub." };
      }

      await log("success", result);
      return { ok: true, result };
    } catch (e: any) {
      await log("error", null, e?.message ?? String(e));
      return { ok: false, error: e?.message ?? String(e) };
    }
  });

export const listIntegrationLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider?: string; limit?: number } = {}) => d)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q: any = (supabaseAdmin as any).from("integration_logs").select("*").order("created_at", { ascending: false }).limit(data.limit ?? 100);
    if (data.provider) q = q.eq("provider", data.provider);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

// ============== PRODUCTS ==============
export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("products").select("*, category:product_categories(name)").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProductSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { ...data };
    if (!patch.slug && patch.name) {
      patch.slug = String(patch.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) + "-" + Math.random().toString(36).slice(2, 6);
    }
    const { error, data: row } = await (supabaseAdmin as any).from("products").upsert(patch).select().single();
    if (error) throw error;
    return row;
  });


export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("product_categories").select("*").order("sort_order");
    return data ?? [];
  });

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CategorySchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { ...data };
    if (!patch.slug && patch.name) {
      patch.slug = String(patch.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
    }
    const { error, data: row } = await (supabaseAdmin as any).from("product_categories").upsert(patch).select().single();
    if (error) throw error;
    return row;
  });


export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("product_orders").select("*, items:product_order_items(*)").order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return data ?? [];
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string; tracking_number?: string }) => d)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = { status: data.status };
    if (data.tracking_number) patch.tracking_number = data.tracking_number;
    const { error } = await (supabaseAdmin as any).from("product_orders").update(patch).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// ============== AUTOMATIONS ==============
export const listAutomations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("automation_rules").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const upsertAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AutomationSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { ...data, created_by: context.userId };
    const { error, data: row } = await (supabaseAdmin as any).from("automation_rules").upsert(patch).select().single();
    if (error) throw error;
    return row;
  });


export const deleteAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("automation_rules").delete().eq("id", data.id);
    return { ok: true };
  });

// ============== BROADCAST ==============
export const listBroadcasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("broadcast_campaigns").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const createBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BroadcastSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { ...data, created_by: context.userId };
    const { error, data: row } = await (supabaseAdmin as any).from("broadcast_campaigns").insert(patch).select().single();
    if (error) throw error;
    return row;
  });


export const sendBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await (supabaseAdmin as any).from("broadcast_campaigns").select("*").eq("id", data.id).single();
    if (!c) throw new Error("not found");

    // For inapp broadcasts: write notifications for all users (or segment)
    let sent = 0;
    if (c.channel === "inapp") {
      const { data: users } = await (supabaseAdmin as any).from("profiles").select("id");
      if (users?.length) {
        const rows = users.map((u: any) => ({
          user_id: u.id, type: "broadcast", title: c.subject ?? c.name, message: c.content,
        }));
        await (supabaseAdmin as any).from("notifications").insert(rows);
        sent = users.length;
      }
    }
    // SMS/Email channels require linked connector; log otherwise
    await (supabaseAdmin as any).from("broadcast_campaigns").update({
      status: "sent", sent_at: new Date().toISOString(), stats: { sent, channel: c.channel },
    }).eq("id", data.id);

    return { ok: true, sent };
  });

// ============== CMS ==============
export const listPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("cms_pages").select("*").order("updated_at", { ascending: false });
    return data ?? [];
  });

export const upsertPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PageSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { ...data, updated_by: context.userId };
    const { error, data: row } = await (supabaseAdmin as any).from("cms_pages").upsert(patch).select().single();
    if (error) throw error;
    return row;
  });


export const listBanners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("cms_banners").select("*").order("sort_order");
    return data ?? [];
  });

export const upsertBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BannerSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error, data: row } = await (supabaseAdmin as any).from("cms_banners").upsert(data).select().single();
    if (error) throw error;
    return row;
  });


// ============== HEALTH ==============
export const getHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;
    const since1h = new Date(Date.now() - 3600_000).toISOString();
    const since24h = new Date(Date.now() - 86_400_000).toISOString();

    const [snapshots, errors24h, logs24h, integrations, automations] = await Promise.all([
      admin.from("backup_snapshots").select("*", { count: "exact", head: true }),
      admin.from("integration_logs").select("*", { count: "exact", head: true }).eq("status", "error").gte("created_at", since24h),
      admin.from("integration_logs").select("*", { count: "exact", head: true }).gte("created_at", since1h),
      admin.from("integration_settings").select("*", { count: "exact", head: true }).eq("enabled", true),
      admin.from("automation_rules").select("*", { count: "exact", head: true }).eq("enabled", true),
    ]);
    const { data: latestSnap } = await admin.from("backup_snapshots").select("snapshot_at").order("snapshot_at", { ascending: false }).limit(1).maybeSingle();

    return {
      backups_total: snapshots.count ?? 0,
      latest_backup: latestSnap?.snapshot_at ?? null,
      integration_errors_24h: errors24h.count ?? 0,
      integration_calls_1h: logs24h.count ?? 0,
      integrations_enabled: integrations.count ?? 0,
      automations_enabled: automations.count ?? 0,
    };
  });
