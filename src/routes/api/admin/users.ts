import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      GET: async ({ request }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const url = new URL(request.url);
        const status = url.searchParams.get("status") || "all";
        const limit = Math.min(
          Number(url.searchParams.get("limit") || 20),
          200,
        );
        const search = url.searchParams.get("search") || "";

        let q = ctx.admin
          .from("profiles")
          .select(
            "id, full_name, email, phone, status, kyc_status, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(limit);

        if (status === "active") q = q.eq("status", "active");
        else if (status === "suspended") q = q.eq("status", "suspended");
        else if (status === "pending_kyc") q = q.eq("kyc_status", "pending");

        if (search) {
          q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
        }
        const { data, error } = await q;
        if (error) return adminJson({ error: error.message }, 500);
        await ctx.audit("list_users", "profiles", null, {
          status,
          limit,
          search,
        });
        return adminJson({ users: data || [], count: (data || []).length });
      },
    },
  },
});
