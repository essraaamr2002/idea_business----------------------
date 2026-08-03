// Server functions for technical infrastructure (search, webhooks, API keys, alerts, feature flags)
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// 1) Full-Text Search
export const searchProjects = createServerFn({ method: "POST" })
  .inputValidator((d: { q: string; limit?: number }) =>
    z.object({ q: z.string().min(1).max(200), limit: z.number().int().min(1).max(50).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data: rows, error } = await sb
      .from("projects")
      .select("id,name,description,sector,country,share_price,ai_score,image_url")
      .textSearch("search_tsv", data.q, { type: "websearch", config: "simple" })
      .limit(data.limit ?? 20);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// 2) Price Watch Rules CRUD
export const createPriceAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId?: string; condition: "above" | "below" | "change_pct"; threshold: number }) =>
    z.object({
      projectId: z.string().uuid().optional(),
      condition: z.enum(["above", "below", "change_pct"]),
      threshold: z.number().positive(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("price_watch_rules" as any)
      .insert({ user_id: context.userId, project_id: data.projectId, condition: data.condition, threshold: data.threshold })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyPriceAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("price_watch_rules" as any)
      .select("*").eq("user_id", context.userId).order("created_at", { ascending: false });
    return data ?? [];
  });

export const deletePriceAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("price_watch_rules" as any).delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

// 3) Developer Webhooks
export const createWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string; events?: string[] }) =>
    z.object({ url: z.string().url(), events: z.array(z.string()).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const secret = "whsec_" + crypto.randomUUID().replace(/-/g, "");
    const { data: row, error } = await context.supabase.from("developer_webhooks" as any)
      .insert({ user_id: context.userId, url: data.url, secret, events: data.events ?? ["*"] })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyWebhooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("developer_webhooks" as any)
      .select("*").eq("user_id", context.userId).order("created_at", { ascending: false });
    return data ?? [];
  });

// 4) Partner API Keys
export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; scopes?: string[] }) =>
    z.object({ name: z.string().min(1).max(80), scopes: z.array(z.string()).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const raw = "idea_" + crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const prefix = raw.slice(0, 10);
    const buf = new TextEncoder().encode(raw);
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    const hash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await context.supabase.from("partner_api_keys" as any).insert({
      user_id: context.userId, name: data.name, key_hash: hash, prefix,
      scopes: data.scopes ?? ["read:public"],
    });
    if (error) throw new Error(error.message);
    return { key: raw, prefix, message: "احفظ هذا المفتاح الآن — لن يظهر مرة أخرى." };
  });

export const listMyApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("partner_api_keys" as any)
      .select("id,name,prefix,scopes,last_used_at,revoked_at,created_at")
      .eq("user_id", context.userId).order("created_at", { ascending: false });
    return data ?? [];
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("partner_api_keys" as any)
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

// 5) Feature flag evaluation
export const evaluateFeatureFlag = createServerFn({ method: "POST" })
  .inputValidator((d: { key: string; userId?: string }) =>
    z.object({ key: z.string().min(1), userId: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data: flag } = await sb.from("feature_flags").select("*").eq("key", data.key).maybeSingle();
    if (!flag) return { enabled: false };
    if (!flag.enabled) return { enabled: false };
    if (flag.rollout_percent >= 100) return { enabled: true };
    if (!data.userId) return { enabled: flag.rollout_percent >= 100 };
    // Deterministic bucket
    const buf = new TextEncoder().encode(data.userId + ":" + data.key);
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    const bucket = new Uint8Array(hashBuf)[0] % 100;
    return { enabled: bucket < flag.rollout_percent };
  });

// 6) Market Stats (cached materialized view)
export const getMarketStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data } = await sb.from("market_stats_mv" as any).select("*").limit(1).maybeSingle();
    return data ?? null;
  });
