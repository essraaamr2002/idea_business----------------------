import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function publicClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const getSwarmSentiment = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ projectId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row } = await sb.from("swarm_sentiment").select("*").eq("project_id", data.projectId).maybeSingle();
    return row ?? { project_id: data.projectId, buys_24h: 0, sells_24h: 0, bids_24h: 0, watchers: 0, sentiment_score: 50, contrarian_alert: false };
  });

export const refreshSwarmSentiment = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ projectId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [buys, sells, bids, watchers] = await Promise.all([
      supabaseAdmin.from("share_orders_v2").select("id", { count: "exact", head: true })
        .eq("project_id", data.projectId).eq("side", "buy").gte("created_at", since),
      supabaseAdmin.from("share_orders_v2").select("id", { count: "exact", head: true })
        .eq("project_id", data.projectId).eq("side", "sell").gte("created_at", since),
      supabaseAdmin.from("share_lot_bids").select("id", { count: "exact", head: true })
        .eq("project_id", data.projectId).gte("created_at", since),
      supabaseAdmin.from("watchlist").select("id", { count: "exact", head: true }).eq("project_id", data.projectId),
    ]);
    const b = buys.count ?? 0, s = sells.count ?? 0, bd = bids.count ?? 0, w = watchers.count ?? 0;
    const total = b + s || 1;
    const score = Math.round((b / total) * 100);
    const contrarian = (score > 85 && s === 0) || (score < 15 && b === 0);
    const row = {
      project_id: data.projectId,
      buys_24h: b, sells_24h: s, bids_24h: bd, watchers: w,
      sentiment_score: score, contrarian_alert: contrarian,
      updated_at: new Date().toISOString(),
    };
    await supabaseAdmin.from("swarm_sentiment").upsert(row);
    return row;
  });
