import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://busniss.org";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const Route = createFileRoute("/api/public/feed.xml")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL;
        const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
        let items = "";
        if (url && pk) {
          const sb = createClient(url, pk, { auth: { persistSession: false, autoRefreshToken: false } });
          const { data } = await sb
            .from("articles")
            .select("slug,title,excerpt,meta_description,published_at,created_at,category")
            .eq("published", true)
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(50);
          items = (data ?? [])
            .map((a: any) => {
              const link = `${BASE_URL}/news/${a.slug}`;
              const pub = new Date(a.published_at ?? a.created_at).toUTCString();
              const desc = a.meta_description ?? a.excerpt ?? "";
              return `<item><title>${esc(a.title ?? "")}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${pub}</pubDate><description>${esc(desc)}</description>${a.category ? `<category>${esc(a.category)}</category>` : ""}</item>`;
            })
            .join("");
        }
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>IDEA BUSINESS — المدوّنة</title>
<link>${BASE_URL}</link>
<description>أحدث مقالات الاستثمار وريادة الأعمال من منصة IDEA BUSINESS</description>
<language>ar</language>
<atom:link href="${BASE_URL}/api/public/feed.xml" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=900" },
        });
      },
    },
  },
});
