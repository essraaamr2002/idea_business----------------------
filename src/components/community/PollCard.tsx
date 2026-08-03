import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { votePoll } from "@/lib/community-extras.functions";
import { useAuth } from "@/hooks/useAuth";
import { Check, Clock } from "lucide-react";
import { toast } from "sonner";

type Poll = { id: string; question: string; multi: boolean; expires_at: string | null };
type Option = { id: string; label: string; votes_count: number; position: number };

export function PollCard({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const vote = useServerFn(votePoll);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: pr } = await supabase.from("community_polls" as any).select("id,question,multi,expires_at").eq("post_id", postId).maybeSingle();
      if (!mounted || !pr) return;
      setPoll(pr as any);
      const { data: opts } = await supabase.from("community_poll_options" as any).select("id,label,votes_count,position").eq("poll_id", (pr as any).id).order("position");
      setOptions((opts as any[]) ?? []);
      if (user) {
        const { data: votes } = await supabase.from("community_poll_votes" as any).select("option_id").eq("poll_id", (pr as any).id).eq("user_id", user.id);
        const set = new Set((votes as any[] ?? []).map((v) => v.option_id));
        setMyVotes(set); setPicked(set);
      }
    })();
    return () => { mounted = false; };
  }, [postId, user]);

  if (!poll) return null;

  const total = options.reduce((s, o) => s + o.votes_count, 0);
  const closed = poll.expires_at && new Date(poll.expires_at).getTime() < Date.now();
  const hasVoted = myVotes.size > 0;
  const showResults = hasVoted || closed;

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (poll.multi) next.has(id) ? next.delete(id) : next.add(id);
    else { next.clear(); next.add(id); }
    setPicked(next);
  };

  const submit = async () => {
    if (!user) { toast.info("سجّل دخولك للتصويت"); return; }
    if (!picked.size) return;
    setSubmitting(true);
    try {
      await vote({ data: { pollId: poll.id, optionIds: Array.from(picked) } });
      setMyVotes(new Set(picked));
      const delta: Record<string, number> = {};
      picked.forEach((id) => { delta[id] = (delta[id] ?? 0) + 1; });
      myVotes.forEach((id) => { if (!picked.has(id)) delta[id] = (delta[id] ?? 0) - 1; });
      setOptions((prev) => prev.map((o) => ({ ...o, votes_count: Math.max(0, o.votes_count + (delta[o.id] ?? 0)) })));
      toast.success("تم تسجيل صوتك");
    } catch (e: any) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="mt-2 rounded-xl border border-border bg-card/60 p-3">
      <div className="mb-2 text-sm font-extrabold">{poll.question}</div>
      <div className="space-y-1.5">
        {options.map((o) => {
          const pct = total ? Math.round((o.votes_count / total) * 100) : 0;
          const mine = picked.has(o.id);
          return (
            <button
              key={o.id}
              onClick={() => !showResults && toggle(o.id)}
              disabled={showResults || !!closed}
              className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-right text-xs font-bold transition-all
                ${showResults ? "border-border bg-card cursor-default" : mine ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
            >
              {showResults && (
                <div className="absolute inset-y-0 right-0 bg-primary/15" style={{ width: `${pct}%` }} />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  {(mine || myVotes.has(o.id)) && <Check className="h-3 w-3 text-primary" />}
                  {o.label}
                </span>
                {showResults && <span className="num text-[11px] text-muted-foreground">{pct}% · {o.votes_count}</span>}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="num">{total} صوت</span>
        {poll.expires_at && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {closed ? "انتهى" : `ينتهي ${new Date(poll.expires_at).toLocaleString("ar")}`}
          </span>
        )}
        {!showResults && (
          <button onClick={submit} disabled={!picked.size || submitting}
            className="rounded-full bg-primary px-3 py-1 text-[11px] font-extrabold text-primary-foreground disabled:opacity-50">
            صوّت
          </button>
        )}
      </div>
    </div>
  );
}
