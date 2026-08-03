import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateJson } from "@/lib/ai-text.server";

async function requireSeoOrAdmin(context: { supabase: any; userId: string }) {
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const ok = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "seo");
  if (!ok) throw new Error("Forbidden");
}

// ---------------- AI Article Generator ----------------
const GenArticleInput = z.object({
  topic: z.string().min(3).max(300),
  keywords: z.string().max(500).optional(),
  tone: z.enum(["professional", "casual", "expert", "marketing"]).default("professional"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  language: z.enum(["ar", "en"]).default("ar"),
  model: z.string().default("google/gemini-3-flash-preview"),
});

export const generateSeoArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenArticleInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSeoOrAdmin(context);

    const lenMap = { short: "500-700 كلمة", medium: "900-1300 كلمة", long: "1600-2200 كلمة" };
    const sys = data.language === "ar"
      ? `أنت محرّر SEO عربي محترف. اكتب محتوى أصلي، منظّم بعناوين H2/H3، لا تكرار، وبنبرة ${data.tone}.`
      : `You are an expert SEO writer. Produce original, well-structured (H2/H3) content with a ${data.tone} tone.`;

    try {
      const output: any = await generateJson({
        model: data.model,
        system: sys,
        prompt: `الموضوع: ${data.topic}
الكلمات المفتاحية المستهدفة: ${data.keywords || "اقترح أنت"}
الطول المطلوب: ${lenMap[data.length]}
اكتب مقالة SEO كاملة بصيغة Markdown، مع عنوان جذاب، meta title/description مُحسّنين، مقدمة قوية، عناوين فرعية واضحة، خاتمة، و FAQ.
أعد JSON فقط: {"title":string,"slug":string,"meta_title":string,"meta_description":string,"excerpt":string,"keywords":[string],"content_markdown":string,"faq":[{"q":string,"a":string}]}`,
      });

      // Log
      await context.supabase.from("seo_ai_generations").insert({
        prompt: data.topic,
        model: data.model,
        kind: "article",
        output: output.content_markdown.slice(0, 4000),
        created_by: context.userId,
      });
      return { ok: true as const, article: output };
    } catch (err: any) {
      console.error("[seo-gen-article]", err);
      return { ok: false as const, error: err?.message || "تعذّر التوليد" };
    }
  });

// ---------------- Save / publish article ----------------
const SaveArticleInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(3),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(10),
  category: z.string().default("blog"),
  language: z.string().default("ar"),
  cover_image_url: z.string().url().optional().nullable(),
  published: z.boolean().default(false),
  ai_generated: z.boolean().default(false),
});

export const saveSeoArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveArticleInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSeoOrAdmin(context);
    const row = {
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt ?? null,
      content: data.content,
      category: data.category,
      language: data.language,
      cover_image_url: data.cover_image_url ?? null,
      published: data.published,
      ai_generated: data.ai_generated,
      author_id: context.userId,
    };
    if (data.id) {
      const { error } = await context.supabase.from("articles").update(row).eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, id: data.id };
    }
    const { data: ins, error } = await context.supabase.from("articles").insert(row).select("id").single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, id: ins.id };
  });

// ---------------- List articles ----------------
export const listSeoArticles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSeoOrAdmin(context);
    const { data } = await context.supabase
      .from("articles")
      .select("id,title,slug,category,language,published,ai_generated,views_count,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    return { items: data ?? [] };
  });

export const deleteSeoArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireSeoOrAdmin(context);
    const { error } = await context.supabase.from("articles").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ---------------- Meta overrides ----------------
const MetaInput = z.object({
  route_path: z.string().min(1).max(300),
  title: z.string().max(160).optional().nullable(),
  description: z.string().max(320).optional().nullable(),
  keywords: z.string().max(500).optional().nullable(),
  og_title: z.string().max(160).optional().nullable(),
  og_description: z.string().max(320).optional().nullable(),
  og_image: z.string().max(800).optional().nullable(),
  canonical_url: z.string().max(800).optional().nullable(),
  noindex: z.boolean().default(false),
  notes: z.string().max(1000).optional().nullable(),
});

export const upsertMetaOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MetaInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSeoOrAdmin(context);
    const { error } = await context.supabase
      .from("seo_meta_overrides")
      .upsert({ ...data, updated_by: context.userId }, { onConflict: "route_path" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const listMetaOverrides = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSeoOrAdmin(context);
    const { data } = await context.supabase
      .from("seo_meta_overrides")
      .select("*")
      .order("updated_at", { ascending: false });
    return { items: data ?? [] };
  });

// ---------------- Archive / Sitemap ping ----------------
export const triggerArchive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSeoOrAdmin(context);
    const url = "https://busniss.org/api/public/sitemap";
    const job = await context.supabase
      .from("seo_archive_jobs")
      .insert({ kind: "manual_sitemap_refresh", status: "running", url, triggered_by: context.userId })
      .select("id")
      .single();
    let status = 0, excerpt = "", itemsCount = 0;
    try {
      const r = await fetch(url, { headers: { "cache-control": "no-cache" } });
      status = r.status;
      const text = await r.text();
      excerpt = text.slice(0, 1000);
      itemsCount = (text.match(/<url>/g) || []).length;
    } catch (e: any) {
      excerpt = e?.message || "fetch error";
    }
    if (job.data?.id) {
      await context.supabase
        .from("seo_archive_jobs")
        .update({
          status: status >= 200 && status < 300 ? "success" : "failed",
          http_status: status,
          response_excerpt: excerpt,
          items_count: itemsCount,
          finished_at: new Date().toISOString(),
        })
        .eq("id", job.data.id);
    }
    return { ok: true as const, http_status: status, items_count: itemsCount };
  });

export const listArchiveJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSeoOrAdmin(context);
    const { data } = await context.supabase
      .from("seo_archive_jobs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50);
    return { items: data ?? [] };
  });

// ---------------- Keyword research ----------------
const KwInput = z.object({
  seed: z.string().min(2).max(150),
  locale: z.enum(["ar", "en"]).default("ar"),
  model: z.string().default("google/gemini-3-flash-preview"),
});

export const researchKeywords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => KwInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSeoOrAdmin(context);
    try {
      const output: any = await generateJson({
        model: data.model,
        prompt: `اقترح ${data.locale === "ar" ? "20 كلمة مفتاحية عربية" : "20 English keywords"} حول: "${data.seed}". صنّف نية البحث، صعوبتها، واقترح عنوان مقالة لكل كلمة. أضف 10-15 سؤالاً طويل الذيل.
أعد JSON فقط: {"ideas":[{"keyword":string,"intent":"informational|commercial|transactional|navigational","difficulty":"low|medium|high","suggested_title":string}],"longtail_questions":[string]}`,
      });
      await context.supabase.from("seo_keyword_research").insert({
        seed_keyword: data.seed,
        locale: data.locale,
        ideas: output as any,
        created_by: context.userId,
      });
      return { ok: true as const, result: output };
    } catch (err: any) {
      console.error("[seo-kw]", err);
      return { ok: false as const, error: err?.message || "تعذّر التوليد" };
    }
  });

// ---------------- LIVE SEO data (DB-backed) ----------------
export const seoAnalyticsSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ days: z.number().min(1).max(90).default(7) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await requireSeoOrAdmin(context);
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const { data: rows } = await context.supabase
      .from("page_views").select("path,country,device,session_hash,created_at").gte("created_at", since).limit(10000);
    const list = rows ?? [];
    const sessions = new Set(list.map((r: any) => r.session_hash)).size;
    const byDay: Record<string, number> = {};
    const byDevice: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    for (const r of list) {
      const d = (r.created_at || "").slice(0, 10);
      byDay[d] = (byDay[d] ?? 0) + 1;
      byDevice[r.device || "unknown"] = (byDevice[r.device || "unknown"] ?? 0) + 1;
      byCountry[r.country || "—"] = (byCountry[r.country || "—"] ?? 0) + 1;
    }
    return { total: list.length, sessions, byDay, byDevice, byCountry };
  });

export const seoTopPages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ days: z.number().min(1).max(90).default(30), limit: z.number().min(1).max(100).default(20) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await requireSeoOrAdmin(context);
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const { data: rows } = await context.supabase
      .from("page_views").select("path,session_hash").gte("created_at", since).limit(10000);
    const agg: Record<string, { views: number; sessions: Set<string> }> = {};
    for (const r of rows ?? []) {
      const k = r.path || "/";
      if (!agg[k]) agg[k] = { views: 0, sessions: new Set() };
      agg[k].views++;
      if (r.session_hash) agg[k].sessions.add(r.session_hash);
    }
    const items = Object.entries(agg)
      .map(([path, v]) => ({ path, views: v.views, sessions: v.sessions.size }))
      .sort((a, b) => b.views - a.views).slice(0, data.limit);
    return { items };
  });

export const seoIndexingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSeoOrAdmin(context);
    const { data: rows } = await context.supabase
      .from("indexing_log").select("*").order("sent_at", { ascending: false }).limit(200);
    const list = rows ?? [];
    const byStatus: Record<string, number> = {};
    const byEngine: Record<string, number> = {};
    for (const r of list) {
      byStatus[r.status || "unknown"] = (byStatus[r.status || "unknown"] ?? 0) + 1;
      byEngine[r.engine || "unknown"] = (byEngine[r.engine || "unknown"] ?? 0) + 1;
    }
    return { items: list, byStatus, byEngine };
  });

export const seoSubmitIndexing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ url: z.string().url(), engine: z.enum(["google","bing","manual"]).default("manual") }).parse(input))
  .handler(async ({ data, context }) => {
    await requireSeoOrAdmin(context);
    const { error } = await context.supabase.from("indexing_log").insert({
      article_url: data.url, engine: data.engine, status: "queued", sent_at: new Date().toISOString(),
    } as any);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const seoRankings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSeoOrAdmin(context);
    const { data: rows } = await context.supabase
      .from("seo_keyword_research").select("id,seed_keyword,locale,ideas,created_at").order("created_at", { ascending: false }).limit(50);
    return { items: rows ?? [] };
  });

export const seoListKeywordResearch = seoRankings;
