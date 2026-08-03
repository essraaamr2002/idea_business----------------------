import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateJson } from "@/lib/ai-text.server";

// ─────────── AI Trust Score ───────────
export const computeProjectAiScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: p, error } = await supabase
      .from("projects")
      .select("id, owner_id, name, description, sector, total_cost, target_investment, currency, share_price, shares_total, funding_mode")
      .eq("id", data.project_id)
      .maybeSingle();
    if (error) throw error;
    if (!p) throw new Error("not_found");
    if (p.owner_id !== userId) {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" } as any);
      if (!isAdmin) throw new Error("forbidden");
    }

    const prompt = `قيّم موثوقية ومتانة هذا المشروع لمستثمر محتمل. أعطه درجة من 0 إلى 100.
عوامل التقييم: وضوح الفكرة، اكتمال البيانات، واقعية الأرقام، نوع الضمان، التناسق بين التكلفة والمبلغ المطلوب.

المشروع:
- الاسم: ${p.name}
- القطاع: ${p.sector || "—"}
- الوصف: ${p.description || "—"}
- التكلفة: ${p.total_cost ?? "—"} ${p.currency || ""}
- المبلغ المطلوب: ${p.target_investment ?? "—"} ${p.currency || ""}
- سعر السهم: ${p.share_price ?? "—"}
- إجمالي الأسهم: ${p.shares_total ?? "—"}
- نمط التمويل: ${p.funding_mode || "—"}

أعد JSON فقط بهذا الشكل: {"score": رقم 0-100, "summary": "جملة قصيرة جدًا توضح أبرز نقطة قوة وضعف بالعربية، أقل من 140 حرف"}`;

    const parsed: any = await generateJson({ prompt });
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 50)));
    const summary = String(parsed.summary || "تقييم تلقائي").slice(0, 240);

    await supabase.rpc("update_project_ai_score" as any, { p_project_id: data.project_id, p_score: score, p_summary: summary });
    return { score, summary };
  });

// ─────────── Owner Insights ───────────
export const getOwnerInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("get_project_owner_insights" as any, { p_project_id: data.project_id });
    if (error) throw error;
    return result as any;
  });

// ─────────── Sector Follow ───────────
export const toggleSectorFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sector: z.string().trim().min(1).max(80), follow: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.follow) {
      const { error } = await (supabase.from("sector_follows" as any) as any)
        .upsert({ user_id: userId, sector: data.sector }, { onConflict: "user_id,sector" });
      if (error) throw error;
    } else {
      const { error } = await (supabase.from("sector_follows" as any) as any)
        .delete().eq("user_id", userId).eq("sector", data.sector);
      if (error) throw error;
    }
    return { ok: true };
  });

export const listMySectorFollows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await (supabase.from("sector_follows" as any) as any)
      .select("sector").eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map((r: any) => r.sector as string);
  });

// ─────────── Partnership / Co-founder request ───────────
export const createPartnershipRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    project_id: z.string().uuid(),
    message: z.string().trim().min(10).max(2000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: p } = await supabase
      .from("projects")
      .select("id, owner_id, currency, share_price, shares_total, shares_sold, name")
      .eq("id", data.project_id)
      .maybeSingle();
    if (!p) throw new Error("not_found");
    if (p.owner_id === userId) throw new Error("cannot_offer_own_project");

    const symbolicShares = 1;
    const symbolicAmount = Number(p.share_price ?? 0) || 1;

    const { data: inserted, error } = await (supabase.from("investment_offers") as any)
      .insert({
        project_id: p.id,
        investor_id: userId,
        owner_id: p.owner_id,
        amount: symbolicAmount,
        currency: p.currency || "SAR",
        shares: symbolicShares,
        price_per_share: symbolicAmount,
        message: data.message,
        status: "pending",
        is_partnership_request: true,
      })
      .select("id")
      .single();
    if (error) throw error;

    await supabase.from("notifications").insert({
      user_id: p.owner_id,
      type: "partnership_request",
      title: "طلب شراكة تنفيذية جديد",
      body: `طلب شراكة على ${p.name}`,
      data: { project_id: p.id, offer_id: inserted.id } as any,
    } as any);

    return { id: inserted.id };
  });
