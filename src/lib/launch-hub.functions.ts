import { createServerFn } from "@tanstack/react-start";

// Sector heatmap: counts of projects per sector + total funding.
export const getSectorHeatmap = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data } = await sb.from("projects").select("sector,shares_sold,share_price,country").eq("status", "active").limit(2000);
  const map = new Map<string, { sector: string; count: number; volume: number }>();
  for (const p of data ?? []) {
    const k = (p as any).sector || "أخرى";
    const v = map.get(k) || { sector: k, count: 0, volume: 0 };
    v.count += 1;
    v.volume += Number((p as any).shares_sold || 0) * Number((p as any).share_price || 0);
    map.set(k, v);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
});

// Trending projects: most viewed/funded in last 7d (best-effort).
export const getTrendingProjects = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data } = await sb.from("projects")
    .select("id,name,sector,shares_sold,shares_total,share_price,ai_score,cover_image_url")
    .eq("status", "active")
    .order("shares_sold", { ascending: false })
    .limit(10);
  return data ?? [];
});

// Today's performance: simple aggregate snapshot for the current user.
export const getTodayPerformance = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: projects } = await sb.from("projects").select("id", { count: "exact", head: true }).gte("created_at", since);
  const { count: trades } = await sb.from("share_trades").select("id", { count: "exact", head: true }).gte("created_at", since);
  return { newProjects: projects ?? 0, trades24h: trades ?? 0, at: new Date().toISOString() };
});
