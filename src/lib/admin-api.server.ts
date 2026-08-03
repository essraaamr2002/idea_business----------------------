import { createClient } from "@supabase/supabase-js";
import { isSameOriginRequest } from "@/lib/http-security.server";

export type AdminCtx = {
  userId: string;
  supabase: any;
  admin: any;
  audit: (
    action: string,
    target_table: string,
    target_id: string | null,
    diff: any,
  ) => Promise<void>;
};

// Admin endpoints are same-origin only. Deliberately omit
// Access-Control-Allow-Origin so untrusted websites cannot call privileged
// APIs with a browser-held bearer token.
export const ADMIN_CORS = {
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-AI, X-Requested-With",
  "Access-Control-Max-Age": "600",
  "Cache-Control": "no-store",
  Vary: "Origin",
};

export const adminJson = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...ADMIN_CORS },
  });

export const adminOptions = () => new Response(null, { status: 204, headers: ADMIN_CORS });

export async function requireAdmin(request: Request): Promise<AdminCtx | Response> {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !isSameOriginRequest(request)) {
    return adminJson({ error: "Cross-origin admin request rejected" }, 403);
  }
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return adminJson({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.slice(7).trim();
  if (!token || token.length > 8192) return adminJson({ error: "Unauthorized" }, 401);
  const url = process.env.SUPABASE_URL;
  const pub = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !pub) return adminJson({ error: "Server misconfigured" }, 500);

  const supabase = createClient(url, pub, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: u, error } = await supabase.auth.getUser();
  if (error || !u.user) return adminJson({ error: "Unauthorized" }, 401);

  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: u.user.id,
    _role: "admin",
  });
  if (!isAdmin) return adminJson({ error: "Forbidden — admin only" }, 403);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin: any = supabaseAdmin;
  const userId = u.user.id;

  const audit = async (
    action: string,
    target_table: string,
    target_id: string | null,
    diff: any,
  ) => {
    try {
      await admin.from("admin_audit_log").insert({
        actor_id: userId,
        action,
        target_table,
        target_id,
        diff,
      });
    } catch (_e) {
      /* never block response on audit failure */
    }
  };

  return { userId, supabase, admin, audit };
}
