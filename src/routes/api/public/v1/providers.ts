import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300",
};

export const Route = createFileRoute("/api/public/v1/providers")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const category = url.searchParams.get("category");
        const country = url.searchParams.get("country");
        const city = url.searchParams.get("city");
        const search = url.searchParams.get("q");
        const sort = url.searchParams.get("sort") || "rating"; // rating | recent | orders
        const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
        const limit = Math.min(
          parseInt(url.searchParams.get("limit") ?? "12", 10) || 12,
          50
        );
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        try {
          const supabase = createClient<Database>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } }
          );

          let q = supabase
            .from("service_providers")
            .select(
              "id,display_name,headline,bio,category,subcategories,country,city,languages,hourly_rate,currency,avatar_url,cover_url,rating_avg,rating_count,orders_completed,response_time_hours",
              { count: "exact" }
            )
            .eq("status", "active")
            .eq("kyc_status", "approved");

          if (category) q = q.eq("category", category);
          if (country) q = q.eq("country", country);
          if (city) q = q.eq("city", city);
          if (search) q = q.or(`display_name.ilike.%${search}%,headline.ilike.%${search}%`);

          if (sort === "recent") q = q.order("created_at", { ascending: false });
          else if (sort === "orders") q = q.order("orders_completed", { ascending: false });
          else q = q.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false });

          const { data, error, count } = await q.range(from, to);

          if (error) {
            console.error("[api/v1/providers]", error.message);
            return new Response(
              JSON.stringify({ error: "Service unavailable", providers: [] }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const providers = (data ?? []).map((p) => ({
            ...p,
            url: `https://busniss.org/providers/${p.id}`,
            platform: "IDEA BUSINESS — busniss.org",
          }));

          const total = count ?? providers.length;
          const total_pages = Math.max(1, Math.ceil(total / limit));

          return Response.json(
            {
              providers,
              pagination: {
                page,
                limit,
                total,
                total_pages,
                has_next: page < total_pages,
                has_prev: page > 1,
              },
              source: "IDEA BUSINESS — busniss.org",
            },
            { headers: corsHeaders }
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          console.error("[api/v1/providers] fatal", msg);
          return new Response(
            JSON.stringify({ error: "Internal error", providers: [] }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});
