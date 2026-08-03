import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { openConversation, sendQuickFirstMessage } from "@/lib/messages.functions";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  targetUserId: string;
  targetName?: string | null;
  className?: string;
  size?: "sm" | "md";
  label?: string;
  iconOnly?: boolean;
  /** If true (default), clicking opens an inline dialog to send the first message without navigating. */
  quick?: boolean;
}

/** Click-to-message a member. Default: inline quick-reply dialog. */
export function MessageButton({
  targetUserId, targetName, className, size = "sm",
  label = "مراسلة", iconOnly = false, quick = true,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const open = useServerFn(openConversation);
  const quickSend = useServerFn(sendQuickFirstMessage);
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [text, setText] = useState("");

  if (!user || user.id === targetUserId) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (quick) { setDialogOpen(true); return; }
    setBusy(true);
    try {
      const { conversationId } = await open({ data: { otherUserId: targetUserId } });
      navigate({ to: "/messages", search: { c: conversationId } });
    } catch (err: any) { toast.error(err?.message || "تعذر فتح المحادثة"); }
    finally { setBusy(false); }
  };

  const submitQuick = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      await quickSend({ data: { otherUserId: targetUserId, content: body } });
      setText(""); setDialogOpen(false);
      toast.success("تم إرسال الرسالة ✓");
    } catch (err: any) { toast.error(err?.message || "تعذر الإرسال"); }
    finally { setBusy(false); }
  };

  const base = "inline-flex items-center gap-1.5 rounded-full border border-border bg-background font-bold transition hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-50";
  const sized = size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm";

  return (
    <>
      <button type="button" onClick={handleClick} disabled={busy} aria-label={label} title={label} className={`${base} ${sized} ${className ?? ""}`}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
        {!iconOnly && <span>{label}</span>}
      </button>

      {dialogOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" dir="rtl" onClick={() => setDialogOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-black">مراسلة {targetName ? `: ${targetName}` : "العضو"}</h3>
              <button onClick={() => setDialogOpen(false)} className="rounded-full p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={5000}
              placeholder="اكتب رسالتك الأولى…"
              autoFocus
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={async () => {
                  setBusy(true);
                  try {
                    const { conversationId } = await open({ data: { otherUserId: targetUserId } });
                    setDialogOpen(false);
                    navigate({ to: "/messages", search: { c: conversationId } });
                  } catch (err: any) { toast.error(err?.message || "تعذر الفتح"); }
                  finally { setBusy(false); }
                }}
                className="text-xs text-muted-foreground hover:text-primary underline"
              >
                فتح المحادثة الكاملة
              </button>
              <button
                type="button"
                onClick={submitQuick}
                disabled={busy || !text.trim()}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                إرسال
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
