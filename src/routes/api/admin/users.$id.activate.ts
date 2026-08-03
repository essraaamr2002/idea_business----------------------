import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/users/$id/activate")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      PATCH: async ({ request, params }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const { error } = await ctx.admin
          .from("profiles")
          .update({ status: "active", suspended_reason: null })
          .eq("id", params.id);
        if (error) return adminJson({ error: error.message }, 500);
        await ctx.audit("activate_user", "profiles", params.id, {});
        return adminJson({ ok: true, user_id: params.id, status: "active" });
      },
    },
  },
});
