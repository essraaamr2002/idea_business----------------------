import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TargetSchema = z.object({ targetUserId: z.string().uuid() });

export const followUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TargetSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.targetUserId === context.userId) throw new Error("لا يمكنك متابعة نفسك");
    const { error } = await context.supabase
      .from("community_follows")
      .upsert({ follower_id: context.userId, followee_id: data.targetUserId }, { onConflict: "follower_id,followee_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unfollowUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TargetSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("community_follows")
      .delete()
      .eq("follower_id", context.userId)
      .eq("followee_id", data.targetUserId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getFollowState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => TargetSchema.parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: mine }, { count: followers }, { count: following }] = await Promise.all([
      context.supabase
        .from("community_follows")
        .select("created_at")
        .eq("follower_id", context.userId)
        .eq("followee_id", data.targetUserId)
        .maybeSingle(),
      context.supabase
        .from("community_follows")
        .select("*", { count: "exact", head: true })
        .eq("followee_id", data.targetUserId),
      context.supabase
        .from("community_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", data.targetUserId),
    ]);
    return { following: !!mine, followers: followers ?? 0, followingCount: following ?? 0 };
  });
