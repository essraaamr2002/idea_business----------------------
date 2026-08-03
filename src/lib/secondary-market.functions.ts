import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Public open listings — read-only, anyone can browse. */
export const listOpenSecondaryListings = createServerFn({ method: "GET" })
  .handler(async () => {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await sb
      .from("secondary_market_listings")
      .select("id, project_id, seller_id, shares, ask_price, offer_type, status, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { items: data ?? [] };
  });

const CreateSchema = z.object({
  projectId: z.string().uuid(),
  shares: z.number().int().positive().max(1_000_000_000),
  askPrice: z.number().positive().max(1_000_000_000),
  offerType: z.enum(["sell", "buy"]).default("sell"),
});

export const createSecondaryListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => CreateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("secondary_market_listings")
      .insert({
        seller_id: context.userId,
        project_id: data.projectId,
        shares: data.shares,
        ask_price: data.askPrice,
        offer_type: data.offerType,
        status: "open",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const cancelSecondaryListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("secondary_market_listings")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("seller_id", context.userId)
      .eq("status", "open");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const expressInterestSecondary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Insert a notification for the seller; actual settlement goes through escrow flow.
    const { data: row, error } = await context.supabase
      .from("secondary_market_listings")
      .select("seller_id, project_id, shares, ask_price")
      .eq("id", data.id)
      .eq("status", "open")
      .maybeSingle();
    if (error || !row) throw new Error("هذا العرض غير متاح");
    if (row.seller_id === context.userId) throw new Error("لا يمكنك شراء عرضك");

    await context.supabase.from("notifications").insert({
      user_id: row.seller_id,
      title: "اهتمام بعرض حصصك",
      body: `هناك مشترٍ مهتم بـ ${row.shares} حصة بسعر ${row.ask_price}.`,
      kind: "secondary_market",
      href: `/secondary-market?listing=${data.id}`,
    });
    return { ok: true };
  });

