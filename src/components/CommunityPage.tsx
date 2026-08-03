// @ts-nocheck
import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { BadgeIcon, useUserBadge } from "@/components/badges/BadgeIcon";
import {
  Heart, MessageCircle, Repeat2, Send, Loader2, Sparkles,
  TrendingUp, Users, BadgeCheck, Gavel, FileText, HandCoins,
  ShoppingCart, Flame,
} from "lucide-react";
import { flagEmoji } from "@/lib/country-flag";
import { resolveStorageUrl } from "@/lib/storage-url";
import { MessageButton } from "@/components/MessageButton";

// Profile loading is shared with PlatformProjectsPage so behavior (telemetry,
// fallback stubs, RLS handling) stays consistent across every community
// surface — see src/lib/community-profiles.ts and the matching test in
// src/__tests__/community-profiles.test.ts.
import {
  fetchPublicProfiles as fetchProfiles,
  attachPublicProfiles as attachProfilesShared,
} from "@/lib/community-profiles";


// ============================================================
// المجتمع الموحّد — IDEA BUSINESS
// تبويبات: المنشورات · المزايدات · المناقصات · عروض مباشرة · شراء مباشر
// كل عنصر يحمل: صورة، اسم/كنية، جنسية، نبذة، حلقة خضراء للموثّقين، إعجاب/تعليق
// ============================================================

type Profile = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  alias_name?: string | null;
  use_alias_default?: boolean | null;
  avatar_url?: string | null;
  verified_green?: boolean | null;
  verified_blue?: boolean | null;
  nationality?: string | null;
  country?: string | null;
  bio?: string | null;
  business_bio?: string | null;
  legal_full_name?: string | null;
  reputation_score?: number | null;
};


type Post = {
  id: string;
  user_id: string;
  content: string;
  category?: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  created_at: string;
  repost_of?: string | null;
  quote_content?: string | null;
  linked_project_id?: string | null;
  profiles?: Profile | null;
  _liked?: boolean;
  _reposted?: boolean;
};

const PROFILE_COLS =
  "id,username,display_name,alias_name,use_alias_default,avatar_url,verified_green,verified_blue,nationality,country,bio,business_bio,legal_full_name,reputation_score";

async function attachProfiles<T extends Record<string, any>>(
  rows: T[],
  idKey: string,
  outKey: string = "profiles",
): Promise<T[]> {
  return attachProfilesShared(rows, idKey, outKey, "community");
}


function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

function displayNameOf(p?: Profile | null) {
  if (!p) return "مستخدم";
  if (p.use_alias_default && p.alias_name) return p.alias_name;
  // Prefer legal full name from KYC for verified members
  if (p.verified_green && p.legal_full_name) return p.legal_full_name;
  return p.display_name || p.alias_name || p.username || "مستخدم";
}

function Avatar({ profile, size = 44 }: { profile?: Profile | null; size?: number }) {
  const name = displayNameOf(profile);
  const ch = (name.trim()[0] || "؟").toUpperCase();
  const verified = !!profile?.verified_green;
  const [broken, setBroken] = useState(false);
  const ringClass = verified
    ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background"
    : "ring-1 ring-border";
  const inner = (
    <div className="relative shrink-0">
      {profile?.avatar_url && !broken ? (
        <img
          src={resolveStorageUrl(profile.avatar_url)}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          style={{ width: size, height: size }}
          className={`rounded-full object-cover bg-muted ${ringClass}`}
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className={`flex items-center justify-center rounded-full bg-primary/10 font-bold text-primary ${ringClass}`}
        >
          {ch}
        </div>
      )}
      {verified && (
        <span className="absolute -bottom-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
          <BadgeCheck className="h-3 w-3" />
        </span>
      )}
    </div>
  );
  if (profile?.id) {
    return (
      <Link to="/u/$username" params={{ username: profile.id }} title={`زيارة ملف ${name}`} className="hover:opacity-90 transition-opacity">
        {inner}
      </Link>
    );
  }
  return inner;
}


function CommentAuthorName({ profile }: { profile?: Profile | null }) {
  const badge = useUserBadge(profile?.id);
  return (
    <>
      <span>{displayNameOf(profile)}</span>
      <BadgeIcon badge={badge} size={12} />
    </>
  );
}

function UserMeta({ profile }: { profile?: Profile | null }) {
  const name = displayNameOf(profile);
  const handle = profile?.username ? `@${profile.username}` : "";
  const country = profile?.nationality || profile?.country;
  const flag = flagEmoji(country);
  const score = Number(profile?.reputation_score ?? 0);
  const bio = profile?.business_bio || profile?.bio;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold">
        {profile?.id ? (
          <Link to="/u/$username" params={{ username: profile.id }} className="truncate hover:underline">
            {name}
          </Link>
        ) : (
          <span className="truncate">{name}</span>
        )}
        <BadgeIcon badge={useUserBadge(profile?.id)} size={14} />


        {flag && (
          <span title={country || ""} aria-label={country || ""} className="text-base leading-none">
            {flag}
          </span>
        )}
        {profile?.verified_green && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
            <BadgeCheck className="h-3 w-3" /> موثّق
          </span>
        )}
        {score > 0 && (
          <span
            title="نقاط التفاعل"
            className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600"
          >
            <Flame className="h-3 w-3" /> {score.toLocaleString("ar")}
          </span>
        )}
        {handle && <span className="font-normal text-muted-foreground">{handle}</span>}
      </div>
      {bio && (
        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{bio}</p>
      )}
    </div>
  );
}


// ===== Composer =====
function Composer({ onPosted }: { onPosted: () => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card/60 p-6 text-center">
        <p className="text-sm text-muted-foreground">سجّل الدخول للنشر والتفاعل</p>
        <Link
          to="/auth"
          className="mt-3 inline-block rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground"
        >
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  const submit = async () => {
    if (!content.trim() || busy) return;
    setBusy(true);
    const { error } = await supabase.from("community_posts").insert({
      user_id: user.id,
      content: content.trim(),
      status: "published",
      category: "general",
    });
    setBusy(false);
    if (error) return toast.error(error.message || "تعذّر النشر");
    setContent("");
    toast.success("تم النشر");
    onPosted();
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex gap-3">
        <Avatar profile={{ id: user.id, display_name: user.email || "" } as any} />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="ما الفرصة التي تشاركها اليوم؟"
            dir="rtl"
            rows={3}
            maxLength={2000}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{content.length}/2000</span>
            <button
              onClick={submit}
              disabled={busy || !content.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-extrabold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              نشر
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Comments thread =====
function CommentsThread({ postId, onCount }: { postId: string; onCount: (n: number) => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("community_post_comments")
      .select(`id, content, created_at, user_id`)
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(50);
    const withProfiles = await attachProfiles((data ?? []) as any[], "user_id");
    setItems(withProfiles);
    onCount(withProfiles.length);
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!user) return toast.error("سجّل الدخول للتعليق");
    if (!text.trim() || busy) return;
    setBusy(true);
    const { error } = await supabase.from("community_post_comments").insert({
      post_id: postId, user_id: user.id, content: text.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setText("");
    load();
  };

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      {items.map((c) => (
        <div key={c.id} className="flex gap-2">
          <Avatar profile={c.profiles} size={32} />
          <div className="flex-1 rounded-xl bg-muted/40 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <CommentAuthorName profile={c.profiles} />
              {c.profiles?.verified_green && <BadgeCheck className="h-3 w-3 text-emerald-500" />}
              <span className="text-muted-foreground font-normal">· {timeAgo(c.created_at)}</span>
            </div>
            <p className="mt-0.5 text-sm text-foreground">{c.content}</p>
          </div>
        </div>
      ))}
      {user ? (
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب تعليقاً…"
            dir="rtl"
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={submit}
            disabled={busy || !text.trim()}
            className="rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            إرسال
          </button>
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/auth" className="font-bold text-primary">سجّل الدخول</Link> للتعليق
        </p>
      )}
    </div>
  );
}

// ===== Reusable Interaction Bar (likes + comments backed by community_posts) =====
function InteractionBar({
  postId, initialLikes, initialComments, initialReposts, initiallyLiked, initiallyReposted, onChange,
}: {
  postId: string;
  initialLikes: number; initialComments: number; initialReposts: number;
  initiallyLiked?: boolean; initiallyReposted?: boolean;
  onChange?: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [liked, setLiked] = useState(!!initiallyLiked);
  const [reposted, setReposted] = useState(!!initiallyReposted);
  const [likes, setLikes] = useState(initialLikes || 0);
  const [comments, setComments] = useState(initialComments || 0);
  const [reposts, setReposts] = useState(initialReposts || 0);

  const requireAuth = () => {
    if (!user) { toast.error("سجّل الدخول للتفاعل"); return false; }
    return true;
  };

  const toggleLike = async () => {
    if (!requireAuth()) return;
    const next = !liked;
    setLiked(next); setLikes((n) => n + (next ? 1 : -1));
    if (next) {
      const { error } = await supabase.from("community_post_likes")
        .insert({ post_id: postId, user_id: user!.id });
      if (error && !String(error.message).includes("duplicate")) {
        setLiked(false); setLikes((n) => n - 1); toast.error(error.message);
      }
    } else {
      await supabase.from("community_post_likes").delete()
        .eq("post_id", postId).eq("user_id", user!.id);
    }
    onChange?.();
  };

  const toggleRepost = async () => {
    if (!requireAuth()) return;
    if (reposted) {
      const { error } = await supabase.from("community_posts").delete()
        .eq("user_id", user!.id).eq("repost_of", postId).is("quote_content", null);
      if (error) return toast.error(error.message);
      setReposted(false); setReposts((n) => Math.max(0, n - 1));
      toast.success("تم الإلغاء");
    } else {
      const { error } = await supabase.from("community_posts").insert({
        user_id: user!.id, content: "", repost_of: postId,
        status: "published", category: "repost",
      });
      if (error) return toast.error(error.message);
      setReposted(true); setReposts((n) => n + 1);
      toast.success("بزنسها 🚀");
    }
    onChange?.();
  };

  return (
    <>
      <div className="flex items-center gap-1 border-t border-border pt-3">
        <button onClick={toggleLike}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition hover:bg-red-500/10 ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}>
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
          <span className="tabular-nums">{likes}</span>
        </button>
        <button onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
          <MessageCircle className="h-4 w-4" />
          <span className="tabular-nums">{comments}</span>
        </button>
        <button onClick={toggleRepost}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition hover:bg-emerald-500/10 ${reposted ? "text-emerald-500" : "text-muted-foreground hover:text-emerald-500"}`}>
          <Repeat2 className="h-4 w-4" />
          <span className="tabular-nums">{reposts}</span>
        </button>
      </div>
      {open && <CommentsThread postId={postId} onCount={setComments} />}
    </>
  );
}

// ===== Post Card =====
function PostCard({ post, onRefresh }: { post: Post; onRefresh: () => void }) {
  return (
    <article className="rounded-2xl border border-border bg-card/60 p-5 transition hover:border-primary/30">
      <header className="mb-3 flex items-start gap-3">
        <Avatar profile={post.profiles} />
        <UserMeta profile={post.profiles} />
        <span className="text-[11px] text-muted-foreground">{timeAgo(post.created_at)}</span>
        <MessageButton targetUserId={post.user_id} iconOnly className="ms-auto" />
      </header>

      {post.content && (
        <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{post.content}</p>
      )}
      <InteractionBar
        postId={post.id}
        initialLikes={post.likes_count}
        initialComments={post.comments_count}
        initialReposts={post.reposts_count}
        initiallyLiked={post._liked}
        initiallyReposted={post._reposted}
        onChange={onRefresh}
      />
    </article>
  );
}

// ===== Lazy interaction post for entities (auctions/tenders/offers/purchases) =====
// نخزن منشور جذري في community_posts لكل عنصر لربط الإعجاب والتعليق به.
async function ensureEntityPost(opts: {
  entity: "auction" | "tender" | "offer" | "purchase";
  entityId: string;
  ownerId: string;
  title: string;
  linkedProjectId?: string | null;
}): Promise<string | null> {
  const category = `entity_${opts.entity}_${opts.entityId}`;
  const { data: existing } = await supabase
    .from("community_posts")
    .select("id")
    .eq("category", category)
    .eq("user_id", opts.ownerId)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      user_id: opts.ownerId,
      content: opts.title,
      category,
      status: "published",
      linked_project_id: opts.linkedProjectId ?? null,
    })
    .select("id")
    .single();
  if (error) { toast.error(error.message); return null; }
  return data?.id ?? null;
}

function EntityCard({
  icon: Icon, badge, badgeColor, title, subtitle, owner, meta, href, entity, entityId, linkedProjectId,
}: {
  icon: any; badge: string; badgeColor: string;
  title: string; subtitle?: string;
  owner?: Profile | null;
  meta?: React.ReactNode;
  href?: string;
  entity: "auction" | "tender" | "offer" | "purchase";
  entityId: string;
  linkedProjectId?: string | null;
}) {
  const [postId, setPostId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const prepare = async () => {
    if (postId || !owner?.id) return postId;
    setBusy(true);
    const id = await ensureEntityPost({
      entity, entityId, ownerId: owner.id, title, linkedProjectId,
    });
    setBusy(false);
    if (id) setPostId(id);
    return id;
  };

  return (
    <article className="rounded-2xl border border-border bg-card/60 p-5 transition hover:border-primary/30">
      <header className="mb-3 flex items-start gap-3">
        <Avatar profile={owner} />
        <UserMeta profile={owner} />
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${badgeColor}`}>
          <Icon className="h-3 w-3" /> {badge}
        </span>
      </header>
      <h3 className="mb-1 text-base font-extrabold leading-snug text-foreground">{title}</h3>
      {subtitle && <p className="mb-2 text-sm text-muted-foreground">{subtitle}</p>}
      {meta && <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">{meta}</div>}
      {href && (
        <Link to={href as any}
          className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
          فتح التفاصيل ←
        </Link>
      )}
      {postId ? (
        <InteractionBar postId={postId} initialLikes={0} initialComments={0} initialReposts={0} />
      ) : (
        <button
          onClick={prepare}
          disabled={busy || !owner?.id}
          className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
          تفاعل وعلّق
        </button>
      )}
    </article>
  );
}

// ===== Tab data hooks =====
function usePostsFeed(tab: "foryou" | "trending" | "following", userId?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q: any = supabase
        .from("community_posts")
        .select(
          `id,user_id,content,category,likes_count,comments_count,reposts_count,created_at,repost_of,quote_content,linked_project_id`
        )
        .eq("status", "published")
        .not("category", "like", "entity_%")
        .limit(50);
      if (tab === "trending") q = q.order("likes_count", { ascending: false });
      else q = q.order("created_at", { ascending: false });
      if (tab === "following" && userId) {
        const { data: f } = await supabase
          .from("community_follows").select("following_id").eq("follower_id", userId);
        const ids = (f ?? []).map((r: any) => r.following_id);
        if (ids.length === 0) { setPosts([]); setLoading(false); return; }
        q = q.in("user_id", ids);
      }
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as Post[];
      if (userId && rows.length) {
        const ids = rows.map((r) => r.id);
        const [likesRes, repostsRes] = await Promise.all([
          supabase.from("community_post_likes").select("post_id")
            .eq("user_id", userId).in("post_id", ids),
          supabase.from("community_posts").select("repost_of")
            .eq("user_id", userId).is("quote_content", null).in("repost_of", ids),
        ]);
        const likedSet = new Set((likesRes.data ?? []).map((r: any) => r.post_id));
        const repostSet = new Set((repostsRes.data ?? []).map((r: any) => r.repost_of));
        rows = rows.map((r) => ({ ...r, _liked: likedSet.has(r.id), _reposted: repostSet.has(r.id) }));
      }
      rows = await attachProfiles(rows as any[], "user_id") as Post[];
      setPosts(rows);
    } catch (e: any) {
      toast.error(e.message || "تعذّر تحميل المنشورات");
    } finally { setLoading(false); }
  }, [tab, userId]);

  useEffect(() => { load(); }, [load]);
  return { posts, loading, reload: load };
}

function useAuctions() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("auctions")
      .select(`id,type,status,current_price,start_price,ends_at,project_id,owner_id, projects:project_id(name,ticker,sector)`)
      .in("status", ["live", "scheduled"])
      .order("created_at", { ascending: false }).limit(30);
    const withProfiles = await attachProfiles((data ?? []) as any[], "owner_id");
    setRows(withProfiles); setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { rows, loading, reload };
}

function useTenders() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("auctions")
      .select(`id,type,status,start_price,ends_at,project_id,owner_id, projects:project_id(name,ticker,sector)`)
      .eq("type", "sealed_bid").in("status", ["live", "scheduled"])
      .order("created_at", { ascending: false }).limit(30);
    const withProfiles = await attachProfiles((data ?? []) as any[], "owner_id");
    setRows(withProfiles); setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { rows, loading, reload };
}

function useOffers() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("investment_offers")
      .select(`id,amount,currency,shares,price_per_share,message,status,created_at,project_id,investor_id,owner_id, projects:project_id(name,ticker,sector)`)
      .eq("status", "pending")
      .order("created_at", { ascending: false }).limit(30);
    const withProfiles = await attachProfiles((data ?? []) as any[], "investor_id");
    setRows(withProfiles); setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { rows, loading, reload };
}

function usePurchases() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("project_purchase_requests")
      .select(`id,shares,price_per_share,total_amount,currency,message,status,created_at,project_id,buyer_id,owner_id, projects:project_id(name,ticker,sector)`)
      .eq("status", "pending")
      .order("created_at", { ascending: false }).limit(30);
    const withProfiles = await attachProfiles((data ?? []) as any[], "buyer_id");
    setRows(withProfiles); setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { rows, loading, reload };
}

// ===== Main page =====
type MainTab = "feed" | "auctions" | "tenders" | "offers" | "purchases";

export default function CommunityPage() {
  const { user } = useAuth();
  const [main, setMain] = useState<MainTab>("feed");
  const [sub, setSub] = useState<"foryou" | "trending" | "following">("foryou");

  const feed = usePostsFeed(sub, user?.id);
  const auctions = useAuctions();
  const tenders = useTenders();
  const offers = useOffers();
  const purchases = usePurchases();

  // realtime: posts feed + likes/comments counters
  useEffect(() => {
    const reload = () => feed.reload();
    const ch = supabase
      .channel("community_feed_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_post_likes" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_post_comments" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_post_reposts" }, reload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [feed.reload]);

  // realtime: offers + direct purchase requests
  useEffect(() => {
    const ch = supabase
      .channel("community_entities_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "investment_offers" }, () => offers.reload?.())
      .on("postgres_changes", { event: "*", schema: "public", table: "project_purchase_requests" }, () => purchases.reload?.())
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, () => { auctions.reload?.(); tenders.reload?.(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [offers.reload, purchases.reload, auctions.reload, tenders.reload]);

  const mainTabs: { key: MainTab; label: string; Icon: any }[] = [
    { key: "feed", label: "المنشورات", Icon: Sparkles },
    { key: "auctions", label: "المزايدات", Icon: Gavel },
    { key: "tenders", label: "المناقصات", Icon: FileText },
    { key: "offers", label: "عروض مباشرة", Icon: HandCoins },
    { key: "purchases", label: "شراء مباشر", Icon: ShoppingCart },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Main tabs */}
        <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card/60 p-1">
          {mainTabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setMain(key)}
              className={`flex flex-1 min-w-[110px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                main === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {main === "feed" && (
          <div className="space-y-4">
            <div className="flex gap-1 rounded-2xl border border-border bg-card/60 p-1">
              {([
                ["foryou", "لك", Sparkles],
                ["trending", "الأكثر تفاعلاً", TrendingUp],
                ["following", "متابَعون", Users],
              ] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setSub(key as any)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                    sub === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            <Composer onPosted={feed.reload} />

            {feed.loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : feed.posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
                <p className="text-sm text-muted-foreground">لا توجد منشورات بعد — كن أوّل من ينشر!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feed.posts.map((p) => (
                  <PostCard key={p.id} post={p} onRefresh={feed.reload} />
                ))}
              </div>
            )}
          </div>
        )}

        {main === "auctions" && (
          <ListSection loading={auctions.loading} empty="لا توجد مزايدات نشطة حالياً">
            {auctions.rows.map((a) => (
              <EntityCard
                key={a.id}
                entity="auction" entityId={a.id} linkedProjectId={a.project_id}
                icon={Gavel} badge={a.type === "sealed_bid" ? "مزاد مغلق" : "مزاد حي"}
                badgeColor="bg-amber-500/10 text-amber-600"
                title={a.projects?.name || "مشروع"}
                subtitle={a.projects?.sector ?? undefined}
                owner={a.profiles}
                href={`/projects/${a.project_id}`}
                meta={<>
                  {a.current_price != null && <span>السعر الحالي: {Number(a.current_price).toLocaleString()}</span>}
                  {a.ends_at && <span>· ينتهي: {new Date(a.ends_at).toLocaleDateString("ar")}</span>}
                </>}
              />
            ))}
          </ListSection>
        )}

        {main === "tenders" && (
          <ListSection loading={tenders.loading} empty="لا توجد مناقصات حالياً">
            {tenders.rows.map((t) => (
              <EntityCard
                key={t.id}
                entity="tender" entityId={t.id} linkedProjectId={t.project_id}
                icon={FileText} badge="مناقصة سرّية"
                badgeColor="bg-indigo-500/10 text-indigo-600"
                title={t.projects?.name || "مشروع"}
                subtitle={t.projects?.sector ?? undefined}
                owner={t.profiles}
                href={`/projects/${t.project_id}`}
                meta={<>
                  {t.start_price != null && <span>سعر الافتتاح: {Number(t.start_price).toLocaleString()}</span>}
                  {t.ends_at && <span>· ينتهي: {new Date(t.ends_at).toLocaleDateString("ar")}</span>}
                </>}
              />
            ))}
          </ListSection>
        )}

        {main === "offers" && (
          <ListSection loading={offers.loading} empty="لا توجد عروض مباشرة حالياً">
            {offers.rows.map((o) => (
              <EntityCard
                key={o.id}
                entity="offer" entityId={o.id} linkedProjectId={o.project_id}
                icon={HandCoins} badge="عرض مباشر"
                badgeColor="bg-emerald-500/10 text-emerald-600"
                title={`عرض على ${o.projects?.name || "مشروع"}`}
                subtitle={o.message || undefined}
                owner={o.profiles}
                href={`/projects/${o.project_id}`}
                meta={<>
                  <span>القيمة: {Number(o.amount).toLocaleString()} {o.currency}</span>
                  {o.shares && <span>· {o.shares} سهم</span>}
                </>}
              />
            ))}
          </ListSection>
        )}

        {main === "purchases" && (
          <ListSection loading={purchases.loading} empty="لا توجد طلبات شراء مباشر">
            {purchases.rows.map((p) => (
              <EntityCard
                key={p.id}
                entity="purchase" entityId={p.id} linkedProjectId={p.project_id}
                icon={ShoppingCart} badge="شراء مباشر"
                badgeColor="bg-sky-500/10 text-sky-600"
                title={`طلب شراء في ${p.projects?.name || "مشروع"}`}
                subtitle={p.message || undefined}
                owner={p.profiles}
                href={`/projects/${p.project_id}`}
                meta={<>
                  <span>الإجمالي: {Number(p.total_amount).toLocaleString()} {p.currency}</span>
                  {p.shares && <span>· {p.shares} سهم</span>}
                </>}
              />
            ))}
          </ListSection>
        )}
      </main>
    </div>
  );
}

function ListSection({ loading, empty, children }: { loading: boolean; empty: string; children: any }) {
  const arr = Array.isArray(children) ? children : [children];
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!arr.length || arr.every((c: any) => !c)) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
        <p className="text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  }
  return <div className="space-y-4">{children}</div>;
}
