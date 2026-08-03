import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function publicClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

type CountResult = {
  count: number | null;
  error: Error | null;
};

type FundedProject = {
  shares_sold: number | string | null;
  share_price: number | string | null;
};

/**
 * Public, anonymous platform stats for the home page (#45).
 * Uses aggregate counts only — never returns user data.
 */
export const getPlatformStats = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const withTimeout = async <T>(promise: PromiseLike<T>, ms = 3500): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((resolve) => {
          timer = setTimeout(() => resolve({ error: new Error("timeout") } as T), ms);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  const safe = async (q: PromiseLike<CountResult>) => {
    try {
      const r = await withTimeout(q);
      return r.error ? 0 : (r.count ?? 0);
    } catch {
      return 0;
    }
  };
  const [projects, investors, trades] = await Promise.all([
    safe(sb.from("projects").select("id", { count: "exact", head: true }).eq("status", "active")),
    safe(sb.from("profiles").select("id", { count: "exact", head: true })),
    safe(
      sb
        .from("share_orders_v2")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "partial"]),
    ),
  ]);
  // Aggregate funded amount: sum of shares_sold * share_price across active projects
  const { data: funded } = await withTimeout(
    sb.from("projects").select("shares_sold, share_price").eq("status", "active").limit(500),
  ).catch(() => ({ data: [] }));
  const funded_usd = Math.round(
    ((funded ?? []) as FundedProject[]).reduce(
      (acc, p) => acc + Number(p.shares_sold ?? 0) * Number(p.share_price ?? 0),
      0,
    ),
  );
  return { investors, projects, funded_usd, trades };
});
