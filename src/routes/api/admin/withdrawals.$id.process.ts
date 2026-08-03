import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/withdrawals/$id/process")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      PATCH: async ({ request, params }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const body = await request.json().catch(() => ({}));
        const bankRef = (body?.bank_reference as string) || null;
        const { error } = await ctx.admin
          .from("payout_requests")
          .update({
            status: "processed",
            processed_by: ctx.userId,
            processed_at: new Date().toISOString(),
            bank_reference: bankRef,
          })
          .eq("id", params.id);
        if (error) return adminJson({ error: error.message }, 500);
        await ctx.audit("process_withdrawal", "payout_requests", params.id, {
          bank_reference: bankRef,
        });
        return adminJson({ ok: true, withdrawal_id: params.id });
      },
    },
  },
});
