import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";

export const getMyGamification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [pointsRes, achRes, allAchRes] = await Promise.all([
      context.supabase.from("user_points_log").select("points").eq("user_id", context.userId),
      context.supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", context.userId),
      context.supabase.from("achievements").select("*").order("points", { ascending: true }),
    ]);
    const total = (pointsRes.data ?? []).reduce((s, r) => s + (r.points ?? 0), 0);
    const level = total >= 5000 ? "platinum" : total >= 2000 ? "gold" : total >= 500 ? "silver" : "bronze";
    const levelArabic = { bronze: "برونزي", silver: "فضي", gold: "ذهبي", platinum: "بلاتيني" }[level];
    const next = level === "bronze" ? 500 : level === "silver" ? 2000 : level === "gold" ? 5000 : null;
    return {
      points: total,
      level,
      levelArabic,
      nextThreshold: next,
      progress: next ? Math.min(100, Math.round((total / next) * 100)) : 100,
      unlocked: achRes.data ?? [],
      all: allAchRes.data ?? [],
    };
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ limit: z.number().int().min(1).max(100).default(20) }).parse(i ?? {}))
  .handler(async ({ data }) => {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
    const { data: rows } = await sb
      .from("user_points_log")
      .select("user_id, points")
      .limit(2000);
    if (!rows) return [];
    const sums = new Map<string, number>();
    for (const r of rows as any[]) sums.set(r.user_id, (sums.get(r.user_id) ?? 0) + (r.points ?? 0));
    const top = [...sums.entries()].sort((a, b) => b[1] - a[1]).slice(0, data.limit);
    if (!top.length) return [];
    const { data: profiles } = await sb.from("profiles").select("id, display_name, pseudonym, avatar_url").in("id", top.map((t) => t[0]));
    const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return top.map(([id, points], i) => ({
      rank: i + 1,
      id,
      name: (map.get(id) as any)?.display_name ?? (map.get(id) as any)?.pseudonym ?? "مستخدم",
      avatar: (map.get(id) as any)?.avatar_url ?? null,
      points,
    }));
  });
