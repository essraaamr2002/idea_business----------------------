import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, BookmarkCheck, Pin, Share2, UserPlus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import {
  toggleBookmark, togglePinPost, followUser, bumpShare,
} from "@/lib/community-extras.functions";
import { useAuth } from "@/hooks/useAuth";

export function BookmarkButton({ postId, initial }: { postId: string; initial: boolean }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(initial);
  const fn = useServerFn(toggleBookmark);
  return (
    <button
      onClick={async () => {
        if (!user) { toast.info("سجّل دخولك للحفظ"); return; }
        setSaved(!saved);
        try { const r = await fn({ data: { postId } }); setSaved(r.saved); toast.success(r.saved ? "تم الحفظ" : "أُزيل من المحفوظات"); }
        catch (e: any) { setSaved(saved); toast.error(e.message); }
      }}
      title={saved ? "محفوظ" : "حفظ"}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold transition-colors ${
        saved ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:bg-muted"
      }`}
    >
      {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
    </button>
  );
}

export function PinButton({ postId, isOwner, initial }: { postId: string; isOwner: boolean; initial: boolean }) {
  const [pinned, setPinned] = useState(initial);
  const fn = useServerFn(togglePinPost);
  if (!isOwner) return pinned ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
      <Pin className="h-3 w-3" /> مثبَّت
    </span>
  ) : null;
  return (
    <button
      onClick={async () => {
        try { const r = await fn({ data: { postId } }); setPinned(r.pinned); toast.success(r.pinned ? "تم التثبيت" : "أُلغي التثبيت"); }
        catch (e: any) { toast.error(e.message); }
      }}
      title={pinned ? "إلغاء التثبيت" : "تثبيت في ملفك"}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold transition-colors ${
        pinned ? "border-amber-500/40 bg-amber-500/10 text-amber-600" : "border-border hover:bg-muted"
      }`}
    >
      <Pin className="h-3.5 w-3.5" />
    </button>
  );
}

export function FollowButton({ targetId, initial }: { targetId: string; initial: boolean }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(initial);
  const fn = useServerFn(followUser);
  if (!user || user.id === targetId) return null;
  return (
    <button
      onClick={async () => {
        const next = !following;
        setFollowing(next);
        try { await fn({ data: { targetId, follow: next } }); }
        catch (e: any) { setFollowing(!next); toast.error(e.message); }
      }}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-colors ${
        following ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
      }`}
    >
      {following ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
      {following ? "تتابعه" : "متابعة"}
    </button>
  );
}

export function ShareButton({ postId, initialCount }: { postId: string; initialCount: number }) {
  const [n, setN] = useState(initialCount);
  const fn = useServerFn(bumpShare);
  return (
    <button
      onClick={async () => {
        const url = `${window.location.origin}/community#post-${postId}`;
        try {
          if (navigator.share) await navigator.share({ url, title: "بزنسة من IDEA BUSINESS" });
          else { await navigator.clipboard.writeText(url); toast.success("تم نسخ الرابط"); }
          setN(n + 1);
          await fn({ data: { postId } });
        } catch { /* user cancelled */ }
      }}
      title="مشاركة"
      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs font-bold hover:bg-muted"
    >
      <Share2 className="h-3.5 w-3.5" />
      {n > 0 && <span className="num">{n}</span>}
    </button>
  );
}
