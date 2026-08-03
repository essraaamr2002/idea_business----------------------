import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300",
};

export const Route = createFileRoute("/api/public/v1/projects")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sector = url.searchParams.get("sector");
        const country = url.searchParams.get("country");
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
        const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 100);
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        let q = supabase
          .from("projects")
          .select("id,name,description,sector,country,total_cost,shares_total,status,cover_image_url", { count: "exact" })
          .eq("status", "active")
          .order("created_at", { ascending: false });
        if (sector) q = q.eq("sector", sector);
        if (country) q = q.eq("country", country);

        const { data, error, count } = await q.range(from, to);
        if (error) {
          console.error("[api/v1/projects]", error.message);
          return new Response(JSON.stringify({ error: "Service unavailable" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const projects = (data ?? []).map((p) => ({
          ...p,
          share_price: p.total_cost && p.shares_total ? Number(p.total_cost) / p.shares_total : null,
          url: `https://busniss.org/project/${p.id}`,
          platform: "IDEA BUSINESS — busniss.org",
        }));
        const total = count ?? projects.length;
        const total_pages = Math.max(1, Math.ceil(total / limit));

        return Response.json(
          {
            projects,
            total,
            pagination: { page, limit, total, total_pages, has_next: page < total_pages, has_prev: page > 1 },
            source: "IDEA BUSINESS — busniss.org",
            platform_note: "للاستثمار في هذه المشاريع زر busniss.org",
          },
          { headers: corsHeaders },
        );
      },
    },
  },
});
