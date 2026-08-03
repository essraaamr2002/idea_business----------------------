import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/sitemap")({
  server: {
    handlers: {
      GET: async () => {
        const base = "https://busniss.org";
        const staticUrls = [
          "/", "/en", "/market", "/news", "/community", "/membership",
          "/support", "/faq", "/referrals", "/disputes", "/auth",
        ];
        const dyn: string[] = [];
        try {
          const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          const [{ data: projects }, { data: articles }] = await Promise.all([
            sb.from("projects").select("id, updated_at").eq("status", "active").limit(2000),
            sb.from("articles").select("slug, updated_at").eq("published", true).limit(2000),
          ]);
          (projects ?? []).forEach((p: any) => dyn.push(`/projects/${p.id}`));
          (articles ?? []).forEach((a: any) => dyn.push(`/news/${a.slug}`));
        } catch {
          /* fall through with static only */
        }
        const today = new Date().toISOString().split("T")[0];
        const items = [...staticUrls, ...dyn]
          .map((u) =>
            `<url><loc>${base}${u}</loc><lastmod>${today}</lastmod><changefreq>${u === "/" ? "hourly" : "daily"}</changefreq><priority>${u === "/" ? "1.0" : "0.7"}</priority></url>`,
          )
          .join("");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
