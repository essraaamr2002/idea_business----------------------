import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BadgeCode = "BIRD" | "DEER" | "LION";

const BADGE_MAP: Record<BadgeCode, { emoji: string; label: string; color: string; description: string }> = {
  BIRD: { emoji: "🪿", label: "الطير", color: "#60A5FA", description: "عضو نشط في المجتمع" },
  DEER: { emoji: "🦌", label: "الغزال", color: "#D4A574", description: "صاحب مشروع جاذب" },
  LION: { emoji: "🦁", label: "الأسد", color: "#E0A63A", description: "مستثمر سخي هادئ" },
};

interface Props {
  badge?: BadgeCode | null;
  size?: number;
  showLabel?: boolean;
}

export function BadgeIcon({ badge, size = 16, showLabel = false }: Props) {
  if (!badge || !BADGE_MAP[badge]) return null;
  const cfg = BADGE_MAP[badge];
  return (
    <span
      title={`${cfg.label} — ${cfg.description}`}
      className="inline-flex items-center gap-1 align-middle"
      style={{ fontSize: size }}
    >
      <span aria-label={cfg.label}>{cfg.emoji}</span>
      {showLabel && (
        <span className="text-xs font-medium" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      )}
    </span>
  );
}

/** Fetches badge for a specific user (cached in-memory per session) */
const cache = new Map<string, BadgeCode | null>();

export function useUserBadge(userId?: string | null) {
  const [badge, setBadge] = useState<BadgeCode | null>(userId ? cache.get(userId) ?? null : null);

  useEffect(() => {
    if (!userId) return;
    if (cache.has(userId)) {
      setBadge(cache.get(userId) ?? null);
      return;
    }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("user_badges")
        .select("badges(code)")
        .eq("user_id", userId)
        .maybeSingle();
      const code = (data?.badges as any)?.code as BadgeCode | undefined;
      cache.set(userId, code ?? null);
      if (alive) setBadge(code ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  return badge;
}

/** Convenience: name + badge inline */
export function MemberNameBadge({ userId, name, size = 14 }: { userId?: string | null; name: string; size?: number }) {
  const badge = useUserBadge(userId);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{name}</span>
      <BadgeIcon badge={badge} size={size} />
    </span>
  );
}
