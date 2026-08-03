/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateJson } from "@/lib/ai-text.server";

// ============================================================
// 1) AI PROJECT ANALYSIS — Google Gemini مباشر
// ============================================================
export const analyzeProjectAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Return cached analysis if recent (<24h)
    const { data: cached } = await supabase
      .from("project_ai_analysis" as any)
      .select("*")
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (cached && new Date((cached as any).generated_at).getTime() > Date.now() - 24 * 3600 * 1000) {
      return cached;
    }

    const { data: project, error } = await supabase
      .from("projects")
      .select("id, title, description, sector, country, target_amount, raised_amount, currency, deadline")
      .eq("id", data.projectId)
      .maybeSingle();
    if (error || !project) throw new Error("Project not found");

    const prompt = `حلّل هذا المشروع الاستثماري وأرجِع JSON فقط بدون أي نص آخر بالشكل التالي:
{
 "roi_estimate": رقم تقديري %,
 "risk_score": من 0 إلى 100,
 "market_fit_score": من 0 إلى 100,
 "ai_summary": "ملخص قصير بالعربية",
 "strengths": ["نقطة","نقطة"],
 "weaknesses": ["نقطة"],
 "opportunities": ["نقطة"],
 "threats": ["نقطة"]
}

المشروع: ${JSON.stringify(project)}`;

    const parsed: any = await generateJson({ prompt });

    const row = {
      project_id: data.projectId,
      roi_estimate: Number(parsed.roi_estimate) || null,
      risk_score: Math.min(100, Math.max(0, Number(parsed.risk_score) || 50)),
      market_fit_score: Math.min(100, Math.max(0, Number(parsed.market_fit_score) || 50)),
      ai_summary: String(parsed.ai_summary || ""),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 6) : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 6) : [],
      opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities.slice(0, 6) : [],
      threats: Array.isArray(parsed.threats) ? parsed.threats.slice(0, 6) : [],
      generated_at: new Date().toISOString(),
      model_version: "gemini-2.5-flash",
    };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("project_ai_analysis" as any).upsert(row);
    // refresh badges that depend on AI score
    await supabaseAdmin.rpc("refresh_project_quality_badges" as any, { p_project_id: data.projectId });
    return row;
  });

// ============================================================
// 2) ESCROW — create, release, refund
// ============================================================
export const createEscrow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid(),
    sellerId: z.string().uuid(),
    amount: z.number().positive(),
    currency: z.string().default("USD"),
    conditions: z.record(z.string(), z.any()).optional(),
    releaseAt: z.string().datetime().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("escrow_accounts" as any)
      .insert({
        project_id: data.projectId,
        buyer_id: userId,
        seller_id: data.sellerId,
        amount: data.amount,
        currency: data.currency,
        conditions: data.conditions || {},
        release_at: data.releaseAt,
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const releaseEscrow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ escrowId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: esc } = await supabase.from("escrow_accounts" as any).select("*").eq("id", data.escrowId).maybeSingle();
    if (!esc) throw new Error("Escrow not found");
    if ((esc as any).buyer_id !== userId) {
      const { data: isAdmin } = await supabase.rpc("has_role" as any, { _user_id: userId, _role: "admin" });
      if (!isAdmin) throw new Error("Forbidden");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("escrow_accounts" as any)
      .update({ status: "released", released_at: new Date().toISOString(), released_by: userId })
      .eq("id", data.escrowId);
    if (error) throw error;
    return { ok: true };
  });

// ============================================================
// 3) BUYER PROTECTION CLAIM
// ============================================================
export const fileBuyerProtectionClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid(),
    sellerId: z.string().uuid(),
    amount: z.number().positive(),
    currency: z.string().default("USD"),
    reason: z.string().min(20).max(2000),
    evidenceUrls: z.array(z.string().url()).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("buyer_protection_claims" as any)
      .insert({
        project_id: data.projectId,
        buyer_id: userId,
        seller_id: data.sellerId,
        amount: data.amount,
        currency: data.currency,
        reason: data.reason,
        evidence_urls: data.evidenceUrls || [],
      })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

// ============================================================
// 4) BOOST A PROJECT (paid promotion)
// ============================================================
export const boostProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    projectId: z.string().uuid(),
    days: z.number().int().min(1).max(30),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: proj } = await supabase.from("projects").select("user_id").eq("id", data.projectId).maybeSingle();
    if (!proj || (proj as any).user_id !== userId) throw new Error("Only the owner can boost");

    const costPerDay = 5; // USD
    const totalCost = data.days * costPerDay;

    // Atomic debit with SELECT FOR UPDATE — prevents concurrent double-spend
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: debitErr } = await supabaseAdmin.rpc("debit_wallet", {
      p_user_id: userId,
      p_amount: totalCost,
      p_reference: `boost:${data.projectId}:${data.days}d`,
    });
    if (debitErr) {
      if (debitErr.message?.includes("insufficient_funds")) throw new Error(`رصيد غير كافٍ. التكلفة ${totalCost}$`);
      throw new Error(debitErr.message);
    }

    const expiresAt = new Date(Date.now() + data.days * 86400_000).toISOString();
    await supabaseAdmin.from("projects").update({
      boost_score: 100,
      boost_expires_at: expiresAt,
    }).eq("id", data.projectId);

    return { ok: true, expires_at: expiresAt, cost: totalCost };
  });

// ============================================================
// 5) COMPARE PROJECTS
// ============================================================
export const compareProjects = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ projectIds: z.array(z.string().uuid()).min(2).max(4) }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined as any },
    });
    const [{ data: projects }, { data: analyses }] = await Promise.all([
      supa.from("projects")
        .select("id, title, sector, country, target_amount, raised_amount, currency, deadline, quality_badges")
        .in("id", data.projectIds),
      supa.from("project_ai_analysis" as any)
        .select("*")
        .in("project_id", data.projectIds),
    ]);
    return {
      projects: projects ?? [],
      analyses: analyses ?? [],
    };
  });
