import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/projects")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      GET: async ({ request }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const url = new URL(request.url);
        const status = url.searchParams.get("status") || "pending_review";
        const { data, error } = await ctx.admin
          .from("projects")
          .select(
            "id, title, owner_id, status, created_at, target_amount, raised_amount",
          )
          .eq("status", status)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return adminJson({ error: error.message }, 500);
        await ctx.audit("list_projects", "projects", null, { status });
        return adminJson({ projects: data || [] });
      },
    },
  },
});
