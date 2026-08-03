import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const postTypeEnum = z.enum(["tweet", "idea", "project_link"]);

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      content: z.string().max(5000).default(""),
      title: z.string().max(200).optional(),
      category: z.string().max(50).optional(),
      postType: postTypeEnum.default("tweet"),
      mediaUrls: z.array(z.string().url().refine((u) => u.startsWith("https://"), { message: "Only https:// URLs are allowed" })).max(8).optional(),
      linkedProjectId: z.string().uuid().nullable().optional(),
      displayAsAlias: z.boolean().optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    if (!data.content.trim() && !(data.mediaUrls?.length) && !data.linkedProjectId) {
      throw new Error("لا يمكن نشر بزنسة فارغة");
    }
    // Auto-extract hashtags from content for trending / filtering
    const hashtagMatches = (data.content.match(/#([\p{L}\p{N}_]+)/gu) ?? [])
      .map((m) => m.slice(1).toLowerCase());
    const hashtags = Array.from(new Set(hashtagMatches)).slice(0, 10);
    const { data: row, error } = await context.supabase
      .from("community_posts")
      .insert({
        user_id: context.userId,
        content: data.content,
        title: data.title ?? null,
        category: data.category ?? "general",
        post_type: data.postType,
        media_urls: data.mediaUrls ?? [],
        linked_project_id: data.linkedProjectId ?? null,
        display_as_alias: data.displayAsAlias ?? false,
        hashtags,
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const togglePostLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ postId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("community_post_likes")
      .select("post_id")
      .eq("post_id", data.postId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      await context.supabase.from("community_post_likes").delete()
        .eq("post_id", data.postId).eq("user_id", context.userId);
      return { liked: false };
    }
    const { error: qErr } = await context.supabase.rpc("check_and_consume_quota" as any, { _action: "like" });
    if (qErr) throw new Error(qErr.message === "quota_exceeded" || qErr.message?.includes("quota_exceeded") ? "quota_exceeded" : qErr.message);
    await context.supabase.from("community_post_likes").insert({ post_id: data.postId, user_id: context.userId });
    return { liked: true };
  });

export const addPostComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      postId: z.string().uuid(),
      content: z.string().min(1).max(2000),
      parentId: z.string().uuid().nullable().optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { error: qErr } = await context.supabase.rpc("check_and_consume_quota" as any, { _action: "comment" });
    if (qErr) throw new Error(qErr.message?.includes("quota_exceeded") ? "quota_exceeded" : qErr.message);
    const { error } = await context.supabase.from("community_post_comments").insert({
      post_id: data.postId,
      user_id: context.userId,
      content: data.content,
      parent_id: data.parentId ?? null,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const togglePostRepost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ postId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("community_post_reposts")
      .select("post_id")
      .eq("post_id", data.postId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      await context.supabase.from("community_post_reposts").delete()
        .eq("post_id", data.postId).eq("user_id", context.userId);
      return { reposted: false };
    }
    const { error: qErr } = await context.supabase.rpc("check_and_consume_quota" as any, { _action: "other" });
    if (qErr) throw new Error(qErr.message?.includes("quota_exceeded") ? "quota_exceeded" : qErr.message);
    await context.supabase.from("community_post_reposts").insert({
      post_id: data.postId, user_id: context.userId,
    });
    return { reposted: true };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ postId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("community_posts").delete().eq("id", data.postId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateAliasSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      aliasName: z.string().trim().max(50).nullable().optional(),
      useAliasDefault: z.boolean().optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.aliasName !== undefined) patch.alias_name = data.aliasName?.trim() || null;
    if (data.useAliasDefault !== undefined) patch.use_alias_default = data.useAliasDefault;
    const { error } = await context.supabase
      .from("profiles")
      .update(patch as any)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ensurePlatformEntityPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      entity: z.enum(["project", "auction", "tender"]),
      entityId: z.string().uuid(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    let ownerId: string | null = null;
    let title = "مشروع في المنصة";
    let linkedProjectId: string | null = null;

    if (data.entity === "project") {
      const { data: project, error } = await context.supabase
        .from("projects")
        .select("id, owner_id, name")
        .eq("id", data.entityId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!project) throw new Error("project_not_found");
      ownerId = (project as any).owner_id;
      title = (project as any).name || title;
      linkedProjectId = (project as any).id;
    } else {
      const { data: auction, error } = await context.supabase
        .from("auctions" as any)
        .select("id, owner_id, project_id, type, projects(name)")
        .eq("id", data.entityId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!auction) throw new Error("auction_not_found");
      ownerId = (auction as any).owner_id;
      linkedProjectId = (auction as any).project_id;
      title = (auction as any).projects?.name || title;
    }

    if (!ownerId) throw new Error("owner_not_found");
    const category = `entity_${data.entity}_${data.entityId}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: eErr } = await supabaseAdmin
      .from("community_posts")
      .select("id, likes_count, comments_count, reposts_count")
      .eq("category", category)
      .eq("user_id", ownerId)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);
    if (existing?.id) return existing;

    const { data: row, error } = await supabaseAdmin
      .from("community_posts")
      .insert({
        user_id: ownerId,
        content: title,
        category,
        status: "published",
        linked_project_id: linkedProjectId,
      } as any)
      .select("id, likes_count, comments_count, reposts_count")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
