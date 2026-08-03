import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/kyc/$id/reject")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      PATCH: async ({ request, params }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const body = await request.json().catch(() => ({}));
        const reason = (body?.reason as string) || "unspecified";
        const { error } = await ctx.admin
          .from("kyc_verifications")
          .update({
            status: "rejected",
            rejection_reason: reason,
            reviewed_by: ctx.userId,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", params.id);
        if (error) return adminJson({ error: error.message }, 500);
        await ctx.audit("reject_kyc", "kyc_verifications", params.id, {
          reason,
        });
        return adminJson({ ok: true, kyc_id: params.id });
      },
    },
  },
});
