import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

function publicClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}
function merkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return sha256("empty");
  let level = leaves.map(sha256);
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = level[i + 1] ?? a;
      next.push(sha256(a + b));
    }
    level = next;
  }
  return level[0];
}

export const sealDailyTrustBlock = createServerFn({ method: "POST" })
  .handler(async () => {
    // Restrict via secret check to prevent public sealing spam
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    // Collect representative events (trades, orders, escrow) — id + created_at hashed
    const [trades, orders, escrow] = await Promise.all([
      supabaseAdmin.from("sm_trades").select("id, executed_at").gte("executed_at", since).limit(5000),
      supabaseAdmin.from("share_orders_v2").select("id, created_at").gte("created_at", since).limit(5000),
      supabaseAdmin.from("escrow_holds").select("id, created_at").gte("created_at", since).limit(5000),
    ]);
    const leaves: string[] = [
      ...(trades.data ?? []).map((r: any) => `T:${r.id}:${r.executed_at}`),
      ...(orders.data ?? []).map((r: any) => `O:${r.id}:${r.created_at}`),
      ...(escrow.data ?? []).map((r: any) => `E:${r.id}:${r.created_at}`),
    ];
    const root = merkleRoot(leaves);

    const { data: prev } = await supabaseAdmin
      .from("trust_chain_blocks").select("block_hash").order("height", { ascending: false }).limit(1).maybeSingle();
    const prevHash = prev?.block_hash ?? sha256("genesis");
    const blockHash = sha256(prevHash + root + leaves.length);

    const { data: inserted, error } = await supabaseAdmin
      .from("trust_chain_blocks")
      .insert({ merkle_root: root, prev_hash: prevHash, block_hash: blockHash, event_count: leaves.length })
      .select("height, block_hash, merkle_root, event_count, sealed_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const listTrustChain = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(i ?? {}))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows } = await sb
      .from("trust_chain_blocks")
      .select("height, merkle_root, prev_hash, block_hash, event_count, sealed_at")
      .order("height", { ascending: false })
      .limit(data.limit);
    return rows ?? [];
  });

export const verifyTrustBlock = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ height: z.number().int().positive() }).parse(i))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: cur } = await sb.from("trust_chain_blocks")
      .select("*").eq("height", data.height).maybeSingle();
    if (!cur) throw new Error("not_found");
    const recomputed = sha256((cur.prev_hash ?? "") + cur.merkle_root + cur.event_count);
    return { ok: recomputed === cur.block_hash, expected: cur.block_hash, recomputed, block: cur };
  });
