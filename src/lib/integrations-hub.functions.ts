import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("forbidden");
}

export const listIntegrationConfigs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("integration_configs")
      .select("*")
      .order("category");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveIntegrationConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().min(1),
      enabled: z.boolean().optional(),
      config: z.record(z.string(), z.any()).optional(),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const patch: any = { updated_at: new Date().toISOString(), updated_by: context.userId };
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.config !== undefined) patch.config = data.config;
    const { error } = await context.supabase.from("integration_configs").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testIntegrationConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().min(1) }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data: row } = await context.supabase
      .from("integration_configs")
      .select("id, config")
      .eq("id", data.id)
      .maybeSingle();
    const cfg = (row?.config ?? {}) as any;
    const url: string | undefined = cfg.url || cfg.endpoint || cfg.host;
    let ok = false;
    let message = "لم يتم ضبط عنوان URL بعد";
    if (url) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(url, { method: "GET", signal: ctrl.signal });
        clearTimeout(t);
        ok = res.status < 500;
        message = `استجابة ${res.status}`;
      } catch (e: any) {
        message = e?.message ?? "فشل الاتصال";
      }
    }
    await context.supabase
      .from("integration_configs")
      .update({ last_tested_at: new Date().toISOString(), last_test_ok: ok, last_test_message: message })
      .eq("id", data.id);
    return { ok, message };
  });

export const generateVapidKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    // Generate ECDSA P-256 keypair via Web Crypto, export as base64url uncompressed point + d
    const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const pubJwk: any = await crypto.subtle.exportKey("jwk", kp.publicKey);
    const privJwk: any = await crypto.subtle.exportKey("jwk", kp.privateKey);
    const b64urlToBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(s.length + ((4 - (s.length % 4)) % 4), "=")), (c) => c.charCodeAt(0));
    const bytesToB64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const x = b64urlToBytes(pubJwk.x);
    const y = b64urlToBytes(pubJwk.y);
    const uncompressed = new Uint8Array(65);
    uncompressed[0] = 0x04;
    uncompressed.set(x, 1);
    uncompressed.set(y, 33);
    const publicKey = bytesToB64url(uncompressed);
    const privateKey = privJwk.d;
    await context.supabase
      .from("integration_configs")
      .upsert({
        id: "web_push",
        name_ar: "Web Push (إشعارات المتصفح)",
        category: "push",
        enabled: true,
        config: { publicKey, privateKey, subject: "mailto:admin@example.com" },
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      });
    return { publicKey };
  });
