import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/withdrawals")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      GET: async ({ request }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const url = new URL(request.url);
        const status = url.searchParams.get("status") || "pending";
        const { data, error } = await ctx.admin
          .from("payout_requests")
          .select("*")
          .eq("status", status)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return adminJson({ error: error.message }, 500);
        await ctx.audit("list_withdrawals", "payout_requests", null, {
          status,
        });
        return adminJson({ withdrawals: data || [] });
      },
    },
  },
});
