import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function WatchlistButton({
  projectId,
  initialWatching,
  size = "sm",
  variant = "outline",
  compact = false,
}: {
  projectId: string;
  initialWatching?: boolean;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "outline" | "ghost" | "default" | "secondary";
  compact?: boolean;
}) {
  const { user } = useAuth();
  const [watching, setWatching] = useState(!!initialWatching);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(initialWatching !== undefined);

  useEffect(() => {
    if (!user || loaded) return;
    let live = true;
    supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (live) {
          setWatching(!!data);
          setLoaded(true);
        }
      });
    return () => {
      live = false;
    };
  }, [user?.id, projectId, loaded]);

  const toggle = async () => {
    if (!user) return toast.error("سجّل الدخول لإضافة المشروع للمراقبة");
    if (busy) return;
    setBusy(true);
    const prev = watching;
    setWatching(!prev);
    try {
      if (prev) {
        await supabase.from("watchlist").delete().eq("user_id", user.id).eq("project_id", projectId);
        toast.success("أُزيل من المراقبة");
      } else {
        const { error } = await supabase.from("watchlist").insert({ user_id: user.id, project_id: projectId });
        if (error && !String(error.message).includes("duplicate")) throw error;
        toast.success("أُضيف إلى المراقبة");
      }
    } catch (e: any) {
      setWatching(prev);
      toast.error(e?.message || "تعذّر التحديث");
    } finally {
      setBusy(false);
    }
  };

  const Icon = busy ? Loader2 : watching ? BookmarkCheck : Bookmark;
  return (
    <Button variant={variant} size={size} onClick={toggle} aria-label="إضافة للمراقبة" className={watching ? "text-primary" : ""}>
      <Icon className={`h-4 w-4 ${busy ? "animate-spin" : ""} ${compact ? "" : "ms-1"}`} />
      {!compact && (watching ? "في المراقبة" : "مراقبة")}
    </Button>
  );
}
