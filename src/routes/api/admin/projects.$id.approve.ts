import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/projects/$id/approve")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      PATCH: async ({ request, params }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const body = await request.json().catch(() => ({}));
        const notes = (body?.notes as string) || null;
        const { error } = await ctx.admin
          .from("projects")
          .update({
            status: "active",
          })
          .eq("id", params.id);
        if (error) return adminJson({ error: error.message }, 500);
        await ctx.audit("approve_project", "projects", params.id, { notes });
        return adminJson({ ok: true, project_id: params.id });
      },
    },
  },
});
