import { createMiddleware } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

/**
 * Application Firewall (WAF)
 * - Blocks IPs listed in public.ip_blocklist
 * - Detects suspicious query strings (SQLi / XSS patterns)
 * - Logs every block to public.security_events
 *
 * Internal Lovable routes (/lovable/*) bypass this layer.
 */

const SUSPICIOUS_PATTERNS: RegExp[] = [
  /(\bunion\b\s+\bselect\b)/i,
  /(\bselect\b.+\bfrom\b\s+information_schema)/i,
  /(\bdrop\b\s+\btable\b)/i,
  /(<\s*script[^>]*>)/i,
  /(javascript\s*:)/i,
  /(\bor\b\s+1\s*=\s*1\b)/i,
  /(\.\.\/){3,}/, // path traversal
];

function clientIp(request: Request): string | null {
  const h = request.headers;
  // Trust Cloudflare-verified IP first; only fall back to client-supplied
  // headers when running outside Cloudflare (local dev). This prevents
  // X-Forwarded-For spoofing from bypassing the IP blocklist.
  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip") || null;
}

function isSuspicious(url: URL): { hit: boolean; pattern?: string } {
  const search = url.search;
  if (!search) return { hit: false };
  for (const re of SUSPICIOUS_PATTERNS) {
    if (re.test(search)) return { hit: true, pattern: re.source };
  }
  return { hit: false };
}

let _publicClient: any = null;
function publicSupabase(): any {
  if (_publicClient) return _publicClient;
  _publicClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
  return _publicClient;
}


export const wafMiddleware = createMiddleware().server(async ({ request, next }) => {
  const url = new URL(request.url);
  // Allow Lovable internal & static assets & security.txt unchecked
  if (
    url.pathname.startsWith("/lovable/") ||
    url.pathname.startsWith("/_build/") ||
    url.pathname.startsWith("/.well-known/") ||
    url.pathname.startsWith("/favicon")
  ) {
    return next();
  }

  const ip = clientIp(request);
  const ua = request.headers.get("user-agent") || "";

  // 1. IP blocklist check
  if (ip) {
    try {
      const sb = publicSupabase();
      const { data } = await sb.rpc("is_ip_blocked", { p_ip: ip });
      if (data === true) {
        // Fire-and-forget log
        sb.rpc("log_security_event", {
          p_event_type: "waf.blocked_ip_request",
          p_severity: "high",
          p_resource: url.pathname,
          p_details: { method: request.method },
          p_blocked: true,
          p_ip: ip,
          p_user_agent: ua,
        }).then(() => {}, () => {});
        return new Response("Forbidden", { status: 403 });
      }
    } catch {
      // Fail open on infra error — don't block legitimate traffic
    }
  }

  // 2. Suspicious payload detection
  const sus = isSuspicious(url);
  if (sus.hit) {
    try {
      publicSupabase()
        .rpc("log_security_event", {
          p_event_type: "waf.suspicious_request",
          p_severity: "high",
          p_resource: url.pathname,
          p_details: { pattern: sus.pattern, query: url.search.slice(0, 200) },
          p_blocked: true,
          p_ip: ip,
          p_user_agent: ua,
        })
        .then(() => {}, () => {});
    } catch {}
    return new Response("Bad Request", { status: 400 });
  }

  return next();
});
