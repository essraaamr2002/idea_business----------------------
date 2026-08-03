import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/compliance/aml-alerts")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      GET: async ({ request }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const { data, error } = await ctx.admin
          .from("aml_flags")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return adminJson({ error: error.message }, 500);
        await ctx.audit("read_aml", "aml_flags", null, {});
        return adminJson({ alerts: data || [] });
      },
    },
  },
});
