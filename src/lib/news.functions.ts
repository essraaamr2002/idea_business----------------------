import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `article-${Date.now()}`;
}

function publicClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

// ---------- Public reads ----------
export const listArticles = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({
      limit: z.number().int().min(1).max(100).default(30),
      categories: z.array(z.string()).optional(),
    }).parse(input ?? {})
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb
      .from("articles")
      .select("id, slug, title, excerpt, cover_image_url, category, event_type, ai_generated, created_at, views_count")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.categories && data.categories.length) q = q.in("category", data.categories);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getArticle = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("articles")
      .select("id, slug, title, excerpt, content, cover_image_url, category, event_type, ai_generated, created_at, views_count")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not_found");
    return row;
  });

// ---------- Subscribers ----------
const EmailSchema = z.object({ email: z.string().email().max(255) });
const TokenSchema = z.object({ token: z.string().min(20).max(128) });

export const subscribeNews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EmailSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    // Enforce: caller can only subscribe their own (JWT) email — prevents
    // authenticated users from harvesting/subscribing arbitrary addresses.
    const claimEmail = ((context.claims as any)?.email ?? "").toString().trim().toLowerCase();
    if (!claimEmail || claimEmail !== email) {
      throw new Error("forbidden");
    }

    // Rate limit: max 3 subscribe attempts per user per hour, keyed by user id
    // (not email) so the throttle cannot be bypassed by spoofing input.
    const since = new Date(Date.now() - 3600 * 1000).toISOString();
    const rateKey = `user:${context.userId}`;
    const { count } = await supabaseAdmin
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("action", "news.subscribe")
      .eq("ip", rateKey)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      throw new Error("rate_limited");
    }
    await supabaseAdmin
      .from("rate_limit_events")
      .insert({ action: "news.subscribe", ip: rateKey } as any);

    const { error } = await supabaseAdmin
      .from("news_subscribers")
      .upsert({ email } as any, { onConflict: "email", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public newsletter subscribe — no auth needed (open opt-in form on /news).
// Rate-limited by IP (5 req/hour) to discourage abuse.
export const subscribeNewsPublic = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EmailSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    let ip = "unknown";
    try {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      ip =
        getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
        getRequestHeader("x-real-ip") ||
        "unknown";
    } catch {}

    const since = new Date(Date.now() - 3600 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("action", "news.subscribe.public")
      .eq("ip", ip)
      .gte("created_at", since);
    if ((count ?? 0) >= 5) throw new Error("rate_limited");

    await supabaseAdmin
      .from("rate_limit_events")
      .insert({ action: "news.subscribe.public", ip } as any);

    // Look up existing subscriber
    const { data: existing } = await supabaseAdmin
      .from("news_subscribers")
      .select("id, confirmed_at, confirm_token, unsubscribed")
      .eq("email", email)
      .maybeSingle<any>();

    // Already confirmed & active — no need to resend
    if (existing?.confirmed_at && !existing?.unsubscribed) {
      return { ok: true, already: true };
    }

    // Issue/refresh confirm token
    const token =
      (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) +
      "-" + Math.random().toString(36).slice(2);

    if (existing) {
      await supabaseAdmin
        .from("news_subscribers")
        .update({ confirm_token: token, unsubscribed: false } as any)
        .eq("id", existing.id);
    } else {
      const { error } = await supabaseAdmin
        .from("news_subscribers")
        .insert({ email, confirm_token: token } as any);
      if (error) throw new Error(error.message);
    }

    const siteUrl = process.env.SITE_URL || "https://busniss.org";
    const confirmUrl = `${siteUrl}/newsletter/confirm?token=${encodeURIComponent(token)}`;

    try {
      const { enqueueTemplateEmail } = await import("@/lib/newsletter-email.server");
      await enqueueTemplateEmail({
        templateName: "newsletter-confirm",
        recipientEmail: email,
        templateData: { confirmUrl, siteUrl },
        idempotencyKey: `newsletter-confirm-${token}`,
      });
    } catch (e) {
      console.error("[newsletter] confirm email enqueue failed", e);
    }

    return { ok: true, pending: true };
  });

// Public double opt-in confirmation. Marks confirmed_at and clears the token.
const ConfirmSchema = z.object({ token: z.string().min(8).max(200) });
export const confirmNewsletter = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ConfirmSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sub } = await supabaseAdmin
      .from("news_subscribers")
      .select("id, confirmed_at")
      .eq("confirm_token", data.token)
      .maybeSingle<any>();
    if (!sub) return { ok: false, reason: "invalid_token" as const };
    if (sub.confirmed_at) return { ok: true, already: true };
    const { error } = await supabaseAdmin
      .from("news_subscribers")
      .update({ confirmed_at: new Date().toISOString(), confirm_token: null, unsubscribed: false } as any)
      .eq("id", sub.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });




// Token-based unsubscribe: requires a one-time token issued to that specific
// email address (stored in email_unsubscribe_tokens). Prevents anyone from
// silencing an arbitrary subscriber by knowing their email.
export const unsubscribeNews = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tok, error: tokErr } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("email, used_at")
      .eq("token", data.token)
      .maybeSingle();
    if (tokErr) throw new Error(tokErr.message);
    if (!tok) throw new Error("invalid_token");
    if (tok.used_at) return { ok: true, already: true };

    const { error: upErr } = await supabaseAdmin
      .from("news_subscribers")
      .update({ unsubscribed: true } as any)
      .eq("email", tok.email);
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .update({ used_at: new Date().toISOString() } as any)
      .eq("token", data.token);
    return { ok: true };
  });

// Issues a one-time unsubscribe token for a given email. Always returns ok
// to avoid leaking whether the address is subscribed. Used by the email
// pipeline to embed personalized {{unsubscribe_url}} links.
async function issueUnsubscribeToken(email: string): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) +
      "-" + Math.random().toString(36).slice(2);
    const { error } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .upsert({ email, token, used_at: null } as any, { onConflict: "email" });
    if (error) return null;
    return token;
  } catch { return null; }
}


// ---------- Admin authoring ----------
const ArticleInput = z.object({
  title: z.string().trim().min(3).max(200),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().trim().min(10).max(50000),
  cover_image_url: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  category: z.string().trim().max(40).default("news"),
  published: z.boolean().default(true),
});

export const createArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ArticleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" as any });
    const { data: isSeo } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "seo" as any });
    if (!isAdmin && !isSeo) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const slug = slugify(data.title) + "-" + Math.random().toString(36).slice(2, 6);
    const { data: row, error } = await supabaseAdmin
      .from("articles")
      .insert({
        slug,
        title: data.title,
        excerpt: data.excerpt ?? null,
        content: data.content,
        cover_image_url: data.cover_image_url ?? null,
        category: data.category,
        author_id: context.userId,
        published: data.published,
        ai_generated: false,
      } as any)
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);

    if (data.published) {
      await broadcastNewArticle(row.slug, data.title, data.excerpt ?? "");
      try {
        const { pingSearchEngines } = await import("./seo-ping.server");
        await pingSearchEngines([
          `https://busniss.org/news/${row.slug}`,
          `https://busniss.org/sitemap.xml`,
        ]);
      } catch { /* non-fatal */ }
    }
    return row;
  });

export const updateArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      patch: ArticleInput.partial(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" as any });
    const { data: isSeo } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "seo" as any });
    if (!isAdmin && !isSeo) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: previous } = await supabaseAdmin
      .from("articles")
      .select("published, slug, title, excerpt")
      .eq("id", data.id)
      .maybeSingle();
    const { data: row, error } = await supabaseAdmin
      .from("articles")
      .update({ ...(data.patch as any), updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("slug, title, excerpt, published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (row?.published && !previous?.published && row.slug) {
      await broadcastNewArticle(row.slug, row.title, row.excerpt ?? "");
    }
    if (row?.published && row.slug) {
      try {
        const { pingSearchEngines } = await import("./seo-ping.server");
        await pingSearchEngines([
          `https://busniss.org/news/${row.slug}`,
          `https://busniss.org/sitemap.xml`,
        ]);
      } catch { /* non-fatal */ }
    }
    return { ok: true };
  });

export const listAllArticlesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" as any });
    const { data: isSeo } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "seo" as any });
    if (!isAdmin && !isSeo) throw new Error("forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("articles")
      .select("id, slug, title, category, published, ai_generated, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- AI auto-generation on platform events ----------
export const generateEventArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      event_type: z.enum(["new_project", "marketplace_listing", "deal_completed"]),
      project_id: z.string().uuid().optional(),
      title_hint: z.string().max(200).optional(),
      payload: z.record(z.string(), z.any()).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" as any });
    const { data: isSeo } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "seo" as any });
    if (!isAdmin && !isSeo) throw new Error("forbidden");
    const gKey = process.env.GEMINI_API_KEY;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!gKey && !apiKey) return { ok: false, reason: "no_api_key" };
    const { generateText } = await import("ai");

    const systemPrompt = `أنت كاتب صحفي محترف لمنصة استثمار عربية اسمها "IDEA BUSINESS".
اكتب مقالاً إخبارياً قصيراً وموضوعياً (150-250 كلمة) بلغة عربية فصحى عن الحدث التالي.
أعد إجابة JSON صارمة بدون أي شرح إضافي:
{"title":"عنوان جذاب قصير","excerpt":"ملخص في جملة واحدة","content":"المقال كاملاً بصيغة Markdown مع فقرات واضحة"}`;

    const eventDescription: Record<string, string> = {
      new_project: "تم طرح مشروع استثماري جديد على المنصة",
      marketplace_listing: "تم إدراج مشروع في السوق الموازي لجذب المستثمرين",
      deal_completed: "تمت صفقة استثمارية ناجحة على المنصة",
    };

    let parsed = { title: data.title_hint || "خبر جديد", excerpt: "", content: "" };
    try {
      let modelInstance: any;
      if (gKey) {
        const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
        modelInstance = createGoogleGenerativeAI({ apiKey: gKey })("gemini-2.0-flash-exp");
      } else {
        const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
        modelInstance = createLovableAiGatewayProvider(apiKey!)("google/gemini-3-flash-preview");
      }
      const { text } = await generateText({
        model: modelInstance,
        system: systemPrompt,
        prompt: `الحدث: ${eventDescription[data.event_type]}.
عنوان مقترح: ${data.title_hint ?? "بدون"}.
تفاصيل إضافية (JSON): ${JSON.stringify(data.payload ?? {})}`,
      });
      const m = text.match(/\{[\s\S]*\}/);
      if (m) parsed = { ...parsed, ...JSON.parse(m[0]) };
    } catch (e) {
      console.error("[generateEventArticle] AI error", e);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const slug = slugify(parsed.title) + "-" + Math.random().toString(36).slice(2, 6);
    const { data: row, error } = await supabaseAdmin
      .from("articles")
      .insert({
        slug,
        title: parsed.title,
        excerpt: parsed.excerpt || null,
        content: parsed.content || `حدث جديد على المنصة: ${eventDescription[data.event_type]}`,
        cover_image_url: null,
        category: "events",
        event_type: data.event_type,
        event_ref_id: data.project_id ?? null,
        published: true,
        ai_generated: true,
      } as any)
      .select("id, slug, title, excerpt")
      .single();
    if (error) {
      console.error("[generateEventArticle] insert", error);
      return { ok: false, reason: error.message };
    }

    await broadcastNewArticle(row.slug, row.title, row.excerpt ?? "");
    return { ok: true, id: row.id, slug: row.slug };
  });

// ---------- Subscriber broadcast ----------
async function broadcastNewArticle(slug: string, title: string, excerpt: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs } = await supabaseAdmin
      .from("news_subscribers")
      .select("email")
      .eq("unsubscribed", false)
      .not("confirmed_at", "is", null);
    if (!subs?.length) return { sent: 0 };

    const siteUrl = process.env.SITE_URL || "https://busniss.org";
    const url = `${siteUrl}/news/${slug}`;
    const SENDER_DOMAIN = "notify.busniss.org";
    const FROM = `IDEA BUSINESS <noreply@busniss.org>`;
    let sent = 0;

    for (const s of subs) {
      const email = (s.email || "").toLowerCase();
      if (!email) continue;

      const { data: sup } = await supabaseAdmin
        .from("suppressed_emails").select("id").eq("email", email).maybeSingle();
      if (sup) continue;

      const tok = await issueUnsubscribeToken(email);
      const unsubUrl = tok ? `${siteUrl}/unsubscribe?token=${encodeURIComponent(tok)}` : `${siteUrl}/unsubscribe`;
      const safeTitle = escapeHtml(title);
      const safeExcerpt = excerpt ? escapeHtml(excerpt) : "";
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
            unsubscribe_token: tok ?? undefined,
            queued_at: new Date().toISOString(),
          },
        });
        if (enqErr) {
          console.error("[broadcastNewArticle] enqueue", enqErr);
          await supabaseAdmin.from("email_send_log").insert({
            message_id: messageId, template_name: "news-article",
            recipient_email: email, status: "failed", error_message: enqErr.message,
          } as any);
        } else { sent++; }
      } catch (e: any) {
        console.error("[broadcastNewArticle] loop", e?.message ?? e);
      }
    }
    return { sent };
  } catch (e) {
    console.error("[broadcastNewArticle]", e);
    return { sent: 0 };
  }
}

// Admin-only: send a test newsletter to a single email (no article saved).
export const sendTestNewsletter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().email().max(255) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" as any });
    const { data: isSeo } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "seo" as any });
    if (!isAdmin && !isSeo) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    await supabaseAdmin.from("news_subscribers")
      .upsert({ email } as any, { onConflict: "email", ignoreDuplicates: true });

    const { data: latest } = await supabaseAdmin
      .from("articles").select("slug, title, excerpt")
      .eq("published", true).order("created_at", { ascending: false })
      .limit(1).maybeSingle();

    const slug = latest?.slug ?? "test";
    const title = `[اختبار] ${latest?.title ?? "النشرة البريدية — IDEA BUSINESS"}`;
    const excerpt = latest?.excerpt ?? "هذه رسالة اختبارية للتأكد من عمل نظام إرسال المقالات للمشتركين.";

    const siteUrl = process.env.SITE_URL || "https://busniss.org";
    const url = `${siteUrl}/news/${slug}`;
    const SENDER_DOMAIN = "notify.busniss.org";
    const FROM = `IDEA BUSINESS <noreply@busniss.org>`;
    const tok = await issueUnsubscribeToken(email);
    const unsubUrl = tok ? `${siteUrl}/unsubscribe?token=${encodeURIComponent(tok)}` : `${siteUrl}/unsubscribe`;
    const safeTitle = escapeHtml(title);
    const safeExcerpt = escapeHtml(excerpt);
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/></head>
<body style="margin:0;background:#fff;font-family:Arial,Tahoma,sans-serif">
  <div style="direction:rtl;text-align:right;max-width:600px;margin:0 auto;padding:24px;color:#111">
    <div style="font-size:13px;color:#0ea5e9;font-weight:700">📰 اختبار النشرة</div>
    <h2 style="color:#0f172a">${safeTitle}</h2>
    <p style="color:#334155">${safeExcerpt}</p>
    <p><a href="${url}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">فتح الرابط</a></p>
    <hr/><p style="color:#94a3b8;font-size:12px"><a href="${unsubUrl}">إلغاء الاشتراك</a></p>
  </div></body></html>`;
    const messageId = globalThis.crypto?.randomUUID?.() ?? `nws-test-${Date.now()}`;

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId, template_name: "news-article",
      recipient_email: email, status: "pending",
    } as any);

    const { error: enqErr } = await supabaseAdmin.rpc("enqueue_email" as any, {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId, to: email, from: FROM, sender_domain: SENDER_DOMAIN,
        subject: title, html, text: `${title}\n${excerpt}\n${url}`,
        purpose: "transactional", label: "news-article",
        idempotency_key: `news-test-${messageId}`,
        unsubscribe_token: tok ?? undefined,
        queued_at: new Date().toISOString(),
      },
    });
    if (enqErr) return { ok: false, reason: enqErr.message };
    return { ok: true, message_id: messageId, recipient: email };
  });

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
