import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function publicClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export const listFeaturedProjects = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(24).default(6) }).parse(input ?? {})
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb.rpc("list_featured_projects", { _limit: data.limit });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string; name: string; ticker: string | null; sector: string | null; country: string | null;
      current_price: number | null; share_price: number | null;
      shares_total: number | null; shares_sold: number | null; cover_image_url: string | null;
      owner_id: string; owner_name: string | null; owner_avatar: string | null; owner_verified: boolean;
    }>;
  });
