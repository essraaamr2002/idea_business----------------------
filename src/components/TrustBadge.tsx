import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string | null>();

export function TrustBadge({ userId, compact = false }: { userId?: string | null; compact?: boolean }) {
  const [level, setLevel] = useState<string | null>(userId ? cache.get(userId) ?? null : null);

  useEffect(() => {
    if (!userId || cache.has(userId)) return;
    let cancelled = false;
    (supabase.from("user_trust_stats") as any)
      .select("trust_level")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }: any) => {
        const v = data?.trust_level ?? null;
        cache.set(userId, v);
        if (!cancelled) setLevel(v);
      });
    return () => { cancelled = true; };
  }, [userId]);

  if (level !== "trusted") return null;
  if (compact) {
    return (
      <span title="مستثمر موثوق" className="inline-flex items-center justify-center rounded-full bg-emerald-500/15 p-0.5 text-emerald-500">
        <ShieldCheck className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
      <ShieldCheck className="h-3 w-3" /> موثوق
    </span>
  );
}
