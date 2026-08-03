// Server-internal helpers for the AI journalist pipeline.
// Imported only from server-fn handlers / server routes — never from client code.
// Coordinates the six-agent team (Researcher -> Writer -> SEO/Analyst -> Commander -> Designer)
// to convert platform events into SEO-optimized news articles, then broadcasts them.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `article-${Date.now()}`
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

async function callGemini(prompt: string, system: string): Promise<string | null> {
  const gKey = process.env.GEMINI_API_KEY;
  const lKey = process.env.LOVABLE_API_KEY;
  if (!gKey && !lKey) return null;
  try {
    const { generateText } = await import("ai");
    let model: any;
    if (gKey) {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      model = createGoogleGenerativeAI({ apiKey: gKey })("gemini-2.0-flash-exp");
    } else {
      const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
      model = createLovableAiGatewayProvider(lKey!)("google/gemini-3-flash-preview");
    }
    const { text } = await generateText({ model, system, prompt });
    return text;
  } catch (e) {
    console.error("[news-auto.callGemini]", e);
    return null;
  }
}

interface AgentArticle {
  title: string;
  excerpt: string;
  content: string;
  meta_description: string;
  focus_keyword: string;
  tags: string[];
}

async function sixAgentPipeline(eventLabel: string, payload: Record<string, any>): Promise<AgentArticle> {
  const research = await callGemini(
    `الحدث: ${eventLabel}\nالبيانات: ${JSON.stringify(payload)}\nاستخرج 5 نقاط مهمة بإيجاز.`,
    "أنت الباحث في فريق IDEA BUSINESS. حلّل بإيجاز.",
  );

  const writingPrompt = `الحدث: ${eventLabel}
ملخص الباحث:
${research || "(غير متاح)"}
البيانات الخام: ${JSON.stringify(payload)}

اكتب مقالاً إخبارياً عربياً (200-300 كلمة) لمنصة "IDEA BUSINESS" — منصة استثمار في المشاريع.
أعد JSON فقط بدون أي شرح:
{
  "title": "عنوان جذاب < 70 حرف",
  "excerpt": "ملخص 140-160 حرف",
  "content": "المقال كامل Markdown مع فقرات وعناوين فرعية ##",
  "meta_description": "وصف ميتا 150-160 حرف يحوي الكلمة المفتاحية",
  "focus_keyword": "الكلمة المفتاحية الرئيسية",
  "tags": ["وسم1","وسم2","وسم3","وسم4","وسم5"]
}`;

  const raw =
    (await callGemini(
      writingPrompt,
      "أنت الكاتب الصحفي والمحلل ومحسّن SEO في فريق IDEA BUSINESS. اكتب محتوى دقيقاً موجزاً مهيأ لمحركات البحث ولـ ChatGPT و Claude. الإخراج JSON صارم فقط.",
    )) || "";

  const fallback: AgentArticle = {
    title: payload?.title_hint || eventLabel,
    excerpt: `${eventLabel} — على منصة IDEA BUSINESS.`,
    content: `## ${eventLabel}\n\nتفاصيل جديدة على منصة IDEA BUSINESS.`,
    meta_description: `${eventLabel} على منصة IDEA BUSINESS للاستثمار في المشاريع.`,
    focus_keyword: "IDEA BUSINESS",
    tags: ["IDEA BUSINESS", "استثمار", "مشاريع"],
  };

  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return fallback;
    const parsed = JSON.parse(m[0]);
    return {
      title: String(parsed.title || fallback.title).slice(0, 200),
      excerpt: String(parsed.excerpt || fallback.excerpt).slice(0, 300),
      content: String(parsed.content || fallback.content),
      meta_description: String(parsed.meta_description || parsed.excerpt || fallback.meta_description).slice(0, 200),
      focus_keyword: String(parsed.focus_keyword || fallback.focus_keyword).slice(0, 100),
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8).map((t: any) => String(t).slice(0, 40)) : fallback.tags,
    };
  } catch {
    return fallback;
  }
}

async function broadcastToSubscribers(slug: string, title: string, excerpt: string) {
  try {
    const { data: subs } = await supabaseAdmin
      .from("news_subscribers")
      .select("email")
      .eq("unsubscribed", false)
      .not("confirmed_at", "is", null);
    if (!subs?.length) return { sent: 0 };

    const siteUrl = process.env.SITE_URL || "https://busniss.org";
    const url = `${siteUrl}/news/${slug}`;
    const FROM = `IDEA BUSINESS <noreply@busniss.org>`;
    const SENDER_DOMAIN = "notify.busniss.org";
    let sent = 0;

    for (const s of subs) {
      const email = (s.email || "").toLowerCase();
      if (!email) continue;
      const { data: sup } = await supabaseAdmin
        .from("suppressed_emails").select("id").eq("email", email).maybeSingle();
      if (sup) continue;

      const token =
        (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) +
        "-" + Math.random().toString(36).slice(2);
      await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .upsert({ email, token, used_at: null } as any, { onConflict: "email" });
      const unsubUrl = `${siteUrl}/unsubscribe?token=${encodeURIComponent(token)}`;
      const safeTitle = escapeHtml(title);
      const safeExcerpt = escapeHtml(excerpt || "");

      const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>${safeTitle}</title></head>
<body style="margin:0;background:#ffffff;font-family:Arial,Tahoma,sans-serif">
  <div style="direction:rtl;text-align:right;max-width:600px;margin:0 auto;padding:24px;color:#111">
    <div style="font-size:13px;color:#0ea5e9;font-weight:700;margin-bottom:8px">📰 نشرة IDEA BUSINESS</div>
    <h2 style="color:#0f172a;margin:0 0 12px;font-size:22px">${safeTitle}</h2>
    ${safeExcerpt ? `<p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 16px">${safeExcerpt}</p>` : ""}
    <p style="margin:20px 0"><a href="${url}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700">قراءة المقال كاملاً ←</a></p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0"/>
    <p style="color:#94a3b8;font-size:12px;line-height:1.6">تلقيت هذا البريد لأنك مشترك في نشرة IDEA BUSINESS.<br/>
      <a href="${unsubUrl}" style="color:#94a3b8;text-decoration:underline">إلغاء الاشتراك</a></p>
  </div>
</body></html>`;
      const text = `${title}\n\n${excerpt || ""}\n\n${url}\n\nإلغاء الاشتراك: ${unsubUrl}`;
      const messageId = globalThis.crypto?.randomUUID?.() ?? `nws-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      try {
        await supabaseAdmin.from("email_send_log").insert({
          message_id: messageId, template_name: "news-article",
          recipient_email: email, status: "pending",
        } as any);
        const { error: enqErr } = await supabaseAdmin.rpc("enqueue_email" as any, {
          queue_name: "transactional_emails",
          payload: {
            message_id: messageId, to: email, from: FROM, sender_domain: SENDER_DOMAIN,
            subject: title, html, text, purpose: "transactional", label: "news-article",
            idempotency_key: `news-${slug}-${email}`,
            unsubscribe_token: token,
            queued_at: new Date().toISOString(),
          },
        });
        if (!enqErr) sent++;
      } catch (e: any) {
        console.error("[broadcastToSubscribers] loop", e?.message ?? e);
      }
    }
    return { sent };
  } catch (e) {
    console.error("[broadcastToSubscribers]", e);
    return { sent: 0 };
  }
}

/**
 * Fire-and-forget: pipeline a platform event through the six agents,
 * insert as SEO-rich published article, then broadcast email.
 * Safe to call without await — internal errors only log.
 */
export async function autoPublishPlatformEvent(opts: {
  event_type: "new_project" | "marketplace_listing" | "deal_completed" | "new_bid" | "community_post";
  ref_id?: string | null;
  title_hint?: string;
  payload?: Record<string, any>;
}) {
  try {
    const label: Record<string, string> = {
      new_project: "طُرح مشروع استثماري جديد على المنصة",
      marketplace_listing: "أُدرج مشروع في السوق الموازي",
      deal_completed: "تمت صفقة استثمارية ناجحة",
      new_bid: "تم تقديم مزايدة جديدة",
      community_post: "إعلان جديد على المنصة",
    };
    const article = await sixAgentPipeline(label[opts.event_type] || "حدث جديد", {
      title_hint: opts.title_hint,
      ...(opts.payload ?? {}),
    });
    const slug = slugify(article.title) + "-" + Math.random().toString(36).slice(2, 6);
    const wordCount = article.content.split(/\s+/).filter(Boolean).length;
    const reading = Math.max(1, Math.round(wordCount / 200));

    const { data: row, error } = await supabaseAdmin
      .from("articles")
      .insert({
        slug,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        category: "events",
        event_type: opts.event_type,
        event_ref_id: opts.ref_id ?? null,
        meta_description: article.meta_description,
        focus_keyword: article.focus_keyword,
        tags: article.tags,
        word_count: wordCount,
        reading_time_minutes: reading,
        published: true,
        published_at: new Date().toISOString(),
        ai_generated: true,
        generation_model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash-exp" : "lovable-gateway",
      } as any)
      .select("id, slug, title, excerpt")
      .single();

    if (error || !row) {
      console.error("[autoPublishPlatformEvent] insert", error);
      return { ok: false };
    }
    await broadcastToSubscribers(row.slug, row.title, row.excerpt ?? "");
    return { ok: true, id: row.id, slug: row.slug };
  } catch (e) {
    console.error("[autoPublishPlatformEvent]", e);
    return { ok: false };
  }
}

/** Backfill missing SEO fields for recently published articles. */
export async function enrichRecentArticlesSEO(limit = 20) {
  const { data: rows } = await supabaseAdmin
    .from("articles")
    .select("id, title, excerpt, content")
    .eq("published", true)
    .or("meta_description.is.null,focus_keyword.is.null")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!rows?.length) return { enriched: 0 };

  let enriched = 0;
  for (const r of rows) {
    const raw = await callGemini(
      `العنوان: ${r.title}\nالمقتطف: ${r.excerpt ?? ""}\nأول 500 حرف من المحتوى:\n${(r.content ?? "").slice(0, 500)}\n\nأعد JSON: {"meta_description":"150-160 حرف","focus_keyword":"...","tags":["..."]} `,
      "أنت محسّن SEO. حلل المقال وأعد JSON صارماً فقط.",
    );
    if (!raw) continue;
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) continue;
      const j = JSON.parse(m[0]);
      const wordCount = (r.content ?? "").split(/\s+/).filter(Boolean).length;
      await supabaseAdmin
        .from("articles")
        .update({
          meta_description: String(j.meta_description || r.excerpt || r.title).slice(0, 200),
          focus_keyword: String(j.focus_keyword || "").slice(0, 100) || null,
          tags: Array.isArray(j.tags) ? j.tags.slice(0, 8).map((t: any) => String(t).slice(0, 40)) : null,
          word_count: wordCount,
          reading_time_minutes: Math.max(1, Math.round(wordCount / 200)),
        } as any)
        .eq("id", r.id);
      enriched++;
    } catch {}
  }
  return { enriched };
}
