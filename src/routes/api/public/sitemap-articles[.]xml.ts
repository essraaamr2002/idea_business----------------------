import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://busniss.org";

export const Route = createFileRoute("/api/public/sitemap-articles.xml")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL;
        const pk = process.env.SUPABASE_PUBLISHABLE_KEY;
        let urls = "";
        if (url && pk) {
          const sb = createClient(url, pk, { auth: { persistSession: false, autoRefreshToken: false } });
          const { data } = await sb
            .from("articles")
            .select("slug,published_at,updated_at")
            .eq("published", true)
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(5000);
          urls = (data ?? [])
            .map((a: any) => {
              const lastmod = new Date(a.updated_at ?? a.published_at ?? Date.now()).toISOString();
              return `<url><loc>${BASE_URL}/news/${a.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
            })
            .join("");
        }
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900" },
        });
      },
    },
  },
});
