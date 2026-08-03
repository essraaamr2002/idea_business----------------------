import { createFileRoute } from "@tanstack/react-router";
import {
  requireAdmin,
  adminJson,
  adminOptions,
} from "@/lib/admin-api.server";

export const Route = createFileRoute("/api/admin/finance/report")({
  server: {
    handlers: {
      OPTIONS: () => adminOptions(),
      GET: async ({ request }) => {
        const ctx = await requireAdmin(request);
        if (ctx instanceof Response) return ctx;
        const url = new URL(request.url);
        const period = url.searchParams.get("period") || "month";
        const currency = url.searchParams.get("currency") || "SAR";
        const since = new Date();
        if (period === "today") since.setHours(0, 0, 0, 0);
        else if (period === "week") since.setDate(since.getDate() - 7);
        else since.setDate(since.getDate() - 30);
        const sinceIso = since.toISOString();

        const [deposits, payouts, commissions] = await Promise.all([
          ctx.admin
            .from("deposit_requests")
            .select("amount, status")
            .gte("created_at", sinceIso),
          ctx.admin
            .from("payout_requests")
            .select("amount, status")
            .gte("created_at", sinceIso),
          ctx.admin
            .from("commission_ledger")
            .select("amount")
            .gte("created_at", sinceIso),
        ]);

        const sum = (r: any) =>
          (r?.data || []).reduce(
            (s: number, x: any) => s + Number(x.amount || 0),
            0,
          );

        await ctx.audit("finance_report", "platform", null, {
          period,
          currency,
        });
        return adminJson({
          period,
          currency,
          deposits_total: sum(deposits),
          payouts_total: sum(payouts),
          commissions_total: sum(commissions),
          net: sum(deposits) - sum(payouts) + sum(commissions),
        });
      },
    },
  },
});
