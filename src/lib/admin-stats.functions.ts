import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_admin_staff", { _user_id: userId });
  if (!data) throw new Error("forbidden");
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const since7d = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const since30d = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

    const admin: any = supabaseAdmin;
    const c = (tbl: string, filter?: (q: any) => any) => {
      let q: any = admin.from(tbl).select("*", { count: "exact", head: true });
      if (filter) q = filter(q);
      return q.then((r: any) => r.count ?? 0);
    };


    const [
      users, users24h, users7d,
      projects, projectsActive, projectsPending,
      posts, posts24h,
      kycPending,
      payoutsPending,
      disputesOpen,
      adsActive,
      messages24h,
      walletsSum,
      commissions30d,
    ] = await Promise.all([
      c("profiles"),
      c("profiles", (q) => q.gte("created_at", since24h)),
      c("profiles", (q) => q.gte("created_at", since7d)),
      c("projects"),
      c("projects", (q) => q.eq("status", "active")),
      c("projects", (q) => q.eq("status", "pending_review")),
      c("community_posts"),
      c("community_posts", (q) => q.gte("created_at", since24h)),
      c("kyc_verifications", (q) => q.eq("status", "pending")),
      c("payout_requests", (q) => q.in("status", ["pending", "pending_mfa"])),
      c("disputes", (q) => q.in("status", ["open", "investigating"])),
      c("ad_campaigns", (q) => q.eq("status", "active")),
      c("messages", (q) => q.gte("created_at", since24h)),
      admin.from("wallets").select("balance").then((r: any) =>
        (r.data ?? []).reduce((s: number, x: any) => s + Number(x.balance ?? 0), 0)
      ),
      admin
        .from("commission_ledger")
        .select("amount,created_at")
        .gte("created_at", since30d)
        .then((r: any) => (r.data ?? []).reduce((s: number, x: any) => s + Number(x.amount ?? 0), 0)),
    ]);

    // 7-day growth time series (signups & projects)
    const { data: dayBuckets } = await admin
      .from("profiles")
      .select("created_at")
      .gte("created_at", since7d);
    const { data: projBuckets } = await admin
      .from("projects")
      .select("created_at")
      .gte("created_at", since7d);


    const series: { date: string; users: number; projects: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      series.push({
        date: key,
        users: (dayBuckets ?? []).filter((r: any) => r.created_at.slice(0, 10) === key).length,
        projects: (projBuckets ?? []).filter((r: any) => r.created_at.slice(0, 10) === key).length,
      });
    }

    return {
      users: { total: users, last24h: users24h, last7d: users7d },
      projects: { total: projects, active: projectsActive, pending: projectsPending },
      community: { posts, posts24h, messages24h },
      ops: { kycPending, payoutsPending, disputesOpen, adsActive },
      finance: {
        walletsBalance: Math.round(walletsSum * 100) / 100,
        commissions30d: Math.round(commissions30d * 100) / 100,
      },
      series,
    };
  });
