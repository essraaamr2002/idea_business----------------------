import { createFileRoute } from "@tanstack/react-router";
import { requireAdmin, adminJson, adminOptions } from "@/lib/admin-api.server";
import { enforceJsonRequest } from "@/lib/http-security.server";
import { z } from "zod";

const ALLOWED = new Set([
  "users",
  "projects",
  "kyc_verifications",
  "deposit_requests",
  "payout_requests",
  "share_trades",
  "admin_audit_log",
]);

const exportSchema = z.object({
  dataset: z.enum([
    "users",
    "projects",
    "kyc_verifications",
    "deposit_requests",
    "payout_requests",
    "share_trades",
    "admin_audit_log",
  ]),
  format: z.enum(["csv", "json"]).default("csv"),
});

function toCsv(rows: any[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    let s = typeof v === "object" ? JSON.stringify(v) : String(v);
    // Prevent spreadsheet formula execution when an administrator opens exports.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join(
    "\n",
  );
}

export const Route = createFileRoute("/api/admin/export")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      POST: async ({ request }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const requestError = enforceJsonRequest(request, 4096);
        if (requestError) return requestError;
        const parsed = exportSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return adminJson({ error: "Invalid export request" }, 400);
        const { dataset, format } = parsed.data;
        if (!ALLOWED.has(dataset)) return adminJson({ error: "Dataset not allowed" }, 400);
        const table = dataset === "users" ? "profiles" : dataset;
        const { data, error } = await ctx.admin.from(table).select("*").limit(10000);
        if (error) return adminJson({ error: error.message }, 500);
        await ctx.audit("export", table, null, {
          dataset,
          format,
          count: (data || []).length,
        });
        if (format === "json") {
          return adminJson({ ok: true, dataset, rows: data });
        }
        const csv = toCsv(data || []);
        return new Response(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${dataset}-${Date.now()}.csv"`,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
