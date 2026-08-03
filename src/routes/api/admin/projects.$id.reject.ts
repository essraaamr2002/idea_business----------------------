import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/projects/$id/reject")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      PATCH: async ({ request, params }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const body = await request.json().catch(() => ({}));
        const reason = (body?.reason as string) || "unspecified";
        const { error } = await ctx.admin
          .from("projects")
          .update({ status: "closed" })
          .eq("id", params.id);
        if (error) return adminJson({ error: error.message }, 500);
        await ctx.audit("reject_project", "projects", params.id, { reason });
        return adminJson({ ok: true, project_id: params.id });
      },
    },
  },
});
