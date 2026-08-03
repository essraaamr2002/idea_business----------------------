import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const Input = z.object({ q: z.string().min(1).max(200), limit: z.number().int().min(1).max(50).default(20) });

export const unifiedSearch = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data }) => {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!);
    const { data: rows, error } = await sb.rpc("unified_search", { q: data.q, lim: data.limit });
    if (error) throw new Error(error.message);
    // best-effort logging (ignore failures)
    sb.from("search_queries").insert({ query: data.q, results_count: rows?.length ?? 0 }).then(() => {});
    return rows ?? [];
  });
