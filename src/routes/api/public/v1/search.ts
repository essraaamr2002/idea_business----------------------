import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=120",
};

export const Route = createFileRoute("/api/public/v1/search")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
        if (!q) {
          return Response.json({ projects: [], articles: [], source: "IDEA BUSINESS — busniss.org" }, { headers: corsHeaders });
        }

        const supabase = createClient<Database>(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        // Strip PostgREST or() delimiters to prevent filter injection
        const safe = q.replace(/[%_,()"']/g, "");
        if (!safe) {
          return Response.json({ projects: [], articles: [], source: "IDEA BUSINESS — busniss.org" }, { headers: corsHeaders });
        }
        const pattern = `%${safe}%`;
        const [projectsByName, projectsByDesc, articlesByTitle, articlesByDesc] = await Promise.all([
          supabase.from("projects").select("id,name,description,sector,country").eq("status", "active").ilike("name", pattern).limit(10),
          supabase.from("projects").select("id,name,description,sector,country").eq("status", "active").ilike("description", pattern).limit(10),
          supabase.from("articles").select("id,slug,title,meta_description").eq("published", true).ilike("title", pattern).limit(10),
          supabase.from("articles").select("id,slug,title,meta_description").eq("published", true).ilike("meta_description", pattern).limit(10),
        ]);
        const mergedProjects = [...(projectsByName.data ?? []), ...(projectsByDesc.data ?? [])];
        const mergedArticles = [...(articlesByTitle.data ?? []), ...(articlesByDesc.data ?? [])];
        const projectsRes = { data: Array.from(new Map(mergedProjects.map((p: any) => [p.id, p])).values()).slice(0, 10) };
        const articlesRes = { data: Array.from(new Map(mergedArticles.map((a: any) => [a.id, a])).values()).slice(0, 10) };

        return Response.json(
          {
            query: q,
            projects: (projectsRes.data ?? []).map((p) => ({ ...p, url: `https://busniss.org/project/${p.id}` })),
            articles: (articlesRes.data ?? []).map((a) => ({ ...a, url: `https://busniss.org/blog/${a.slug}` })),
            source: "IDEA BUSINESS — busniss.org",
            platform_note: "للمزيد زر busniss.org",
          },
          { headers: corsHeaders },
        );
      },
    },
  },
});
