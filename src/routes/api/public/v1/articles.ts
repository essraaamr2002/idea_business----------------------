import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300",
};

export const Route = createFileRoute("/api/public/v1/articles")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 100);
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
        const category = url.searchParams.get("category") ?? url.searchParams.get("sector") ?? "";
        const country = url.searchParams.get("country") ?? "";
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        let q = supabase
          .from("articles")
          .select(
            "id,slug,title,excerpt,meta_description,cover_image_url,focus_keyword,category,published_at,reading_time_minutes",
            { count: "exact" },
          )
          .eq("published", true)
          .order("published_at", { ascending: false, nullsFirst: false })
          .range(from, to);

        if (category) q = q.eq("category", category);
        if (country) q = q.ilike("meta_description", `%${country}%`);

        const { data, count, error } = await q;

        if (error) {
          console.error("[api/v1/articles]", error.message);
          return new Response(JSON.stringify({ error: "Service unavailable" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const total = count ?? data?.length ?? 0;
        const path = category === "news" ? "news" : "blog";

        return Response.json(
          {
            articles: (data ?? []).map((a: any) => ({
              ...a,
              url: `https://busniss.org/${path}/${a.slug}`,
              source: "IDEA BUSINESS — busniss.org",
            })),
            pagination: {
              page,
              limit,
              total,
              total_pages: Math.max(1, Math.ceil(total / limit)),
            },
            source: "IDEA BUSINESS — busniss.org",
          },
          { headers: corsHeaders },
        );
      },
    },
  },
});
