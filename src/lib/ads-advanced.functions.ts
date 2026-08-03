import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Duplicate an existing campaign as a fresh draft. */
export const duplicateAdCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await (context.supabase as any).rpc("duplicate_ad_campaign", { p_source_id: data.id });
    if (error) throw new Error(error.message);
    return { id: res as string };
  });

/** Record a conversion event against a campaign. */
export const recordAdConversion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    campaignId: z.string().uuid(),
    kind: z.enum(["signup","purchase","share_buy","investment","project_view","contact"]),
    value: z.number().min(0).max(10_000_000).default(0),
    metadata: z.record(z.string(), z.any()).default({}),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await (context.supabase as any).rpc("record_ad_conversion", {
      p_campaign_id: data.campaignId, p_kind: data.kind, p_value: data.value, p_metadata: data.metadata,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

/** Aggregate analytics for one campaign: per-day series + per-country + per-hour heatmap. */
export const getAdAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), days: z.number().int().min(1).max(90).default(30) }).parse(d))
  .handler(async ({ data, context }) => {
    // verify ownership
    const { data: c, error: cErr } = await context.supabase.from("ad_campaigns")
      .select("id, owner_id, headline, impressions, clicks, spent, conversions_count, quality_score, total_budget, currency, status, start_at, end_at, daily_budget").eq("id", data.id).maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!c) throw new Error("not found");
    const isAdmin = (await (context.supabase as any).rpc("has_role", { _user_id: context.userId, _role: "admin" })).data === true;
    if ((c as any).owner_id !== context.userId && !isAdmin) throw new Error("forbidden");

    const since = new Date(Date.now() - data.days * 86400_000).toISOString();
    const { data: events } = await context.supabase.from("ad_events")
      .select("kind, country, age_bracket, created_at").eq("campaign_id", data.id).gte("created_at", since);
    const { data: convs } = await (context.supabase as any).from("ad_conversions")
      .select("kind, value, created_at").eq("campaign_id", data.id).gte("created_at", since);

    // Daily series
    const byDay: Record<string, { date: string; impressions: number; clicks: number; conversions: number }> = {};
    for (let i = 0; i < data.days; i++) {
      const d = new Date(Date.now() - i * 86400_000); const key = d.toISOString().slice(0, 10);
      byDay[key] = { date: key, impressions: 0, clicks: 0, conversions: 0 };
    }
    for (const e of events ?? []) {
      const k = (e as any).created_at.slice(0, 10);
      if (!byDay[k]) continue;
      if ((e as any).kind === "impression") byDay[k].impressions++;
      else byDay[k].clicks++;
    }
    for (const cv of convs ?? []) {
      const k = (cv as any).created_at.slice(0, 10);
      if (byDay[k]) byDay[k].conversions++;
    }
    const series = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));

    // By country
    const byCountry: Record<string, { country: string; impressions: number; clicks: number }> = {};
    for (const e of events ?? []) {
      const cc = (e as any).country || "—";
      byCountry[cc] = byCountry[cc] ?? { country: cc, impressions: 0, clicks: 0 };
      if ((e as any).kind === "impression") byCountry[cc].impressions++; else byCountry[cc].clicks++;
    }

    // Hour heatmap (0-23)
    const byHour: number[] = Array(24).fill(0);
    for (const e of events ?? []) if ((e as any).kind === "click") byHour[new Date((e as any).created_at).getHours()]++;

    // By age
    const byAge: Record<string, number> = {};
    for (const e of events ?? []) {
      const a = (e as any).age_bracket || "?"; byAge[a] = (byAge[a] ?? 0) + 1;
    }

    // Refresh quality score
    await (context.supabase as any).rpc("compute_ad_quality_score", { p_campaign_id: data.id });

    return {
      campaign: c,
      series,
      byCountry: Object.values(byCountry).sort((a, b) => b.impressions - a.impressions).slice(0, 12),
      byHour,
      byAge,
      totals: {
        ctr: ((c as any).impressions > 0 ? ((c as any).clicks / (c as any).impressions) * 100 : 0).toFixed(2),
        convRate: ((c as any).clicks > 0 ? ((c as any).conversions_count / (c as any).clicks) * 100 : 0).toFixed(2),
        cpc: ((c as any).clicks > 0 ? Number((c as any).spent) / (c as any).clicks : 0).toFixed(3),
      },
    };
  });

/** Get an AI-generated recommendation to improve campaign performance. */
export const getAdAIRecommendations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: c } = await context.supabase.from("ad_campaigns")
      .select("owner_id, headline, body, objective, impressions, clicks, spent, conversions_count, total_budget, daily_budget, quality_score, targeting")
      .eq("id", data.id).maybeSingle();
    if (!c || (c as any).owner_id !== context.userId) throw new Error("forbidden");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { suggestions: ["مفتاح الذكاء الاصطناعي غير مُعد."] };

    const stats = {
      impressions: (c as any).impressions, clicks: (c as any).clicks,
      ctr: (c as any).impressions > 0 ? (((c as any).clicks / (c as any).impressions) * 100).toFixed(2) + "%" : "0%",
      conversions: (c as any).conversions_count, spent: (c as any).spent,
      budget: (c as any).total_budget, quality: (c as any).quality_score,
      objective: (c as any).objective,
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "أنت خبير تسويق رقمي. أعطِ 4-6 اقتراحات قصيرة ومحددة لتحسين أداء إعلان رقمي. أجب بالعربية، كل اقتراح في سطر مستقل يبدأ بـ —" },
          { role: "user", content: `هدف الحملة: ${stats.objective}\nالإحصائيات: ${JSON.stringify(stats)}\nالعنوان الحالي: ${(c as any).headline}\nالنص: ${(c as any).body ?? "—"}` },
        ],
      }),
    });
    if (!res.ok) {
      if (res.status === 429) return { suggestions: ["تم تجاوز الحد. حاول لاحقًا."] };
      if (res.status === 402) return { suggestions: ["نفد رصيد الذكاء الاصطناعي."] };
      return { suggestions: ["تعذّر جلب الاقتراحات الآن."] };
    }
    const json: any = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "";
    const suggestions = text.split(/\n/).map(s => s.trim()).filter(s => s.length > 5).slice(0, 6);
    return { suggestions: suggestions.length ? suggestions : [text] };
  });

/** List campaigns awaiting admin review. */
export const listAdReviewQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin = (await (context.supabase as any).rpc("has_role", { _user_id: context.userId, _role: "admin" })).data === true;
    if (!isAdmin) throw new Error("forbidden");
    const { data, error } = await context.supabase.from("ad_campaigns")
      .select("id, headline, body, owner_id, status, review_state, created_at, total_budget, currency, media_url, cta_url")
      .eq("review_state", "pending").order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

/** Approve or request changes on an ad. */
export const setAdReviewState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    state: z.enum(["approved","changes_requested"]),
    note: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const isAdmin = (await (context.supabase as any).rpc("has_role", { _user_id: context.userId, _role: "admin" })).data === true;
    if (!isAdmin) throw new Error("forbidden");
    const { error } = await (context.supabase as any).rpc("admin_set_ad_review_state", {
      p_campaign_id: data.id,
      p_state: data.state,
      p_note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Blocked-keyword admin: list/add/remove */
export const listBlockedKeywords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("ad_blocked_keywords").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

export const addBlockedKeyword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ keyword: z.string().trim().min(2).max(80), reason: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const isAdmin = (await (context.supabase as any).rpc("has_role", { _user_id: context.userId, _role: "admin" })).data === true;
    if (!isAdmin) throw new Error("forbidden");
    const { error } = await (context.supabase as any).from("ad_blocked_keywords").insert({
      keyword: data.keyword.toLowerCase(), reason: data.reason ?? null, created_by: context.userId,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeBlockedKeyword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const isAdmin = (await (context.supabase as any).rpc("has_role", { _user_id: context.userId, _role: "admin" })).data === true;
    if (!isAdmin) throw new Error("forbidden");
    const { error } = await (context.supabase as any).from("ad_blocked_keywords").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Audit log per campaign */
export const getAdAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: items, error } = await (context.supabase as any).from("ad_audit_log")
      .select("id, actor_id, action, diff, created_at").eq("campaign_id", data.id)
      .order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return { items: items ?? [] };
  });

/** Support tickets */
export const createAdSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    campaignId: z.string().uuid().nullable(),
    subject: z.string().trim().min(3).max(200),
    message: z.string().trim().min(5).max(2000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any).from("ad_support_tickets").insert({
      campaign_id: data.campaignId, user_id: context.userId, subject: data.subject, message: data.message,
    } as any).select("id").single();
    if (error) throw new Error(error.message);
    return { id: (row as any).id };
  });

export const listMyAdSupportTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).from("ad_support_tickets")
      .select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });
