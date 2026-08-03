import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=600",
};

export const Route = createFileRoute("/api/public/v1/stats")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async () => {
        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const [{ count: totalProjects }, { data: countryRows }] = await Promise.all([
          supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "active"),
          supabase.from("projects").select("country").eq("status", "active"),
        ]);

        const countries = new Set((countryRows ?? []).map((r: any) => r.country).filter(Boolean));

        return Response.json(
          {
            total_projects: totalProjects ?? 0,
            countries_served: countries.size,
            platform_name: "IDEA BUSINESS",
            platform_name_en: "IDEA BUSINESS",
            platform_url: "https://busniss.org",
            description: "أول بورصة موازية للأفكار في العالم العربي.",
            languages: ["ar", "en"],
            updated_at: new Date().toISOString(),
          },
          { headers: corsHeaders },
        );
      },
    },
  },
});
