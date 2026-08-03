import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Flag = z.enum(["pinned", "archived", "muted", "deleted"]);

export const toggleConversationFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ conversationId: z.string().uuid(), flag: Flag, value: z.boolean() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, any> = { user_id: userId, conversation_id: data.conversationId, updated_at: new Date().toISOString() };
    if (data.flag === "deleted") patch.deleted_at = data.value ? new Date().toISOString() : null;
    else patch[data.flag] = data.value;
    const { error } = await supabase.from("conversation_state").upsert(patch, { onConflict: "user_id,conversation_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid(), reason: z.string().max(500).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("لا يمكنك حظر نفسك");
    const { error } = await context.supabase.from("user_blocks").insert({ blocker_id: context.userId, blocked_id: data.userId, reason: data.reason ?? null });
    if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
    return { ok: true };
  });

export const unblockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_blocks").delete().eq("blocker_id", context.userId).eq("blocked_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveQuickReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid().optional(), title: z.string().min(1).max(80), body: z.string().min(1).max(2000), sortOrder: z.number().int().optional() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const row = { user_id: context.userId, title: data.title, body: data.body, sort_order: data.sortOrder ?? 0 };
    if (data.id) {
      const { error } = await context.supabase.from("quick_replies").update(row).eq("id", data.id).eq("user_id", context.userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("quick_replies").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteQuickReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("quick_replies").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
