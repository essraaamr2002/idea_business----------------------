import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ReactionKind = z.enum(["like", "fire", "clap", "idea", "handshake"]);

export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ postId: z.string().uuid(), kind: ReactionKind }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("community_post_reactions" as any)
      .select("post_id")
      .eq("post_id", data.postId)
      .eq("user_id", context.userId)
      .eq("kind", data.kind)
      .maybeSingle();
    if (existing) {
      await context.supabase
        .from("community_post_reactions" as any)
        .delete()
        .eq("post_id", data.postId).eq("user_id", context.userId).eq("kind", data.kind);
      return { active: false };
    }
    const { error } = await context.supabase
      .from("community_post_reactions" as any)
      .insert({ post_id: data.postId, user_id: context.userId, kind: data.kind } as any);
    if (error) throw new Error(error.message);
    return { active: true };
  });

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ postId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("community_post_bookmarks" as any)
      .select("post_id")
      .eq("post_id", data.postId).eq("user_id", context.userId).maybeSingle();
    if (existing) {
      await context.supabase.from("community_post_bookmarks" as any).delete()
        .eq("post_id", data.postId).eq("user_id", context.userId);
      return { saved: false };
    }
    await context.supabase.from("community_post_bookmarks" as any)
      .insert({ post_id: data.postId, user_id: context.userId } as any);
    return { saved: true };
  });

export const togglePinPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ postId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: post } = await context.supabase
      .from("community_posts").select("user_id,pinned").eq("id", data.postId).maybeSingle();
    if (!post || (post as any).user_id !== context.userId) throw new Error("forbidden");
    const next = !(post as any).pinned;
    if (next) {
      await context.supabase.from("community_posts").update({ pinned: false } as any).eq("user_id", context.userId);
    }
    await context.supabase.from("community_posts").update({ pinned: next } as any).eq("id", data.postId);
    return { pinned: next };
  });

export const createPoll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      postId: z.string().uuid(),
      question: z.string().min(3).max(280),
      options: z.array(z.string().min(1).max(80)).min(2).max(6),
      multi: z.boolean().default(false),
      hours: z.number().int().min(1).max(168).default(24),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: post } = await context.supabase
      .from("community_posts").select("user_id").eq("id", data.postId).maybeSingle();
    if (!post || (post as any).user_id !== context.userId) throw new Error("forbidden");
    const expires = new Date(Date.now() + data.hours * 3600_000).toISOString();
    const { data: poll, error } = await context.supabase
      .from("community_polls" as any)
      .insert({ post_id: data.postId, question: data.question, multi: data.multi, expires_at: expires } as any)
      .select("id").single();
    if (error) throw new Error(error.message);
    const opts = data.options.map((label, i) => ({ poll_id: (poll as any).id, label, position: i }));
    const { error: oErr } = await context.supabase.from("community_poll_options" as any).insert(opts as any);
    if (oErr) throw new Error(oErr.message);
    return { pollId: (poll as any).id };
  });

export const votePoll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ pollId: z.string().uuid(), optionIds: z.array(z.string().uuid()).min(1).max(6) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: poll } = await context.supabase
      .from("community_polls" as any).select("multi,expires_at").eq("id", data.pollId).maybeSingle();
    if (!poll) throw new Error("not_found");
    if ((poll as any).expires_at && new Date((poll as any).expires_at).getTime() < Date.now())
      throw new Error("poll_closed");
    if (!(poll as any).multi && data.optionIds.length > 1) throw new Error("single_choice_only");
    await context.supabase.from("community_poll_votes" as any).delete()
      .eq("poll_id", data.pollId).eq("user_id", context.userId);
    const rows = data.optionIds.map((option_id) => ({
      poll_id: data.pollId, option_id, user_id: context.userId,
    }));
    const { error } = await context.supabase.from("community_poll_votes" as any).insert(rows as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const followUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ targetId: z.string().uuid(), follow: z.boolean() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    if (data.targetId === context.userId) throw new Error("cant_follow_self");
    if (data.follow) {
      const { error } = await context.supabase.from("community_follows" as any)
        .insert({ follower_id: context.userId, following_id: data.targetId } as any);
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      await context.supabase.from("community_follows" as any).delete()
        .eq("follower_id", context.userId).eq("following_id", data.targetId);
    }
    return { following: data.follow };
  });

export const searchMentions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ q: z.string().min(1).max(50) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .rpc("search_mentionable_users" as any, { _q: data.q, _limit: 8 });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{ id: string; display_name: string | null; avatar_url: string | null }>;
  });

export const bumpShare = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ postId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    await sb.rpc("bump_post_share" as any, { _post_id: data.postId });
    return { ok: true };
  });
