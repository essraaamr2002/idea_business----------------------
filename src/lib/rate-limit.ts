/**
 * Server-side IP rate-limit helper (#100).
 * Backed by the existing public.rate_limit_events table.
 *
 * Usage inside a server route or createServerFn handler:
 *   await enforceRateLimit({ key: 'news.subscribe', limit: 5, windowSeconds: 60, request })
 */
import { createClient } from "@supabase/supabase-js";

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function enforceRateLimit(opts: {
  key: string;
  limit: number;
  windowSeconds: number;
  request: Request;
}): Promise<void> {
  const ip = clientIp(opts.request);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return; // skip silently in dev if not configured
  const sb = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const since = new Date(Date.now() - opts.windowSeconds * 1000).toISOString();
  const { count } = await sb
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", opts.key)
    .eq("identifier", ip)
    .gte("created_at", since);
  if ((count ?? 0) >= opts.limit) {
    throw new Response("Too Many Requests", { status: 429 }) as unknown as Error;
  }
  await sb.from("rate_limit_events").insert({
    event_type: opts.key,
    identifier: ip,
    metadata: {},
  } as any);
}
