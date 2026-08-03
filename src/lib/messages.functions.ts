import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


export const openConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ otherUserId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.otherUserId === context.userId) throw new Error("لا يمكنك مراسلة نفسك");
    const { data: cid, error } = await context.supabase.rpc("get_or_create_direct_conversation", {
      _other_user: data.otherUserId,
    });
    if (error) throw new Error(error.message);
    return { conversationId: cid as string };
  });

const SendInput = z.object({
  conversationId: z.string().uuid(),
  content: z.string().max(5000).optional().default(""),
  attachmentUrl: z.string().max(500).optional(),
  attachmentType: z.string().max(120).optional(),
}).refine((d) => (d.content?.trim().length ?? 0) > 0 || !!d.attachmentUrl, {
  message: "الرسالة فارغة",
});

async function ensureNotBlocked(supabase: any, me: string, conversationId: string) {
  const { data: other } = await supabase
    .from("conversation_participants").select("user_id")
    .eq("conversation_id", conversationId).neq("user_id", me).maybeSingle();
  if (!other?.user_id) return;
  const { data: blk } = await supabase
    .from("user_blocks").select("blocker_id")
    .or(`and(blocker_id.eq.${me},blocked_id.eq.${other.user_id}),and(blocker_id.eq.${other.user_id},blocked_id.eq.${me})`)
    .limit(1).maybeSingle();
  if (blk) throw new Error("BLOCKED: لا يمكن إرسال الرسالة — تم حظر المحادثة بين الطرفين.");
}

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SendInput.parse(input))
  .handler(async ({ data, context }) => {
    await ensureNotBlocked(context.supabase, context.userId, data.conversationId);

    // Quota: basic membership = 3 messages / calendar month. Full membership = unlimited.
    const { data: prof } = await context.supabase
      .from("profiles").select("membership").eq("id", context.userId).maybeSingle();
    const isFull = (prof as any)?.membership === "full";
    if (!isFull) {
      const monthStart = new Date();
      monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
      const { count } = await context.supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", context.userId)
        .gte("created_at", monthStart.toISOString());
      if ((count ?? 0) >= 3) {
        throw new Error("MESSAGE_QUOTA_EXCEEDED: تجاوزت الحد المسموح (٣ رسائل شهرياً). قم بترقية العضوية للحصول على رسائل غير محدودة.");
      }
    }
    const content = (data.content ?? "").trim();
    const { error } = await context.supabase.from("messages").insert({
      conversation_id: data.conversationId,
      sender_id: context.userId,
      content: content || (data.attachmentType?.startsWith("image/") ? "📎 صورة" : "📎 ملف"),
      attachment_url: data.attachmentUrl ?? null,
      attachment_type: data.attachmentType ?? null,
    });
    if (error) throw new Error(error.message);

    // In-app notification for every other participant (SECURITY DEFINER RPC).
    try {
      await context.supabase.rpc("notify_message_recipients", {
        _conversation_id: data.conversationId,
        _preview: content || "📎 مرفق",
      });
    } catch { /* best-effort */ }

    // Email notification — respects user_preferences.messages_email/messages_silent.
    try {
      await sendMessageEmails(context, data.conversationId, content || "📎 مرفق");
    } catch (e) { console.warn("message email skipped", e); }

    return { ok: true };
  });

/** One-shot: open (or create) conversation and send the first message. */
export const sendQuickFirstMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ otherUserId: z.string().uuid(), content: z.string().min(1).max(5000) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    if (data.otherUserId === context.userId) throw new Error("لا يمكنك مراسلة نفسك");
    const { data: cid, error } = await context.supabase.rpc("get_or_create_direct_conversation", {
      _other_user: data.otherUserId,
    });
    if (error) throw new Error(error.message);
    const conversationId = cid as string;
    await ensureNotBlocked(context.supabase, context.userId, conversationId);

    const { data: prof } = await context.supabase
      .from("profiles").select("membership").eq("id", context.userId).maybeSingle();
    const isFull = (prof as any)?.membership === "full";
    if (!isFull) {
      const monthStart = new Date();
      monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
      const { count } = await context.supabase
        .from("messages").select("id", { count: "exact", head: true })
        .eq("sender_id", context.userId).gte("created_at", monthStart.toISOString());
      if ((count ?? 0) >= 3) {
        throw new Error("MESSAGE_QUOTA_EXCEEDED: تجاوزت الحد المسموح (٣ رسائل شهرياً).");
      }
    }
    const { error: e2 } = await context.supabase.from("messages").insert({
      conversation_id: conversationId, sender_id: context.userId, content: data.content.trim(),
    });
    if (e2) throw new Error(e2.message);

    try {
      await context.supabase.rpc("notify_message_recipients", {
        _conversation_id: conversationId, _preview: data.content.trim(),
      });
    } catch { /* noop */ }
    try { await sendMessageEmails(context, conversationId, data.content.trim()); } catch {}
    return { ok: true, conversationId };
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ conversationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("messages").update({ read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversationId)
      .is("read_at", null)
      .neq("sender_id", context.userId);
    // Update last_seen_at presence
    await context.supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", context.userId);
    return { ok: true };
  });

export const updateLastSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", context.userId);
    return { ok: true };
  });

async function sendMessageEmails(context: any, conversationId: string, content: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: parts } = await supabaseAdmin
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", context.userId);
  const recipientIds = (parts ?? []).map((p: any) => p.user_id);
  if (!recipientIds.length) return;

  const { data: senderProf } = await supabaseAdmin
    .from("profiles").select("display_name, legal_full_name").eq("id", context.userId).maybeSingle();
  const senderName = (senderProf as any)?.display_name || (senderProf as any)?.legal_full_name || "عضو";

  const { data: prefs } = await supabaseAdmin
    .from("user_preferences")
    .select("user_id, email_alerts, messages_email, messages_silent")
    .in("user_id", recipientIds);
  const optInMap = new Map<string, boolean>();
  (prefs ?? []).forEach((p: any) => {
    if (p.messages_silent) { optInMap.set(p.user_id, false); return; }
    if (p.messages_email === false) { optInMap.set(p.user_id, false); return; }
    optInMap.set(p.user_id, p.email_alerts !== false);
  });
  const enabled = recipientIds.filter((id) => optInMap.get(id) !== false);
  if (!enabled.length) return;

  const { data: profs } = await supabaseAdmin
    .from("profiles").select("id, display_name, legal_full_name").in("id", enabled);
  const profMap = new Map<string, any>();
  (profs ?? []).forEach((p: any) => profMap.set(p.id, p));

  // Build absolute URL to internal send route + forward caller's bearer
  let origin = process.env.SITE_URL || "https://busniss.org";
  let bearer = "";
  try {
    const req = getRequest();
    const url = new URL(req.url);
    origin = `${url.protocol}//${url.host}`;
    bearer = (getRequestHeader("authorization") || "").replace(/^Bearer\s+/i, "");
  } catch { /* noop */ }
  if (!bearer) return;

  for (const uid of enabled) {
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      const email = u?.user?.email;
      if (!email) continue;
      const recipientName = profMap.get(uid)?.display_name || profMap.get(uid)?.legal_full_name || undefined;

      await fetch(`${origin}/lovable/email/transactional/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
        body: JSON.stringify({
          templateName: "new-message",
          recipientEmail: email,
          idempotencyKey: `new-message-${conversationId}-${Date.now()}-${uid}`,
          templateData: {
            recipientName,
            senderName,
            preview: content.length > 200 ? content.slice(0, 200) + "…" : content,
            conversationUrl: `${origin.replace(/^http:/, "https:")}/messages?c=${conversationId}`,
          },
        }),
      });
    } catch (e) { console.warn("send email failed", uid, e); }
  }
}
