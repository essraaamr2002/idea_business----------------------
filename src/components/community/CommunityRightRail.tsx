import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HashtagChips } from "@/components/community/HashtagChips";
import { FollowButton } from "@/components/community/PostExtras";
import { resolveStorageUrl } from "@/lib/storage-url";

type Suggested = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  verified_blue: boolean | null;
  verified_green: boolean | null;
};

export function CommunityRightRail({
  currentUserId,
  followingIds,
  onPickHashtag,
}: {
  currentUserId?: string | null;
  followingIds?: Set<string>;
  onPickHashtag?: (t: string) => void;
}) {
  const [people, setPeople] = useState<Suggested[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    let active = true;
    supabase
      .from("profiles")
      .select("id,display_name,avatar_url,verified_blue,verified_green")
      .order("points", { ascending: false, nullsFirst: false })
      .limit(20)
      .then(({ data }) => {
        if (!active) return;
        const list = ((data as any[]) ?? []) as Suggested[];
        const filtered = list.filter(
          (p) => p.id !== currentUserId && !(followingIds?.has(p.id) ?? false),
        );
        setPeople(filtered.slice(0, 5));
      });
    return () => { active = false; };
  }, [currentUserId, followingIds]);

  return (
    <aside className="sticky top-20 hidden h-fit w-full max-w-[320px] shrink-0 space-y-4 xl:block">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث في المجتمع"
          className="h-11 w-full rounded-full border border-white/10 bg-slate-900/60 px-4 pe-10 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
        />
      </div>

      {/* Trending hashtags */}
      <HashtagChips onPick={onPickHashtag} />

      {/* Who to follow */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="mb-3 text-sm font-extrabold">من تتابع</div>
        {people.length === 0 && (
          <div className="text-xs text-slate-400">لا توجد اقتراحات حالياً.</div>
        )}
        <ul className="space-y-3">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <Link to="/u/$username" params={{ username: p.id } as any}
                className="shrink-0">
                <div className="h-10 w-10 overflow-hidden rounded-full bg-slate-800">
                  {p.avatar_url
                    ? <img src={resolveStorageUrl(p.avatar_url)} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}} />
                    : <div className="grid h-full w-full place-items-center text-xs font-bold text-slate-400">
                        {(p.display_name ?? "?").slice(0, 1)}
                      </div>}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 truncate text-sm font-bold text-slate-100">
                  <span className="truncate">{p.display_name ?? "عضو"}</span>
                  {(p.verified_blue || p.verified_green) && (
                    <BadgeCheck className={`h-4 w-4 shrink-0 ${p.verified_blue ? "text-sky-400" : "text-emerald-400"}`} />
                  )}
                </div>
                <div className="text-xs text-slate-500">@{p.id.slice(0, 8)}</div>
              </div>
              <FollowButton targetId={p.id} initial={false} />
            </li>
          ))}
        </ul>
      </div>

      <div className="px-3 text-[11px] text-slate-500">
        © {new Date().getFullYear()} busniss.org · شروط · خصوصية
      </div>
    </aside>
  );
}
