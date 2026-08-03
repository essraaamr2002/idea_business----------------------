import { createMiddleware } from "@tanstack/react-start";

/**
 * HTTP-layer firewall: adds strict security response headers to every request.
 * Complements the in-app CSP meta and the per-route rate limiting RPCs.
 */
export const securityHeadersMiddleware = createMiddleware().server(
  async ({ request, next }) => {
    const result = await next();
    // Skip injecting strict headers on /lovable/* internal routes (webhooks/cron/preview).
    if (new URL(request.url).pathname.startsWith("/lovable/")) {
      return result;
    }
    const res = result as unknown as { response?: Response };
    const response = res.response;
    if (response && response.headers) {
      const h = response.headers;
      const set = (k: string, v: string) => {
        if (!h.has(k)) h.set(k, v);
      };
      set("X-Content-Type-Options", "nosniff");
      set("X-Frame-Options", "DENY");
      set("Referrer-Policy", "strict-origin-when-cross-origin");
      set(
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=(self), payment=(self), usb=(), magnetometer=()",
      );
      set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
      set("X-DNS-Prefetch-Control", "off");
      set("X-Permitted-Cross-Domain-Policies", "none");
      set("Cross-Origin-Opener-Policy", "same-origin");
      set("Cross-Origin-Resource-Policy", "same-site");
    }
    return result;
  },
);
