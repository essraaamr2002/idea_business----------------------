import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { followUser, unfollowUser, getFollowState } from "@/lib/follow.functions";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  targetUserId: string;
  size?: "sm" | "md";
  showCount?: boolean;
  className?: string;
}

export function FollowButton({ targetUserId, size = "sm", showCount = false, className }: Props) {
  const { user } = useAuth();
  const follow = useServerFn(followUser);
  const unfollow = useServerFn(unfollowUser);
  const state = useServerFn(getFollowState);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);

  useEffect(() => {
    if (!user || user.id === targetUserId) return;
    let cancel = false;
    state({ data: { targetUserId } })
      .then((r) => {
        if (cancel) return;
        setFollowing(r.following);
        setFollowers(r.followers);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => { cancel = true; };
  }, [user?.id, targetUserId]);

  if (!user || user.id === targetUserId) return null;

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (following) {
        await unfollow({ data: { targetUserId } });
        setFollowing(false);
        setFollowers((c) => Math.max(0, c - 1));
        toast.success("تم إلغاء المتابعة");
      } else {
        await follow({ data: { targetUserId } });
        setFollowing(true);
        setFollowers((c) => c + 1);
        toast.success("تمت المتابعة");
      }
    } catch (err: any) {
      toast.error(err?.message || "تعذر التنفيذ");
    } finally {
      setBusy(false);
    }
  };

  const base = "inline-flex items-center gap-1.5 rounded-full font-bold transition disabled:opacity-50";
  const sized = size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm";
  const style = following
    ? "border border-border bg-muted text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
    : "bg-primary text-primary-foreground hover:opacity-90";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || !loaded}
      aria-pressed={following}
      aria-label={following ? "إلغاء المتابعة" : "متابعة"}
      className={`${base} ${sized} ${style} ${className ?? ""}`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
      <span>{following ? "متابَع" : "متابعة"}</span>
      {showCount && loaded && <span className="opacity-70">· {followers}</span>}
    </button>
  );
}
