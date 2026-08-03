import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/stats")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      GET: async ({ request }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const url = new URL(request.url);
        const period = url.searchParams.get("period") || "today";
        const since = new Date();
        if (period === "today") since.setHours(0, 0, 0, 0);
        else if (period === "week") since.setDate(since.getDate() - 7);
        else if (period === "month") since.setDate(since.getDate() - 30);
        else since.setFullYear(2000);

        const sinceIso = since.toISOString();
        const a = ctx.admin;
        const [users, projects, kyc, trades, deposits, payouts] =
          await Promise.all([
            a.from("profiles").select("id", { count: "exact", head: true }),
            a.from("projects").select("id", { count: "exact", head: true }),
            a
              .from("kyc_verifications")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending"),
            a
              .from("share_trades")
              .select("id", { count: "exact", head: true })
              .gte("created_at", sinceIso),
            a
              .from("deposit_requests")
              .select("amount")
              .gte("created_at", sinceIso),
            a
              .from("payout_requests")
              .select("amount")
              .gte("created_at", sinceIso),
          ]);

        const sum = (rows: any) =>
          (rows?.data || []).reduce(
            (s: number, r: any) => s + Number(r.amount || 0),
            0,
          );

        await ctx.audit("read_stats", "platform", null, { period });
        return adminJson({
          period,
          users_total: users.count ?? 0,
          projects_total: projects.count ?? 0,
          kyc_pending: kyc.count ?? 0,
          trades_in_period: trades.count ?? 0,
          deposits_amount: sum(deposits),
          payouts_amount: sum(payouts),
        });
      },
    },
  },
});
