import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/kyc/$id/approve")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      PATCH: async ({ request, params }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const body = await request.json().catch(() => ({}));
        const level = Number(body?.level || 1);
        const { error } = await ctx.admin
          .from("kyc_verifications")
          .update({
            status: "approved",
            level,
            reviewed_by: ctx.userId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", params.id);
        if (error) return adminJson({ error: error.message }, 500);
        await ctx.audit("approve_kyc", "kyc_verifications", params.id, {
          level,
        });
        return adminJson({ ok: true, kyc_id: params.id, level });
      },
    },
  },
});
