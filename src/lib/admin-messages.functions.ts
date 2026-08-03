import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(ctx: any) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId, _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const adminListConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;
    const { data: convs, error } = await admin
      .from("conversations")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    const ids = (convs ?? []).map((c: any) => c.id);
    if (!ids.length) return { conversations: [] };
    const [{ data: parts }, { data: lastMsgs }] = await Promise.all([
      admin.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", ids),
      admin.from("messages").select("conversation_id, content, sender_id, created_at").in("conversation_id", ids).order("created_at", { ascending: false }),
    ]);
    const userIds = Array.from(new Set([...(parts ?? []).map((p: any) => p.user_id)]));
    const { data: profs } = await admin.from("profiles").select("id, display_name, avatar_url").in("id", userIds);
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const lastByConv = new Map<string, any>();
    for (const m of (lastMsgs ?? [])) if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
    const partsByConv = new Map<string, any[]>();
    for (const p of (parts ?? [])) {
      const arr = partsByConv.get(p.conversation_id) ?? [];
      arr.push(profMap.get(p.user_id) ?? { id: p.user_id, display_name: "—" });
      partsByConv.set(p.conversation_id, arr);
    }
    return {
      conversations: (convs ?? []).map((c: any) => ({
        id: c.id,
        created_at: c.created_at,
        participants: partsByConv.get(c.id) ?? [],
        last_message: lastByConv.get(c.id) ?? null,
      })),
    };
  });

export const adminListMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;
    const { data: msgs, error } = await admin
      .from("messages")
      .select("id, conversation_id, sender_id, content, read_at, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const senderIds = Array.from(new Set((msgs ?? []).map((m: any) => m.sender_id)));
    const { data: profs } = await admin.from("profiles").select("id, display_name, avatar_url").in("id", senderIds);
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    await admin.from("admin_audit_log").insert({
      actor_id: context.userId, action: "view_private_messages",
      target_table: "conversations", target_id: data.conversationId, diff: { count: msgs?.length ?? 0 },
    });
    return { messages: (msgs ?? []).map((m: any) => ({ ...m, sender: map.get(m.sender_id) ?? null })) };
  });
