import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleSectorFollow, listMySectorFollows } from "@/lib/project-intel.functions";
import { useAuth } from "@/hooks/useAuth";

export function FollowSectorButton({ sector }: { sector?: string | null }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const toggle = useServerFn(toggleSectorFollow);
  const listFn = useServerFn(listMySectorFollows);

  useEffect(() => {
    if (!user || !sector) return;
    listFn().then((arr) => setFollowing(arr.includes(sector))).catch(() => {});
  }, [user?.id, sector, listFn]);

  if (!sector || !user) return null;

  const onClick = async () => {
    setLoading(true);
    try {
      await toggle({ data: { sector, follow: !following } });
      setFollowing((x) => !x);
      toast.success(following ? "تم إلغاء متابعة القطاع" : `ستصلك إشعارات عن قطاع ${sector}`);
    } catch (e: any) {
      toast.error(e.message || "تعذّر التحديث");
    } finally { setLoading(false); }
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${following ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : (following ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />)}
      {following ? "تتابع قطاع " + sector : "تابع قطاع " + sector}
    </button>
  );
}
