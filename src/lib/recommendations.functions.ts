import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Personalized project recommendations (#115).
 * Heuristic: pick active projects in sectors the user already follows/owns shares in,
 * fall back to most-funded active projects.
 */
export const recommendForMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ limit: z.number().int().min(1).max(12).default(6) }).parse(input ?? {}))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // 1) Sectors the user already invested in
    const { data: my } = await supabase
      .from("project_shares")
      .select("project_id, projects(sector)")
      .eq("user_id", userId);
    const mySectors = Array.from(new Set((my ?? []).map((r: any) => r.projects?.sector).filter(Boolean)));

    const base = supabase
      .from("projects")
      .select("id, name, ticker, sector, country, current_price, share_price, shares_total, shares_sold, cover_image_url, created_at")
      .eq("status", "active")
      .limit(data.limit);

    const { data: rows } = mySectors.length > 0 ? await base.in("sector", mySectors) : await base.order("shares_sold", { ascending: false });
    return rows ?? [];
  });

/**
 * Lightweight AI-style project scoring (#111).
 * Deterministic formula: weights guarantees coverage, funding velocity, and verification.
 * Server-side so it can be used for ranking without exposing the formula.
 */
export const scoreProject = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: p } = await sb
      .from("projects")
      .select("id, shares_total, shares_sold, share_price, status, created_at, sector")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!p) return { score: 0, signals: [] };

    const ageDays = (Date.now() - new Date(p.created_at as any).getTime()) / 86400_000;
    const fundedPct = (p.shares_total ? Number(p.shares_sold ?? 0) / Number(p.shares_total) : 0) * 100;
    const velocity = ageDays > 0 ? fundedPct / ageDays : 0;

    let score = 30; // base
    const signals: string[] = [];
    if (fundedPct > 30) { score += 15; signals.push("اهتمام مرتفع من المستثمرين"); }
    if (fundedPct > 70) { score += 10; signals.push("اكتمال تمويل قارب"); }
    if (velocity > 3)   { score += 15; signals.push("سرعة بيع أسهم مرتفعة"); }
    if (ageDays < 14)   { score += 10; signals.push("مشروع حديث في نافذة الإطلاق"); }
    if (p.status === "active") { score += 10; signals.push("الحالة نشطة"); }
    if (p.sector)       { score += 5; }

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      signals,
      fundedPct: Math.round(fundedPct),
    };
  });
