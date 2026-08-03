import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } }
  );
}

const idInput = z.object({ userId: z.string().uuid() });

export const getPublicProfileBundle = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const [{ data: profile }, { data: projects }, { data: posts }, { data: trust }] = await Promise.all([
      sb.rpc("get_public_profile", { _user_id: data.userId }),
      sb.rpc("get_user_public_projects", { _user_id: data.userId }),
      sb.rpc("get_user_recent_posts", { _user_id: data.userId, _limit: 20 }),
      (sb as any).rpc("get_user_trust_metrics", { _user_id: data.userId }),
    ]);
    const p = Array.isArray(profile) ? profile[0] : profile;
    if (!p) return { profile: null, projects: [], posts: [], trust: null };
    return {
      profile: p,
      projects: projects ?? [],
      posts: posts ?? [],
      trust: trust ?? null,
    };
  });
