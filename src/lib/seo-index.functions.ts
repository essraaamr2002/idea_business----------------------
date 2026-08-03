import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE_URL = "https://busniss.org";

/**
 * Submit one or more URLs for immediate indexing in:
 * - IndexNow (Bing / Yandex / Seznam) — free, instant
 * - Google Indexing API (if GOOGLE_INDEXING_TOKEN secret is set)
 * - Bing URL Submission (if BING_API_KEY secret is set)
 * - Ping Google + Bing sitemap
 *
 * Returns a per-engine log so the UI can show what worked.
 */
export const submitUrlsForIndexing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        urls: z.array(z.string().url()).min(1).max(20),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const logs: Array<{ engine: string; status: "sent" | "failed"; code: number | null; note?: string }> = [];

    // 1) IndexNow
    const indexNowKey = process.env.INDEXNOW_KEY;
    if (indexNowKey) {
      try {
        const r = await fetch("https://api.indexnow.org/IndexNow", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            host: "busniss.org",
            key: indexNowKey,
            keyLocation: `${BASE_URL}/api/public/indexnow/${indexNowKey}.txt`,
            urlList: data.urls,
          }),
        });
        logs.push({ engine: "IndexNow (Bing/Yandex)", status: r.ok ? "sent" : "failed", code: r.status });
      } catch (e: any) {
        logs.push({ engine: "IndexNow (Bing/Yandex)", status: "failed", code: null, note: e?.message });
      }
    } else {
      logs.push({ engine: "IndexNow (Bing/Yandex)", status: "failed", code: null, note: "INDEXNOW_KEY missing" });
    }

    // 2) Google Indexing API (optional)
    const googleToken = process.env.GOOGLE_INDEXING_TOKEN;
    if (googleToken) {
      for (const url of data.urls) {
        try {
          const r = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
            method: "POST",
            headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url, type: "URL_UPDATED" }),
          });
          logs.push({ engine: `Google Indexing API`, status: r.ok ? "sent" : "failed", code: r.status });
        } catch (e: any) {
          logs.push({ engine: "Google Indexing API", status: "failed", code: null, note: e?.message });
        }
      }
    }

    // 3) Bing URL Submission (optional)
    const bingKey = process.env.BING_API_KEY;
    if (bingKey) {
      try {
        const r = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch?apikey=${bingKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteUrl: BASE_URL, urlList: data.urls }),
        });
        logs.push({ engine: "Bing URL Submission", status: r.ok ? "sent" : "failed", code: r.status });
      } catch (e: any) {
        logs.push({ engine: "Bing URL Submission", status: "failed", code: null, note: e?.message });
      }
    }

    // 4) Public sitemap ping (Google + Bing)
    for (const eng of ["google", "bing"] as const) {
      const url =
        eng === "google"
          ? `https://www.google.com/ping?sitemap=${encodeURIComponent(`${BASE_URL}/sitemap.xml`)}`
          : `https://www.bing.com/ping?sitemap=${encodeURIComponent(`${BASE_URL}/sitemap.xml`)}`;
      try {
        const r = await fetch(url);
        logs.push({ engine: `Sitemap ping (${eng})`, status: r.ok ? "sent" : "failed", code: r.status });
      } catch (e: any) {
        logs.push({ engine: `Sitemap ping (${eng})`, status: "failed", code: null, note: e?.message });
      }
    }

    return { ok: true as const, logs };
  });
