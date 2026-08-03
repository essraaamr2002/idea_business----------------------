import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toggleReaction } from "@/lib/community-extras.functions";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const KINDS = [
  { k: "like", e: "❤️", label: "إعجاب" },
  { k: "fire", e: "🔥", label: "إشعال" },
  { k: "clap", e: "👏", label: "تصفيق" },
  { k: "idea", e: "💡", label: "فكرة" },
  { k: "handshake", e: "🤝", label: "مصافحة" },
] as const;

type Counts = Partial<Record<typeof KINDS[number]["k"], number>>;

export function ReactionsBar({
  postId, counts, mine,
}: {
  postId: string;
  counts: Counts;
  mine: Set<string>;
}) {
  const { user } = useAuth();
  const toggle = useServerFn(toggleReaction);
  const [local, setLocal] = useState<{ counts: Counts; mine: Set<string> }>({ counts: { ...counts }, mine: new Set(mine) });
  const [busy, setBusy] = useState<string | null>(null);

  const press = async (kind: typeof KINDS[number]["k"]) => {
    if (!user) { toast.info("سجّل دخولك للتفاعل"); return; }
    setBusy(kind);
    const wasActive = local.mine.has(kind);
    const nextMine = new Set(local.mine);
    const nextCounts: Counts = { ...local.counts };
    if (wasActive) { nextMine.delete(kind); nextCounts[kind] = Math.max(0, (nextCounts[kind] ?? 1) - 1); }
    else { nextMine.add(kind); nextCounts[kind] = (nextCounts[kind] ?? 0) + 1; }
    setLocal({ counts: nextCounts, mine: nextMine });
    try { await toggle({ data: { postId, kind } }); }
    catch (e: any) { toast.error(e.message || "فشل التفاعل"); setLocal({ counts, mine: new Set(mine) }); }
    finally { setBusy(null); }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {KINDS.map(({ k, e, label }) => {
        const active = local.mine.has(k);
        const n = local.counts[k] ?? 0;
        return (
          <button
            key={k}
            disabled={busy === k}
            onClick={() => press(k)}
            title={label}
            className={`group inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold transition-all active:scale-95
              ${active ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"}`}
            aria-pressed={active}
          >
            <span className="text-sm transition-transform group-hover:scale-110">{e}</span>
            {n > 0 && <span className="num">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}
