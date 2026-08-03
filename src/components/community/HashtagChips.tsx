import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Hash, TrendingUp } from "lucide-react";

export function HashtagChips({ onPick }: { onPick?: (tag: string) => void }) {
  const [tags, setTags] = useState<Array<{ tag: string; post_count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("trending_hashtags" as any, { _limit: 12, _hours: 72 }).then(({ data }) => {
      setTags((data as any[]) ?? []); setLoading(false);
    });
  }, []);

  if (loading) return <div className="h-20 animate-pulse rounded-xl bg-muted/40" />;
  if (!tags.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-1.5 text-sm font-extrabold">
        <TrendingUp className="h-4 w-4 text-primary" /> هاشتاجات رائجة
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(({ tag, post_count }) => (
          <button
            key={tag}
            onClick={() => onPick?.(tag)}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
          >
            <Hash className="h-3 w-3" />
            {tag}
            <span className="num text-[10px] font-bold opacity-70">{post_count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#([\p{L}\p{N}_]+)/gu) ?? [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase()))).slice(0, 10);
}

export function HashtagText({ text }: { text: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+|@[\p{L}\p{N}_]+)/gu);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("#")) return <span key={i} className="font-bold text-primary">{p}</span>;
        if (p.startsWith("@")) return <span key={i} className="font-bold text-accent">{p}</span>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
