import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

function publicClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

// ----- Deterministic Investment DNA (12 factors, 0-100 each) -----
function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}
function computeDNA(p: any) {
  const price = Number(p.share_price || 0);
  const sharesTotal = Number(p.shares_total || 0);
  const sharesSold = Number(p.shares_sold || 0);
  const target = Number(p.target_investment || sharesTotal * price || 1);
  const raised = sharesSold * price;
  const views = Number(p.views_count || p.view_count || 0);
  const likes = Number(p.likes_count || 0);
  const trustScore = Number(p.trust_score || 0); // 0-100 assumed
  const aiScore = Number(p.ai_score || 0);
  const hasDocs = !!p.business_plan_pdf_url;
  const ageDays = Math.max(
    1,
    (Date.now() - new Date(p.created_at || Date.now()).getTime()) / 86_400_000,
  );

  const traction = clamp((raised / target) * 100);
  const liquidity = clamp(Math.log10(sharesTotal + 10) * 20);
  const momentum = clamp((views / ageDays) * 2);
  const community = clamp(likes * 3);
  const affordability = clamp(100 - Math.min(100, price / 100));
  const transparency = clamp((hasDocs ? 60 : 25) + (p.video_url ? 20 : 0) + (p.cover_image_url ? 20 : 0));
  const risk = clamp(100 - traction * 0.3 - transparency * 0.4);
  const scalability = clamp(Math.log10(target + 10) * 12);
  const virality = clamp(momentum * 0.6 + community * 0.4);
  const trust = clamp(trustScore * 0.7 + transparency * 0.3);
  const growth = clamp((raised / Math.max(1, ageDays)) / (target / 365) * 50);
  const uniqueness = clamp(50 + (p.sector ? 20 : 0) + Math.min(30, aiScore / 3));

  const dna = {
    traction, liquidity, momentum, community, affordability, transparency,
    risk, scalability, virality, trust, growth, uniqueness,
  };
  const overall = clamp(
    (traction * 0.15 + trust * 0.15 + growth * 0.12 + momentum * 0.1 +
      community * 0.08 + liquidity * 0.08 + scalability * 0.1 + virality * 0.07 +
      transparency * 0.1 + affordability * 0.03 + uniqueness * 0.02) - risk * 0.1,
  );
  return { dna, overall };
}
function fairValue(p: any, overall: number) {
  const market = Number(p.share_price || 1);
  // Fair value biased by overall score: 0.5x .. 1.8x
  const multiplier = 0.5 + (overall / 100) * 1.3;
  return Math.round(market * multiplier * 100) / 100;
}
function signalOf(market: number, fair: number): "undervalued" | "fair" | "overvalued" {
  if (fair > market * 1.1) return "undervalued";
  if (fair < market * 0.9) return "overvalued";
  return "fair";
}

export const computeOracleSignal = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ projectId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: p, error } = await sb
      .from("projects")
      .select(
        "id, name, sector, target_investment, shares_total, shares_sold, share_price, views_count, view_count, likes_count, trust_score, ai_score, business_plan_pdf_url, video_url, cover_image_url, created_at",
      )
      .eq("id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) throw new Error("project_not_found");

    const { dna, overall } = computeDNA(p);
    const market = Number(p.share_price || 1);
    const fair = fairValue(p, overall);
    const signal = signalOf(market, fair);
    const success_probability = Math.round(overall);

    // Optional AI reasoning (best-effort)
    let reasoning = "";
    try {
      const gw = createLovableAiGatewayProvider();
      const { text } = await generateText({
        model: gw("google/gemini-3-flash-preview"),
        prompt:
          `مشروع: ${p.name} (${p.sector ?? "عام"}). ` +
          `الدرجة الكلية ${overall}/100، الإشارة: ${signal}. ` +
          `القيمة العادلة ${fair} مقابل سعر السوق ${market}. ` +
          `اكتب سطرين فقط بالعربية يشرحان السبب بشكل احترافي مختصر.`,
      });
      reasoning = (text || "").trim().slice(0, 500);
    } catch { /* ignore */ }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("oracle_signals").insert({
      project_id: data.projectId,
      dna: { ...dna, overall },
      fair_value: fair,
      market_price: market,
      signal,
      success_probability,
      reasoning,
    });

    return { dna, overall, fair_value: fair, market_price: market, signal, success_probability, reasoning };
  });

export const getLatestOracle = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ projectId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row } = await sb
      .from("oracle_signals")
      .select("*")
      .eq("project_id", data.projectId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return row;
  });

export const listTopOracleSignals = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) =>
    z.object({
      signal: z.enum(["undervalued", "fair", "overvalued"]).optional(),
      limit: z.number().int().min(1).max(50).default(12),
    }).parse(i ?? {})
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb.from("oracle_signals")
      .select("project_id, dna, fair_value, market_price, signal, success_probability, reasoning, computed_at")
      .order("computed_at", { ascending: false })
      .limit(data.limit * 3);
    if (data.signal) q = q.eq("signal", data.signal);
    const { data: rows } = await q;
    // dedupe by project_id keeping latest
    const seen = new Set<string>();
    const out: any[] = [];
    for (const r of rows ?? []) {
      if (seen.has(r.project_id)) continue;
      seen.add(r.project_id);
      out.push(r);
      if (out.length >= data.limit) break;
    }
    return out;
  });
