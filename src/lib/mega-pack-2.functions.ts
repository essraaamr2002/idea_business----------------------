import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ------- Member: Price Alerts CRUD -------
export const listPriceAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("price_alerts")
      .select("id, project_id, condition, target_value, is_triggered, created_at, triggered_at, projects(name, ticker, current_price)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { ok: true as const, items: data ?? [] };
  });

export const addPriceAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      project_id: z.string().uuid(),
      condition: z.enum(["above", "below"]),
      target_value: z.number().positive(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("price_alerts").insert({
      user_id: context.userId,
      project_id: data.project_id,
      condition: data.condition,
      target_value: data.target_value,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deletePriceAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("price_alerts").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ------- Member: Points ledger + level -------
export const getPointsLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_points_log")
      .select("id, points, reason, ref_type, ref_id, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const total = (data ?? []).reduce((s, r) => s + Number(r.points ?? 0), 0);
    const level = total >= 5000 ? "أسد 🦁" : total >= 1500 ? "غزال 🦌" : "طير 🪿";
    const next = total >= 5000 ? null : total >= 1500 ? 5000 - total : 1500 - total;
    return { ok: true as const, items: data ?? [], total, level, points_to_next: next };
  });

// ------- Public: Sector Leaderboard -------
export const getSectorLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await sb
    .from("projects")
    .select("id, name, sector, current_price, share_price, shares_sold, shares_total, view_count, likes_count")
    .eq("status", "active")
    .limit(500);
  const bySector = new Map<string, { sector: string; count: number; funded: number; views: number; top_id?: string; top_score?: number; top_name?: string }>();
  for (const p of data ?? []) {
    const sector = (p.sector as string) || "غير مصنّف";
    const s = bySector.get(sector) ?? { sector, count: 0, funded: 0, views: 0 };
    s.count += 1;
    s.funded += Number(p.shares_sold ?? 0) * Number(p.share_price ?? 0);
    s.views += Number(p.view_count ?? 0);
    const score = Number(p.view_count ?? 0) + Number(p.likes_count ?? 0) * 3;
    if (!s.top_score || score > s.top_score) {
      s.top_score = score;
      s.top_id = p.id as string;
      s.top_name = p.name as string;
    }
    bySector.set(sector, s);
  }
  const sectors = Array.from(bySector.values()).sort((a, b) => b.funded - a.funded);
  return { ok: true as const, sectors };
});

// ------- Member: Trading Orders History -------
export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("share_orders_v2")
      .select("id, project_id, type, side, quantity, price, filled_quantity, avg_fill_price, status, leverage, created_at, filled_at, projects(name, ticker)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { ok: true as const, items: data ?? [] };
  });

// ------- Admin: Referral leaderboard -------
export const getReferralsLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("referrals")
      .select("referrer_id, code, uses_count, reward_total")
      .order("uses_count", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { ok: true as const, items: data ?? [] };
  });
