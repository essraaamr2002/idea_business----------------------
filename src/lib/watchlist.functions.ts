import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listWatchlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("watchlist")
      .select("id, project_id, note, created_at, projects(id, name, ticker, current_price, status)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { ok: true as const, items: data ?? [] };
  });

export const addWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ project_id: z.string().uuid(), note: z.string().max(500).optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("watchlist")
      .upsert({ user_id: context.userId, project_id: data.project_id, note: data.note ?? null }, { onConflict: "user_id,project_id" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const removeWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("watchlist").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
