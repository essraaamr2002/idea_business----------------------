import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/wallets/$id/freeze")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      PATCH: async ({ request, params }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const body = await request.json().catch(() => ({}));
        const reason = (body?.reason as string) || "security";
        const { error } = await ctx.admin
          .from("wallets")
          .update({ is_frozen: true, frozen_reason: reason })
          .eq("id", params.id);
        if (error) return adminJson({ error: error.message }, 500);
        await ctx.audit("freeze_wallet", "wallets", params.id, { reason });
        return adminJson({ ok: true, wallet_id: params.id, frozen: true });
      },
    },
  },
});
