import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { sendMessage, markConversationRead, updateLastSeen } from "@/lib/messages.functions";
import {
  toggleConversationFlag, blockUser, unblockUser,
  saveQuickReply, deleteQuickReply,
} from "@/lib/messages-extra.functions";
import { reportConversation, getMyMessagePrefs, setMyMessagePrefs } from "@/lib/messages-reports.functions";
import {
  MessageSquare, Send, Loader2, Inbox, SendHorizonal, Layers, Search,
  Pin, Archive, Trash2, BellOff, Bell, Ban, MoreVertical, Zap, Plus, Check, CheckCheck,
  Flag, Paperclip, X, Image as ImageIcon, FileText, Settings as SettingsIcon,
  FileDown, ShieldOff, LifeBuoy,
} from "lucide-react";
import { UserChip } from "@/components/UserBadges";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { compressImage, uploadWithRetry } from "@/lib/image-upload";
import { exportConversationPdf } from "@/lib/conversation-pdf";

export const Route = createFileRoute("/messages")({
  validateSearch: (s: Record<string, unknown>) => ({ c: typeof s.c === "string" ? s.c : undefined }),
  head: () => ({
    meta: [
      { title: "الرسائل — IDEA BUSINESS" },
      { name: "description", content: "تواصل مع المستثمرين وأصحاب المشاريع." },
    ],
  }),
  component: MessagesPage,
});

type Other = { id: string; display_name: string | null; pseudonym?: string | null; avatar_url?: string | null; verified_green?: boolean; verified_blue?: boolean; last_seen_at?: string | null; hide_read_receipts?: boolean };

function highlightText(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((p, i) =>
    p.toLowerCase() === q.toLowerCase()
      ? <mark key={i} className="bg-amber-300/60 text-inherit rounded px-0.5">{p}</mark>
      : <span key={i}>{p}</span>
  );
}
type State = { pinned: boolean; archived: boolean; muted: boolean; deleted_at: string | null };
type Conv = {
  id: string; last_message_at: string;
  other?: Other | null;
  lastSenderId?: string | null; lastPreview?: string | null; unread?: number;
  state?: State;
};
type QR = { id: string; title: string; body: string; sort_order: number };

type Folder = "all" | "inbox" | "outbox" | "unread" | "pinned" | "archived";

function MessagesPage() {
  const { user } = useAuth();
  const { c: initialConv } = Route.useSearch();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialConv ?? null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [folder, setFolder] = useState<Folder>("all");
  const [query, setQuery] = useState("");
  const [typing, setTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<QR[]>([]);
  const [blockedSet, setBlockedSet] = useState<Set<string>>(new Set());
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [myPrefs, setMyPrefs] = useState<{ hide_read_receipts: boolean; messages_silent: boolean; messages_email: boolean; messages_push: boolean }>({
    hide_read_receipts: false, messages_silent: false, messages_email: true, messages_push: true,
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimer = useRef<number | null>(null);

  const send = useServerFn(sendMessage);
  const markRead = useServerFn(markConversationRead);
  const fnLastSeen = useServerFn(updateLastSeen);
  const fnToggleFlag = useServerFn(toggleConversationFlag);
  const fnBlock = useServerFn(blockUser);
  const fnUnblock = useServerFn(unblockUser);
  const fnSaveQR = useServerFn(saveQuickReply);
  const fnDelQR = useServerFn(deleteQuickReply);
  const fnReport = useServerFn(reportConversation);
  const fnGetPrefs = useServerFn(getMyMessagePrefs);
  const fnSetPrefs = useServerFn(setMyMessagePrefs);

  const loadConvs = useCallback(async () => {
    if (!user) return;
    const { data: parts } = await supabase
      .from("conversation_participants")
      .select("conversation_id, conversations(id, last_message_at)")
      .eq("user_id", user.id);
    const list = (parts ?? []).map((p: any) => p.conversations).filter(Boolean);
    const ids = list.map((c: any) => c.id);
    const others: Record<string, any> = {};
    if (ids.length) {
      const { data: otherParts } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", ids)
        .neq("user_id", user.id);
      const uids = Array.from(new Set((otherParts ?? []).map((p: any) => p.user_id)));
      const profMap: Record<string, any> = {};
      if (uids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url, verified_green, verified_blue, last_seen_at").in("id", uids);
        (profs ?? []).forEach((p: any) => { profMap[p.id] = p; });
      }
      (otherParts ?? []).forEach((p: any) => { others[p.conversation_id] = profMap[p.user_id]; });
    }
    const { data: stateRows } = await supabase
      .from("conversation_state")
      .select("conversation_id, pinned, archived, muted, deleted_at")
      .eq("user_id", user.id);
    const stateMap = new Map<string, State>();
    (stateRows ?? []).forEach((s: any) => stateMap.set(s.conversation_id, s));

    const enriched: Conv[] = await Promise.all(list.map(async (c: any) => {
      const [{ data: last }, { count: unread }] = await Promise.all([
        supabase.from("messages").select("sender_id, content").eq("conversation_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", c.id).is("read_at", null).neq("sender_id", user.id),
      ]);
      return {
        ...c, other: others[c.id],
        lastSenderId: (last as any)?.sender_id ?? null,
        lastPreview: (last as any)?.content ?? null,
        unread: unread ?? 0,
        state: stateMap.get(c.id) ?? { pinned: false, archived: false, muted: false, deleted_at: null },
      };
    }));
    enriched.sort((a, b) => {
      const pa = a.state?.pinned ? 1 : 0; const pb = b.state?.pinned ? 1 : 0;
      if (pa !== pb) return pb - pa;
      return b.last_message_at.localeCompare(a.last_message_at);
    });
    setConvs(enriched);
  }, [user]);

  const loadAux = useCallback(async () => {
    if (!user) return;
    const [{ data: qr }, { data: bl }] = await Promise.all([
      supabase.from("quick_replies").select("id, title, body, sort_order").eq("user_id", user.id).order("sort_order"),
      supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id),
    ]);
    setQuickReplies((qr ?? []) as QR[]);
    setBlockedSet(new Set((bl ?? []).map((r: any) => r.blocked_id)));
  }, [user]);

  const loadMessages = useCallback(async (cid: string) => {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, content, created_at, read_at, attachment_url, attachment_type")
      .eq("conversation_id", cid)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    setTimeout(() => scrollRef.current?.scrollTo({ top: 999999 }), 50);
    try { await markRead({ data: { conversationId: cid } }); } catch { /* ignore */ }
  }, [markRead]);

  useEffect(() => {
    loadConvs(); loadAux();
    fnGetPrefs({}).then((p: any) => setMyPrefs(p)).catch(() => {});
    fnLastSeen({}).catch(() => {});
    const hb = window.setInterval(() => { fnLastSeen({}).catch(() => {}); }, 60_000);
    return () => window.clearInterval(hb);
  }, [loadConvs, loadAux]);

  useEffect(() => {
    if (!activeId || !user) return;
    loadMessages(activeId);
    const channel = supabase.channel(`messages:${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          setMessages((m) => [...m, payload.new]);
          setTimeout(() => scrollRef.current?.scrollTo({ top: 999999 }), 50);
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => { setMessages((m) => m.map((x) => x.id === (payload.new as any).id ? payload.new : x)); })
      .subscribe();
    // Typing presence
    const tc = supabase.channel(`typing:${activeId}`, { config: { presence: { key: user.id } } });
    tc.on("presence", { event: "sync" }, () => {
      const state = tc.presenceState() as Record<string, any[]>;
      const others = Object.entries(state).filter(([k]) => k !== user.id).flatMap(([, v]) => v);
      setTyping(others.some((p: any) => p?.typing));
    }).subscribe(async (s) => { if (s === "SUBSCRIBED") await tc.track({ typing: false }); });
    typingChannelRef.current = tc;
    return () => { supabase.removeChannel(channel); supabase.removeChannel(tc); typingChannelRef.current = null; };
  }, [activeId, loadMessages, user]);

  const broadcastTyping = useCallback((isTyping: boolean) => {
    typingChannelRef.current?.track({ typing: isTyping });
  }, []);

  // In-conversation message search
  const [msgQuery, setMsgQuery] = useState("");
  const [msgSearchAttachOnly, setMsgSearchAttachOnly] = useState(false);
  const filteredMessages = useMemo(() => {
    const q = msgQuery.trim().toLowerCase();
    return messages.filter((m: any) => {
      if (msgSearchAttachOnly && !m.attachment_url) return false;
      if (!q) return true;
      return (m.content ?? "").toLowerCase().includes(q);
    });
  }, [messages, msgQuery, msgSearchAttachOnly]);


  const onTextChange = (v: string) => {
    setText(v);
    broadcastTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => broadcastTyping(false), 1500);
  };

  const pickFile = async (f: File | null) => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    if (!f) { setPendingFile(null); setPendingPreview(null); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error("الحد الأقصى 10MB"); return; }
    const out = await compressImage(f).catch(() => f);
    if (out !== f && out.size < f.size) {
      toast.success(`تم ضغط الصورة بنسبة ${Math.round((1 - out.size / f.size) * 100)}%`);
    }
    setPendingFile(out);
    if (out.type.startsWith("image/")) {
      const url = URL.createObjectURL(out);
      setPendingPreview(url);
    } else setPendingPreview(null);
  };

  const uploadPending = async (): Promise<{ path: string; type: string } | null> => {
    if (!pendingFile || !activeId || !user) return null;
    setUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
      const path = `${user.id}/${activeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      await uploadWithRetry(async () => {
        const { error } = await supabase.storage.from("message-attachments").upload(path, pendingFile, { upsert: false, contentType: pendingFile.type });
        if (error) throw error;
      });
      return { path, type: pendingFile.type || "application/octet-stream" };
    } finally { setUploading(false); }
  };

  const handleSend = async () => {
    if ((!text.trim() && !pendingFile) || !activeId) return;
    setSending(true);
    try {
      let attachment: { path: string; type: string } | null = null;
      if (pendingFile) attachment = await uploadPending();
      await send({ data: {
        conversationId: activeId,
        content: text.trim(),
        attachmentUrl: attachment?.path,
        attachmentType: attachment?.type,
      } });
      setText(""); broadcastTyping(false);
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
      setPendingFile(null); setPendingPreview(null);
      loadConvs();
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (/BLOCKED/.test(msg)) toast.error("لا يمكن إرسال الرسالة — تم الحظر بين الطرفين");
      else if (/QUOTA/.test(msg)) toast.error("تجاوزت حد الرسائل الشهري — قم بترقية العضوية");
      else toast.error(msg || "تعذّر إرسال الرسالة");
    }
    finally { setSending(false); }
  };

  const handleExportPdf = async () => {
    if (!activeId || !user) return;
    const otherName = convs.find((c) => c.id === activeId)?.other?.display_name || "مستخدم";
    const meName = (user.user_metadata as any)?.display_name || user.email || "أنا";
    await exportConversationPdf({
      title: `محادثة بين ${meName} و ${otherName}`,
      meId: user.id, meName, otherName, messages: messages as any,
    });
  };

  const doReport = async (reason: string, notes: string) => {
    if (!activeId || !otherId) return;
    try {
      await fnReport({ data: { conversationId: activeId, reportedUserId: otherId, reason: reason as any, notes } });
      toast.success("تم استلام البلاغ، سيراجعه فريق الإدارة");
      setReportOpen(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const togglePref = async (key: "hide_read_receipts" | "messages_silent", value: boolean) => {
    setMyPrefs((p) => ({ ...p, [key]: value }));
    try { await fnSetPrefs({ data: { [key]: value } as any }); toast.success("تم الحفظ"); }
    catch (e: any) { toast.error(e.message); }
  };

  const flag = async (cid: string, flag: "pinned" | "archived" | "muted" | "deleted", value: boolean) => {
    try { await fnToggleFlag({ data: { conversationId: cid, flag, value } }); loadConvs(); toast.success("تم"); }
    catch (e: any) { toast.error(e.message); }
  };

  const doBlock = async (uid: string, on: boolean) => {
    try {
      if (on) await fnBlock({ data: { userId: uid } });
      else await fnUnblock({ data: { userId: uid } });
      loadAux();
      toast.success(on ? "تم الحظر" : "تم إلغاء الحظر");
    } catch (e: any) { toast.error(e.message); }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-primary/40" />
          <h1 className="mt-4 text-2xl font-black">الرسائل</h1>
          <p className="mt-2 text-muted-foreground">سجّل الدخول لعرض رسائلك.</p>
          <Link to="/auth" className="mt-5 inline-flex rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground">تسجيل الدخول</Link>
        </main>
      </div>
    );
  }

  // Hide soft-deleted unless folder is "archived"
  const visibleConvs = useMemo(() => convs.filter((c) => !c.state?.deleted_at), [convs]);

  const counts = useMemo(() => ({
    all: visibleConvs.filter((c) => !c.state?.archived).length,
    inbox: visibleConvs.filter((c) => !c.state?.archived && c.lastSenderId && c.lastSenderId !== user.id).length,
    outbox: visibleConvs.filter((c) => !c.state?.archived && c.lastSenderId === user.id).length,
    unread: visibleConvs.filter((c) => !c.state?.archived).reduce((n, c) => n + (c.unread ?? 0), 0),
    pinned: visibleConvs.filter((c) => c.state?.pinned).length,
    archived: visibleConvs.filter((c) => c.state?.archived).length,
  }), [visibleConvs, user.id]);

  const filteredConvs = useMemo(() => {
    let rows = visibleConvs;
    if (folder === "archived") rows = rows.filter((c) => c.state?.archived);
    else rows = rows.filter((c) => !c.state?.archived);
    if (folder === "inbox") rows = rows.filter((c) => c.lastSenderId && c.lastSenderId !== user.id);
    else if (folder === "outbox") rows = rows.filter((c) => c.lastSenderId === user.id);
    else if (folder === "unread") rows = rows.filter((c) => (c.unread ?? 0) > 0);
    else if (folder === "pinned") rows = rows.filter((c) => c.state?.pinned);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((c) =>
        (c.other?.display_name ?? "").toLowerCase().includes(q) ||
        (c.lastPreview ?? "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [visibleConvs, folder, query, user.id]);

  const tabs: { k: Folder; label: string; icon: any; n: number }[] = [
    { k: "all", label: "الكل", icon: Layers, n: counts.all },
    { k: "inbox", label: "الوارد", icon: Inbox, n: counts.inbox },
    { k: "outbox", label: "الصادر", icon: SendHorizonal, n: counts.outbox },
    { k: "unread", label: "غير مقروء", icon: MessageSquare, n: counts.unread },
    { k: "pinned", label: "مثبّت", icon: Pin, n: counts.pinned },
    { k: "archived", label: "الأرشيف", icon: Archive, n: counts.archived },
  ];

  const activeConv = convs.find((c) => c.id === activeId);
  const otherId = activeConv?.other?.id;
  const isBlocked = otherId ? blockedSet.has(otherId) : false;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="mx-auto w-full max-w-5xl px-4 py-6 flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black">الرسائل</h1>
          <div className="flex items-center gap-2">
            <QuickRepliesManager items={quickReplies} onSave={(d) => fnSaveQR({ data: d }).then(loadAux)} onDelete={(id) => fnDelQR({ data: { id } }).then(loadAux)} />
            <div className="text-xs text-muted-foreground">
              {counts.unread > 0 ? `${counts.unread} غير مقروءة` : "لا جديد"}
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {tabs.map(({ k, label, icon: Icon, n }) => (
            <button
              key={k}
              onClick={() => setFolder(k)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition ${folder === k ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70 text-foreground"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              <span className={`rounded-full px-1.5 text-[10px] ${folder === k ? "bg-primary-foreground/20" : "bg-background"}`}>{n}</span>
            </button>
          ))}
          <div className="relative ms-auto">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في الرسائل…"
              className="w-56 rounded-full border border-border bg-background px-3 py-1.5 pe-8 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[70vh]">
          <aside className="rounded-2xl border border-border bg-card overflow-y-auto">
            {filteredConvs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {folder === "inbox" ? "لا توجد رسائل واردة" :
                  folder === "outbox" ? "لم ترسل أي رسائل بعد" :
                  folder === "unread" ? "كل رسائلك مقروءة ✓" :
                  folder === "pinned" ? "لا توجد محادثات مثبّتة" :
                  folder === "archived" ? "الأرشيف فارغ" :
                  "لا توجد محادثات بعد"}
              </div>
            ) : (
              <ul>
                {filteredConvs.map((c) => {
                  const isOut = c.lastSenderId === user.id;
                  const preview = c.lastPreview ? (c.lastPreview.length > 60 ? c.lastPreview.slice(0, 60) + "…" : c.lastPreview) : "";
                  return (
                    <li key={c.id}>
                      <div className={`relative border-b border-border ${activeId === c.id ? "bg-muted/60" : "hover:bg-muted/40"}`}>
                        <button onClick={() => setActiveId(c.id)} className="w-full text-start px-4 py-3 pe-12">
                          <div className="flex items-center gap-2">
                            {c.state?.pinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500" />}
                            {c.state?.muted && <BellOff className="h-3 w-3 text-muted-foreground" />}
                            <UserChip
                              name={c.other?.display_name ?? "مستخدم"}
                              pseudonym={c.other?.pseudonym}
                              avatarUrl={c.other?.avatar_url}
                              verifiedGreen={!!c.other?.verified_green}
                              verifiedBlue={!!c.other?.verified_blue}
                              subtitle={new Date(c.last_message_at).toLocaleString("ar")}
                            />
                          </div>
                          {preview && (
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span className={`inline-flex h-4 items-center rounded-full px-1.5 text-[9px] font-bold ${isOut ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600"}`}>
                                {isOut ? "صادر" : "وارد"}
                              </span>
                              <span className="truncate">{preview}</span>
                            </div>
                          )}
                          {(c.unread ?? 0) > 0 && (
                            <span className="absolute top-3 start-3 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-primary-foreground">
                              {c.unread}
                            </span>
                          )}
                        </button>
                        <div className="absolute top-2 end-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="rounded-full p-1.5 hover:bg-muted">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem onClick={() => flag(c.id, "pinned", !c.state?.pinned)}>
                                <Pin className="h-3.5 w-3.5 me-2" /> {c.state?.pinned ? "إلغاء التثبيت" : "تثبيت"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => flag(c.id, "muted", !c.state?.muted)}>
                                {c.state?.muted ? <Bell className="h-3.5 w-3.5 me-2" /> : <BellOff className="h-3.5 w-3.5 me-2" />}
                                {c.state?.muted ? "إلغاء الكتم" : "كتم"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => flag(c.id, "archived", !c.state?.archived)}>
                                <Archive className="h-3.5 w-3.5 me-2" /> {c.state?.archived ? "إخراج من الأرشيف" : "أرشفة"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {c.other?.id && (
                                <DropdownMenuItem onClick={() => doBlock(c.other!.id, !blockedSet.has(c.other!.id))}>
                                  <Ban className="h-3.5 w-3.5 me-2" /> {blockedSet.has(c.other.id) ? "إلغاء الحظر" : "حظر المستخدم"}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => flag(c.id, "deleted", true)} className="text-destructive">
                                <Trash2 className="h-3.5 w-3.5 me-2" /> حذف من قائمتي
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
          <section className="md:col-span-2 rounded-2xl border border-border bg-card flex flex-col">
            {!activeId ? (
              <div className="flex-1 grid place-items-center text-sm text-muted-foreground">اختر محادثة من القائمة</div>
            ) : (
              <>
                {activeConv?.other && (
                  <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{activeConv.other.display_name || "مستخدم"}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {activeConv.other.last_seen_at
                          ? `آخر ظهور: ${formatLastSeen(activeConv.other.last_seen_at)}`
                          : "غير متاح"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="rounded-full p-2 hover:bg-muted" title="الإعدادات">
                          <SettingsIcon className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem onClick={() => togglePref("hide_read_receipts", !myPrefs.hide_read_receipts)}>
                            <CheckCheck className="h-3.5 w-3.5 me-2" />
                            {myPrefs.hide_read_receipts ? "إظهار إشعار القراءة" : "إخفاء إشعار القراءة"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => togglePref("messages_silent", !myPrefs.messages_silent)}>
                            {myPrefs.messages_silent ? <Bell className="h-3.5 w-3.5 me-2" /> : <BellOff className="h-3.5 w-3.5 me-2" />}
                            {myPrefs.messages_silent ? "إعادة تفعيل التنبيهات" : "إيقاف كل تنبيهات الرسائل"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <button onClick={handleExportPdf} className="rounded-full p-2 hover:bg-muted" title="تصدير المحادثة PDF">
                        <FileDown className="h-4 w-4" />
                      </button>
                      <button onClick={() => setReportOpen(true)} className="rounded-full p-2 hover:bg-rose-500/10 text-rose-600" title="إبلاغ">
                        <Flag className="h-4 w-4" />
                      </button>
                      {otherId && (
                        <button onClick={() => doBlock(otherId, !blockedSet.has(otherId))} className="rounded-full p-2 hover:bg-muted" title={blockedSet.has(otherId) ? "إلغاء الحظر" : "حظر"}>
                          <Ban className={`h-4 w-4 ${blockedSet.has(otherId) ? "text-rose-600" : ""}`} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {/* In-conversation message search */}
                <div className="flex items-center gap-2 border-b border-border px-3 py-2 bg-muted/30">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={msgQuery}
                    onChange={(e) => setMsgQuery(e.target.value)}
                    placeholder="ابحث في رسائل هذه المحادثة…"
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                  />
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={msgSearchAttachOnly} onChange={(e) => setMsgSearchAttachOnly(e.target.checked)} className="h-3 w-3" />
                    المرفقات فقط
                  </label>
                  {(msgQuery || msgSearchAttachOnly) && (
                    <button onClick={() => { setMsgQuery(""); setMsgSearchAttachOnly(false); }} className="text-[10px] text-primary font-bold">مسح</button>
                  )}
                  {(msgQuery || msgSearchAttachOnly) && (
                    <span className="text-[10px] text-muted-foreground">{filteredMessages.length} نتيجة</span>
                  )}
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                  {filteredMessages.map((m) => {
                    const mine = m.sender_id === user.id;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          {m.attachment_url && (
                            <AttachmentPreview path={m.attachment_url} type={m.attachment_type} mine={mine} />
                          )}
                          {m.content && <div className="whitespace-pre-wrap break-words">{highlightText(m.content, msgQuery)}</div>}
                          {mine && (
                            <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-80">
                              <span>{new Date(m.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</span>
                              {myPrefs.hide_read_receipts ? null : (
                                m.read_at ? <CheckCheck className="h-3 w-3 text-sky-300" /> : <Check className="h-3 w-3" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {typing && (
                    <div className="text-[11px] text-muted-foreground italic">يكتب الآن…</div>
                  )}
                </div>
                {isBlocked ? (
                  <div className="border-t border-border bg-rose-500/5 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <ShieldOff className="h-5 w-5 text-rose-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-extrabold text-rose-700 dark:text-rose-400">المراسلة محظورة</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          لقد حظرت هذا المستخدم — لا يمكن إرسال أو استقبال أي رسائل بينكما. هذا الإجراء يحميك من التحرش والرسائل غير المرغوبة.
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <button onClick={() => doBlock(otherId!, false)} className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">
                            إلغاء الحظر واستئناف المراسلة
                          </button>
                          <Link to="/support" className="rounded-xl border border-border bg-background px-3 py-2 text-center text-xs font-bold hover:bg-muted inline-flex items-center justify-center gap-1.5">
                            <LifeBuoy className="h-3.5 w-3.5" />
                            التواصل عبر دعم المنصة
                          </Link>
                        </div>
                        <p className="mt-2 text-[10px] text-muted-foreground">
                          بديل: يمكنك الإبلاغ عن أي مشكلة بدلاً من إلغاء الحظر، وسيتولى فريق الإدارة التواصل نيابةً عنك.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-border p-3 space-y-2">
                    {pendingFile && (
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-2 text-xs">
                        {pendingPreview
                          ? <img src={pendingPreview} alt="" className="h-12 w-12 rounded object-cover" />
                          : <div className="grid h-12 w-12 place-items-center rounded bg-background"><FileText className="h-5 w-5" /></div>}
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-bold">{pendingFile.name}</div>
                          <div className="text-[10px] text-muted-foreground">{(pendingFile.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <button onClick={() => pickFile(null)} className="rounded-full p-1 hover:bg-background" title="إزالة">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2 items-center">
                      {quickReplies.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="rounded-full p-2 hover:bg-muted" title="ردود سريعة">
                            <Zap className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="max-w-xs">
                            {quickReplies.map((q) => (
                              <DropdownMenuItem key={q.id} onClick={() => setText(q.body)}>
                                <span className="font-bold text-xs">{q.title}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <label className="rounded-full p-2 hover:bg-muted cursor-pointer" title="إرفاق صورة أو ملف">
                        <Paperclip className="h-4 w-4" />
                        <input type="file" className="hidden" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                          onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                      </label>
                      <input
                        value={text}
                        onChange={(e) => onTextChange(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder={pendingFile ? "أضف تعليقًا (اختياري)…" : "اكتب رسالة..."}
                        className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
                        maxLength={5000}
                      />
                      <button onClick={handleSend} disabled={sending || uploading || (!text.trim() && !pendingFile)} className="rounded-full bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
                        {sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} onSubmit={doReport} />
    </div>
  );
}

function formatLastSeen(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "متصل الآن";
  if (diff < 3600_000) return `قبل ${Math.floor(diff / 60_000)} دقيقة`;
  if (diff < 86400_000) return `قبل ${Math.floor(diff / 3600_000)} ساعة`;
  return new Date(iso).toLocaleString("ar");
}

function AttachmentPreview({ path, type, mine }: { path: string; type: string | null; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    supabase.storage.from("message-attachments").createSignedUrl(path, 3600)
      .then(({ data }) => { if (alive) setUrl(data?.signedUrl ?? null); });
    return () => { alive = false; };
  }, [path]);
  const isImage = (type || "").startsWith("image/");
  if (isImage) {
    return url ? (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img src={url} alt="" className="mb-1 max-h-60 max-w-full rounded-lg object-cover" />
      </a>
    ) : <div className="mb-1 h-32 w-48 rounded-lg bg-black/10 animate-pulse" />;
  }
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className={`mb-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs underline ${mine ? "bg-primary-foreground/10" : "bg-background"}`}>
      <FileText className="h-3.5 w-3.5" /> فتح الملف
    </a>
  ) : <div className="mb-1 inline-flex items-center gap-1 text-xs opacity-70"><Loader2 className="h-3 w-3 animate-spin" /> …</div>;
}

function ReportDialog({ open, onOpenChange, onSubmit }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  onSubmit: (reason: string, notes: string) => Promise<void> | void;
}) {
  const [reason, setReason] = useState("harassment");
  const [notes, setNotes] = useState("");
  const REASONS = [
    { v: "harassment", l: "تحرّش أو إساءة" },
    { v: "scam", l: "احتيال" },
    { v: "spam", l: "سبام / إعلانات مزعجة" },
    { v: "inappropriate", l: "محتوى غير لائق" },
    { v: "other", l: "سبب آخر" },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>الإبلاغ عن المحادثة</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            {REASONS.map((r) => (
              <label key={r.v} className={`flex items-center gap-2 rounded-lg border p-2 text-sm cursor-pointer ${reason === r.v ? "border-primary bg-primary/5" : "border-border"}`}>
                <input type="radio" name="reason" value={r.v} checked={reason === r.v} onChange={() => setReason(r.v)} />
                {r.l}
              </label>
            ))}
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="تفاصيل إضافية (اختياري)…" rows={3} maxLength={1000}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <DialogFooter>
          <button onClick={() => onSubmit(reason, notes)} className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white">
            <Flag className="h-4 w-4" /> إرسال البلاغ
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuickRepliesManager({ items, onSave, onDelete }: {
  items: QR[];
  onSave: (d: { id?: string; title: string; body: string; sortOrder?: number }) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const reset = () => { setTitle(""); setBody(""); };
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-bold hover:bg-muted/70">
          <Zap className="h-3.5 w-3.5" /> ردود سريعة ({items.length})
        </button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>إدارة الردود السريعة</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">لا توجد قوالب بعد</p>}
            {items.map((q) => (
              <div key={q.id} className="rounded-lg border border-border p-3 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{q.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{q.body}</div>
                </div>
                <button onClick={() => onDelete(q.id)} className="text-destructive p-1 hover:bg-destructive/10 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم القالب (مثال: شكراً)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" maxLength={80} />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="نص الرد..." rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" maxLength={2000} />
          </div>
        </div>
        <DialogFooter>
          <button onClick={async () => { if (!title.trim() || !body.trim()) return; await onSave({ title: title.trim(), body: body.trim() }); reset(); }} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            <Plus className="h-4 w-4" /> إضافة قالب
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
