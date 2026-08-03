// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { placeBid } from "@/lib/auctions.functions";
import { ensurePlatformEntityPost } from "@/lib/community-posts.functions";
import { createInvestmentOffer, createProjectPurchaseRequest } from "@/lib/investment-offers.functions";
import { bumpMyProject } from "@/lib/founder-dashboard.functions";
import { checkSeriousnessDeposit } from "@/lib/seriousness-deposit.functions";
import { getFeedAds } from "@/lib/ads.functions";
import { AdCard } from "@/components/ads/AdCard";
import { AdsDashboard } from "@/components/AdsDashboard";
import { BrandedStripeCheckout } from "@/components/BrandedStripeCheckout";
import { Button } from "@/components/ui/button";
import { resolveStorageUrl } from "@/lib/storage-url";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { WatchlistButton } from "@/components/WatchlistButton";
import { ShareButtons } from "@/components/ShareButtons";
import {
  BadgeCheck,
  BriefcaseBusiness,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  FileText,
  Filter,
  Flag,
  Gavel,
  Globe2,
  HandCoins,
  Heart,
  Layers,
  Loader2,
  MessageCircle,
  Megaphone,
  Menu,
  Plus,
  Pencil,
  RefreshCw,
  Repeat2,
  RotateCcw,
  Scale,
  Search,
  Send,
  ShoppingCart,
  Sparkles,
  Trash2,
  UserCircle2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ----- Hooks -----
function useDebounce<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

// ----- Skeletons -----
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-muted" />
          <div className="h-2 w-1/4 rounded bg-muted" />
        </div>
      </div>
      <div className="mb-3 h-40 w-full rounded-md bg-muted" />
      <div className="space-y-2">
        <div className="h-3 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon = Users, title, hint, action }: { icon?: any; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center sm:p-14">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary/10">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-black">{title}</h3>
      {hint && <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

type SectionKey = "feed" | "projects" | "auctions" | "tenders" | "offers" | "purchases" | "ads";

type Profile = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  alias_name?: string | null;
  use_alias_default?: boolean | null;
  avatar_url?: string | null;
  verified_green?: boolean | null;
  verified_blue?: boolean | null;
  membership?: string | null;
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
  linked_project_id?: string | null;
  profiles?: Profile | null;
  _liked?: boolean;
  _reposted?: boolean;
};

const PROFILE_COLS =
  "id,username,display_name,alias_name,use_alias_default,avatar_url,verified_green,verified_blue,membership,nationality,country,bio,business_bio,legal_full_name,reputation_score";


const SECTIONS: Array<{ key: SectionKey; label: string; hint: string; Icon: any }> = [
  { key: "feed", label: "المجتمع", hint: "بزنسة وتعليقات", Icon: Sparkles },
  { key: "projects", label: "المشاريع", hint: "مشاريع معروضة", Icon: BriefcaseBusiness },
  { key: "auctions", label: "المزايدات", hint: "حراج مباشر", Icon: Gavel },
  { key: "tenders", label: "المناقصات", hint: "عروض سرية", Icon: FileText },
  { key: "offers", label: "تقديم العروض", hint: "تفاوض مباشر", Icon: HandCoins },
  { key: "purchases", label: "الشراء المباشر", hint: "شراء أسهم", Icon: ShoppingCart },
  { key: "ads", label: "الإعلانات", hint: "أنشئ وأدر حملاتك", Icon: Megaphone },
];

const COUNTRY_FLAGS: Record<string, string> = {
  السعودية: "🇸🇦",
  "المملكة العربية السعودية": "🇸🇦",
  SA: "🇸🇦",
  KSA: "🇸🇦",
  الإمارات: "🇦🇪",
  "الإمارات العربية المتحدة": "🇦🇪",
  UAE: "🇦🇪",
  AE: "🇦🇪",
  الكويت: "🇰🇼",
  KW: "🇰🇼",
  قطر: "🇶🇦",
  QA: "🇶🇦",
  البحرين: "🇧🇭",
  BH: "🇧🇭",
  عمان: "🇴🇲",
  OM: "🇴🇲",
  مصر: "🇪🇬",
  EG: "🇪🇬",
  الأردن: "🇯🇴",
  JO: "🇯🇴",
  المغرب: "🇲🇦",
  MA: "🇲🇦",
  العراق: "🇮🇶",
  IQ: "🇮🇶",
  اليمن: "🇾🇪",
  YE: "🇾🇪",
};

function displayNameOf(p?: Profile | null) {
  if (!p) return "عضو";
  if (p.use_alias_default && p.alias_name) return p.alias_name;
  if (p.verified_green && p.legal_full_name) return p.legal_full_name;
  return p.display_name || p.alias_name || p.username || "عضو";
}


function countryFlag(country?: string | null) {
  if (!country) return null;
  const trimmed = country.trim();
  if (COUNTRY_FLAGS[trimmed]) return COUNTRY_FLAGS[trimmed];
  if (/^[A-Z]{2}$/i.test(trimmed)) {
    const code = trimmed.toUpperCase();
    return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
  }
  return "🏳️";
}

function timeAgo(iso?: string | null) {
  if (!iso) return "الآن";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "الآن";
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

function money(n: number, currency = "SAR") {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(n || 0));
}

function seriousnessFee(membership?: string | null) {
  const tier = String(membership || "basic").toLowerCase();
  if (tier === "platinum") return 1;
  if (tier === "gold") return 2.5;
  if (tier === "silver") return 4;
  return 5;
}

function isDepositError(message?: string) {
  return String(message || "").includes("seriousness_deposit_required");
}

function Avatar({ profile, size = 48 }: { profile?: Profile | null; size?: number }) {
  const name = displayNameOf(profile);
  const ch = (name.trim()[0] || "؟").toUpperCase();
  const [broken, setBroken] = useState(false);
  const inner = (
    <div className="relative shrink-0">
      {profile?.avatar_url && !broken ? (
        <img
          src={resolveStorageUrl(profile.avatar_url)}
          alt={name}
          style={{ width: size, height: size }}
          className={`rounded-full object-cover bg-muted ${profile?.verified_green ? "ring-2 ring-chart-3 ring-offset-2 ring-offset-background" : "ring-1 ring-border"}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className={`flex items-center justify-center rounded-full bg-secondary text-sm font-black text-secondary-foreground ${profile?.verified_green ? "ring-2 ring-chart-3 ring-offset-2 ring-offset-background" : "ring-1 ring-border"}`}
        >
          {ch}
        </div>
      )}
      {profile?.verified_green && (
        <span className="absolute -bottom-0.5 -end-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-chart-3 text-background shadow">
          <BadgeCheck className="h-3.5 w-3.5" />
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



function UserMeta({ profile, time }: { profile?: Profile | null; time?: string }) {
  const country = profile?.nationality || profile?.country;
  const flag = countryFlag(country);
  const bio = profile?.business_bio || profile?.bio;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-1.5 text-sm font-black">
        {profile?.id ? (
          <Link to="/u/$username" params={{ username: profile.id }} className="truncate hover:underline">
            {displayNameOf(profile)}
          </Link>
        ) : (
          <span className="truncate">{displayNameOf(profile)}</span>
        )}

        {flag && (
          <span title={country || ""} className="text-base leading-none">
            {flag}
          </span>
        )}
        {profile?.verified_green && (
          <span className="inline-flex items-center gap-1 rounded-md border border-chart-3/30 bg-chart-3/10 px-1.5 py-0.5 text-[10px] text-chart-3">
            <BadgeCheck className="h-3 w-3" /> موثّق
          </span>
        )}
        {Number(profile?.reputation_score ?? 0) > 0 && (
          <span
            title="نقاط التفاعل"
            className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600"
          >
            🔥 {Number(profile?.reputation_score).toLocaleString("ar")}
          </span>
        )}
        {profile?.username && <span className="text-xs font-semibold text-muted-foreground">@{profile.username}</span>}
        {time && <span className="text-[11px] font-medium text-muted-foreground">· {timeAgo(time)}</span>}
      </div>

      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {country && (
          <span className="inline-flex items-center gap-1">
            <Flag className="h-3 w-3" /> {country}
          </span>
        )}
        {bio && <span className="line-clamp-1">· {bio}</span>}
      </div>
    </div>
  );
}

async function profilesById(ids: Array<string | null | undefined>) {
  const clean = Array.from(new Set(ids.filter(Boolean))) as string[];
  if (!clean.length) return new Map<string, Profile>();
  // Use security-definer RPC so non-owners can read safe public profile fields
  // (avatar, display name, country, verification) even under strict RLS.
  try {
    const { data, error } = await supabase.rpc("get_public_profiles", { _ids: clean });
    if (error) {
      console.error("[profilesById] rpc error", error);
      const { reportClientEvent } = await import("@/lib/client-telemetry");
      reportClientEvent({
        source: "community-profiles-rpc",
        action: "rpc_error",
        ok: false,
        error: error.message,
        context: { surface: "platform-projects", requested: clean.length },
      });
      return new Map<string, Profile>();
    }
    return new Map((data ?? []).map((p: any) => [p.id, p as Profile]));
  } catch (e: any) {
    console.error("[profilesById] threw", e);
    const { reportClientEvent } = await import("@/lib/client-telemetry");
    reportClientEvent({
      source: "community-profiles-rpc",
      action: "exception",
      ok: false,
      error: String(e?.message ?? e),
      context: { surface: "platform-projects", requested: clean.length },
    });
    return new Map<string, Profile>();
  }
}

function Composer({ currentProfile, onPosted }: { currentProfile?: Profile | null; onPosted: () => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!content.trim() || busy) return;
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) {
        toast.error("انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى");
        return;
      }
      const { error } = await supabase.from("community_posts").insert({
        user_id: uid,
        content: content.trim(),
        status: "published",
        category: "general",
        post_type: "tweet",
      });
      if (error) {
        console.error("[community publish]", error);
        toast.error(error.message || "تعذّر النشر");
        return;
      }
      setContent("");
      toast.success("تم النشر");
      onPosted();
    } catch (e: any) {
      console.error("[community publish exception]", e);
      toast.error(e?.message || "تعذّر النشر");
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 text-center">
        <p className="text-sm text-muted-foreground">سجّل الدخول للنشر والتفاعل داخل مشاريع المنصة.</p>
        <Link to="/auth" className="mt-3 inline-flex rounded-md bg-primary px-5 py-2 text-sm font-black text-primary-foreground">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex gap-3">
        <Avatar profile={currentProfile || ({ id: user.id, display_name: user.email } as any)} />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="اكتب بزنسة، تعليق سوق، أو فرصة تبحث عنها…"
            dir="rtl"
            rows={3}
            maxLength={2000}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">{content.length}/2000</span>
            <button
              onClick={submit}
              disabled={busy || !content.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2 text-xs font-black text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
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

function CommentsThread({ postId, onCount }: { postId: string; onCount: (n: number) => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("community_post_comments")
      .select("id, content, created_at, user_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(80);
    const list = data ?? [];
    const profiles = await profilesById(list.map((r: any) => r.user_id));
    setItems(list.map((r: any) => ({ ...r, profiles: profiles.get(r.user_id) ?? null })));
    onCount(list.length);
  }, [postId, onCount]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user) return toast.error("سجّل الدخول للتعليق");
    if (!text.trim() || busy) return;
    setBusy(true);
    const { error } = await supabase.from("community_post_comments").insert({ post_id: postId, user_id: user.id, content: text.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    setText("");
    load();
  };

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      {items.map((c) => (
        <div key={c.id} className="flex gap-2">
          <Avatar profile={c.profiles} size={34} />
          <div className="flex-1 rounded-md bg-muted px-3 py-2">
            <UserMeta profile={c.profiles} time={c.created_at} />
            <p className="mt-1 text-sm leading-relaxed text-foreground">{c.content}</p>
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
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button onClick={submit} disabled={busy || !text.trim()} className="rounded-md bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-50">
            إرسال
          </button>
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/auth" className="font-bold text-primary">
            سجّل الدخول
          </Link>{" "}
          للتعليق
        </p>
      )}
    </div>
  );
}

function InteractionBar({ postId, initialLikes = 0, initialComments = 0, initialReposts = 0, initiallyLiked, initiallyReposted, onChange }: any) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [liked, setLiked] = useState(!!initiallyLiked);
  const [reposted, setReposted] = useState(!!initiallyReposted);
  const [likes, setLikes] = useState(Number(initialLikes || 0));
  const [comments, setComments] = useState(Number(initialComments || 0));
  const [reposts, setReposts] = useState(Number(initialReposts || 0));

  const requireAuth = () => {
    if (!user) {
      toast.error("سجّل الدخول للتفاعل");
      return false;
    }
    return true;
  };

  const toggleLike = async () => {
    if (!requireAuth()) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    if (next) {
      const { error } = await supabase.from("community_post_likes").insert({ post_id: postId, user_id: user.id });
      if (error && !String(error.message).includes("duplicate")) toast.error(error.message);
    } else {
      await supabase.from("community_post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    }
    onChange?.();
  };

  const toggleRepost = async () => {
    if (!requireAuth()) return;
    if (reposted) {
      await supabase.from("community_post_reposts").delete().eq("post_id", postId).eq("user_id", user.id);
      setReposted(false);
      setReposts((n) => Math.max(0, n - 1));
      toast.success("تم إلغاء إعادة البزنسة");
    } else {
      const { error } = await supabase.from("community_post_reposts").insert({ post_id: postId, user_id: user.id });
      if (error) return toast.error(error.message);
      setReposted(true);
      setReposts((n) => n + 1);
      toast.success("تمت إعادة البزنسة");
    }
    onChange?.();
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 border-t border-border pt-3">
        <button onClick={toggleLike} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-black transition hover:bg-muted ${liked ? "text-destructive" : "text-muted-foreground hover:text-foreground"}`}>
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> إعجاب <span className="tabular-nums">{likes}</span>
        </button>
        <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-black text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <MessageCircle className="h-4 w-4" /> تعليق <span className="tabular-nums">{comments}</span>
        </button>
        <button onClick={toggleRepost} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-black transition hover:bg-muted ${reposted ? "text-chart-3" : "text-muted-foreground hover:text-foreground"}`}>
          <Repeat2 className="h-4 w-4" /> بزنسها <span className="tabular-nums">{reposts}</span>
        </button>
      </div>
      {open && <CommentsThread postId={postId} onCount={setComments} />}
    </>
  );
}

function PostCard({ post, onRefresh }: { post: Post; onRefresh: () => void }) {
  return (
    <article className="rounded-lg border border-border bg-card p-5 transition hover:border-primary/50">
      <header className="mb-3 flex items-start gap-3">
        <Avatar profile={post.profiles} />
        <UserMeta profile={post.profiles} time={post.created_at} />
      </header>
      {post.content && <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{post.content}</p>}
      <InteractionBar postId={post.id} initialLikes={post.likes_count} initialComments={post.comments_count} initialReposts={post.reposts_count} initiallyLiked={post._liked} initiallyReposted={post._reposted} onChange={onRefresh} />
    </article>
  );
}

function EntityCard({ kind, project, auction, owner, currentProfile, onRefresh, actionScope = "all", onToggleCompare, compareSelected }: any) {
  const { user } = useAuth();
  const [post, setPost] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [bumping, setBumping] = useState(false);
  const [action, setAction] = useState<null | "auction" | "tender" | "offer" | "purchase">(null);
  const ensurePost = useServerFn(ensurePlatformEntityPost);
  const bump = useServerFn(bumpMyProject);

  const p = project || auction?.projects || {};
  const title = p?.name || "مشروع في المنصة";
  const currency = auction?.currency || p?.currency || "SAR";
  const ownerProfile = owner || p?.profiles || auction?.profiles;
  const entityId = kind === "project" ? p.id : auction?.id || p.id;

  const preparePost = async () => {
    if (post || !ownerProfile?.id || !entityId) return post;
    setBusy(true);
    try {
      const row = await ensurePost({ data: { entity: kind, entityId } });
      if (row) setPost(row);
      return row;
    } catch (e: any) {
      toast.error(e?.message || "سجّل الدخول للتفاعل");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const openAction = async (mode: "auction" | "tender" | "offer" | "purchase") => {
    await preparePost();
    setAction(mode);
  };

  const tag = kind === "auction" ? "مزاد" : kind === "tender" ? "مناقصة" : "مشروع";
  const price = kind === "auction" || kind === "tender" ? Number(auction?.current_price ?? auction?.start_price ?? 0) : Number(p?.current_price ?? p?.share_price ?? 0);
  const isOwner = kind === "project" && user?.id && p?.owner_id === user.id;
  const canBump = !p?.last_bumped_at || (Date.now() - new Date(p.last_bumped_at).getTime()) >= 3 * 86400_000;
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("ar", { year: "numeric", month: "short", day: "numeric" }) : "—";
  const doBump = async () => {
    if (!p?.id || !canBump) return;
    setBumping(true);
    try {
      await bump({ data: { project_id: p.id } });
      toast.success("تم تحديث الإعلان ورفعه للأعلى");
      onRefresh?.();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر تحديث الإعلان");
    } finally {
      setBumping(false);
    }
  };

  return (
    <article
      aria-label={`${tag}: ${title}`}
      className="rounded-lg border border-border bg-card p-5 transition hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary/60"
    >
      <header className="mb-4 flex items-start gap-3">
        <Avatar profile={ownerProfile} />
        <UserMeta profile={ownerProfile} time={auction?.created_at || p?.created_at} />
        <span className="rounded-md border border-border bg-muted px-2 py-1 text-[11px] font-black text-muted-foreground">{tag}</span>
      </header>

      {p?.cover_image_url && <img src={resolveStorageUrl(p.cover_image_url)} alt={title} loading="lazy" referrerPolicy="no-referrer" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}} className="mb-4 h-48 w-full rounded-md object-cover" />}

      <div className="space-y-2">
        {p.id ? (
          <Link to="/projects/$id" params={{ id: p.id }} className="text-lg font-black leading-tight hover:text-primary">
            {title}
          </Link>
        ) : (
          <h3 className="text-lg font-black leading-tight">{title}</h3>
        )}
        {p?.description && <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
        <div className="flex flex-wrap gap-2 text-[12px] font-bold text-muted-foreground">
          {p?.sector && <span className="rounded-md bg-muted px-2 py-1">{p.sector}</span>}
          {p?.country && (
            <span className="rounded-md bg-muted px-2 py-1">
              <Globe2 className="me-1 inline h-3 w-3" />
              {countryFlag(p.country)} {p.country}
            </span>
          )}
          {price > 0 && <span className="rounded-md bg-muted px-2 py-1">السعر: {money(price, currency)}</span>}
          {auction?.ends_at && <span className="rounded-md bg-muted px-2 py-1">ينتهي: {new Date(auction.ends_at).toLocaleDateString("ar-SA")}</span>}
        </div>
        {kind === "project" && (
          <div className="flex flex-wrap gap-2 text-[11px] font-bold text-muted-foreground">
            <span className="rounded-md bg-muted/70 px-2 py-1">النشر: {fmtDate(p?.created_at)}</span>
            <span className="rounded-md bg-muted/70 px-2 py-1">آخر تعديل: {fmtDate(p?.updated_at)}</span>
            <span className="rounded-md bg-muted/70 px-2 py-1">آخر تحديث: {fmtDate(p?.last_bumped_at)}</span>
          </div>
        )}
      </div>

      {isOwner && (
        <div className="mt-4 grid gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2 sm:grid-cols-2">
          <Link to="/projects/new" search={{ edit: p.id } as any} className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-black hover:bg-muted">
            <Pencil className="h-4 w-4" /> تعديل الإعلان
          </Link>
          <button onClick={doBump} disabled={!canBump || bumping} className="inline-flex items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-black text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${bumping ? "animate-spin" : ""}`} /> {canBump ? "تحديث كل 3 أيام" : "التحديث غير متاح الآن"}
          </button>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {kind === "auction" && <ActionButton icon={Gavel} label="زايد الآن" onClick={() => openAction("auction")} />}
        {kind === "tender" && <ActionButton icon={FileText} label="قدّم مناقصة" onClick={() => openAction("tender")} />}
        {kind === "project" && actionScope !== "purchase" && <ActionButton icon={HandCoins} label="قدّم عرض" onClick={() => openAction("offer")} />}
        {kind === "project" && actionScope !== "offer" && <ActionButton icon={ShoppingCart} label="شراء مباشر" onClick={() => openAction("purchase")} />}
        <button onClick={preparePost} disabled={busy || !ownerProfile?.id} className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-black transition hover:bg-muted disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          التفاعل والتعليق
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {p?.id && <WatchlistButton projectId={p.id} compact />}
        {p?.id && (
          <ShareButtons url={`/projects/${p.id}`} title={title} />
        )}
        {onToggleCompare && p?.id && (
          <Button
            variant={compareSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleCompare(p)}
            aria-pressed={!!compareSelected}
            aria-label={compareSelected ? `إزالة ${title} من المقارنة` : `إضافة ${title} للمقارنة`}
          >
            <Scale className="h-4 w-4 ms-1" aria-hidden="true" /> {compareSelected ? "في المقارنة" : "قارن"}
          </Button>
        )}
      </div>

      {post && (
        <div className="mt-4">
          <InteractionBar postId={post.id} initialLikes={post.likes_count} initialComments={post.comments_count} initialReposts={post.reposts_count} onChange={onRefresh} />
        </div>
      )}

      <ActionDialog open={!!action} onOpenChange={(v) => !v && setAction(null)} mode={action} project={p} auction={auction} currentProfile={currentProfile} onDone={() => { setAction(null); onRefresh?.(); }} />
    </article>
  );
}

function ActionButton({ icon: Icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-black text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Icon className="h-4 w-4" aria-hidden="true" /> {label}
    </button>
  );
}

function ActionDialog({ open, onOpenChange, mode, project, auction, currentProfile, onDone }: any) {
  const { user } = useAuth();
  const bid = useServerFn(placeBid);
  const makeOffer = useServerFn(createInvestmentOffer);
  const purchase = useServerFn(createProjectPurchaseRequest);
  const checkDeposit = useServerFn(checkSeriousnessDeposit);
  const [amount, setAmount] = useState(0);
  const [shares, setShares] = useState(10);
  const [message, setMessage] = useState("");
  const [showPay, setShowPay] = useState(false);
  const [depositOk, setDepositOk] = useState(false);
  const [checkingDeposit, setCheckingDeposit] = useState(false);
  const [busy, setBusy] = useState(false);

  const fee = seriousnessFee(currentProfile?.membership);
  const currency = auction?.currency || project?.currency || "SAR";
  const unitPrice = Number(project?.current_price ?? project?.share_price ?? auction?.current_price ?? auction?.start_price ?? 0);

  useEffect(() => {
    if (!open) return;
    const base = Number(auction?.current_price ?? auction?.start_price ?? project?.current_price ?? project?.share_price ?? 0);
    setAmount(mode === "offer" ? Math.max(base * 10, 1) : Math.max(base + Number(auction?.min_increment ?? 1000), 1));
    setShares(10);
    setMessage("");
    setShowPay(false);
    setDepositOk(false);
  }, [open, mode, auction?.id, project?.id]);

  const refreshDeposit = useCallback(async () => {
    if (!user) return false;
    setCheckingDeposit(true);
    try {
      const result = await checkDeposit();
      setDepositOk(!!result?.ok);
      if (!result?.ok) setShowPay(true);
      return !!result?.ok;
    } catch (e: any) {
      toast.error(e?.message || "تعذّر التحقق من إثبات الجدية");
      return false;
    } finally {
      setCheckingDeposit(false);
    }
  }, [checkDeposit, user?.id]);

  useEffect(() => {
    if (open && user) refreshDeposit();
  }, [open, user?.id, refreshDeposit]);

  const title = mode === "auction" ? "تقديم مزايدة" : mode === "tender" ? "تقديم مناقصة" : mode === "offer" ? "تقديم عرض مباشر" : "شراء مباشر";

  const submit = async () => {
    if (!user) return toast.error("سجّل الدخول أولاً");
    if (!mode || busy) return;
    const hasDeposit = depositOk || (await refreshDeposit());
    if (!hasDeposit) {
      toast.error("ادفع إثبات الجدية أولاً لإتمام العملية");
      return;
    }
    setBusy(true);
    try {
      if (mode === "auction" || mode === "tender") {
        await bid({ data: { auction_id: auction.id, amount: Number(amount) } });
        toast.success(mode === "tender" ? "تم تقديم المناقصة" : "تم تسجيل المزايدة");
      } else if (mode === "offer") {
        await makeOffer({ data: { project_id: project.id, amount: Number(amount), shares: Number(shares), message: message || undefined } });
        toast.success("تم إرسال العرض لصاحب المشروع");
      } else if (mode === "purchase") {
        await purchase({ data: { project_id: project.id, shares: Number(shares), message: message || undefined } });
        toast.success("تم إرسال طلب الشراء المباشر");
      }
      onDone?.();
    } catch (e: any) {
      if (isDepositError(e?.message)) {
        setShowPay(true);
        setDepositOk(false);
        toast.error("يلزم دفع إثبات الجدية قبل تقديم الطلب");
      } else {
        toast.error(e?.message || "تعذّر تنفيذ العملية");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{project?.name || auction?.projects?.name || "مشروع في المنصة"}</DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="rounded-md border border-border bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">يجب تسجيل الدخول قبل الدفع أو تقديم العروض.</p>
            <Link to="/auth" className="mt-3 inline-flex rounded-md bg-primary px-5 py-2 text-sm font-black text-primary-foreground">
              تسجيل الدخول
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-primary/30 bg-primary/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 text-sm font-black">
                    {depositOk ? <CheckCircle2 className="h-4 w-4 text-chart-3" /> : <CreditCard className="h-4 w-4" />} إثبات الجدية
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">العضوية العادية تدفع ٥ دولار، وتنخفض الرسوم تلقائياً حسب عضويتك الحالية. يجب الدفع قبل المزايدة أو المناقصة أو تقديم العرض أو الشراء المباشر.</p>
                </div>
                <div className="rounded-md bg-background px-3 py-2 text-lg font-black tabular-nums">{depositOk ? "مدفوع" : `$${fee}`}</div>
              </div>
              {!depositOk && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>لن يتم قبول الطلب حتى يظهر إثبات جدية مدفوع ومؤكد من بوابة الدفع.</span>
                </div>
              )}
              <button onClick={() => (depositOk ? refreshDeposit() : setShowPay((v) => !v))} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-black text-primary-foreground">
                {checkingDeposit ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {depositOk ? "تحقق من حالة الدفع" : showPay ? "إخفاء بوابة الدفع" : "ادفع إثبات الجدية الآن"}
              </button>
              {showPay && (
                <div className="mt-4 rounded-md border border-border bg-background p-3">
                  <BrandedStripeCheckout amount={fee} currency="USD" purpose="seriousness_deposit" returnUrl={`${window.location.origin}/community?paid=seriousness`} />
                </div>
              )}
            </div>

            {(mode === "auction" || mode === "tender" || mode === "offer") && (
              <label className="block text-sm font-bold">
                المبلغ ({currency})
                <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
              </label>
            )}

            {(mode === "offer" || mode === "purchase") && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-bold">
                  عدد الأسهم
                  <input type="number" min={1} value={shares} onChange={(e) => setShares(Number(e.target.value) || 1)} className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                </label>
                <div className="rounded-md border border-border bg-muted p-3 text-sm">
                  <div className="text-xs text-muted-foreground">الإجمالي التقريبي</div>
                  <div className="mt-1 text-lg font-black">{mode === "purchase" ? money(unitPrice * shares, currency) : money(amount, currency)}</div>
                </div>
              </div>
            )}

            <label className="block text-sm font-bold">
              رسالة لصاحب المشروع
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={2000} className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </label>

            <button onClick={submit} disabled={busy || !depositOk || (mode !== "purchase" && amount <= 0) || ((mode === "offer" || mode === "purchase") && shares <= 0)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-black text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {depositOk ? "تنفيذ الطلب" : "ادفع إثبات الجدية أولاً"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function useCurrentProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    let live = true;
    if (!userId) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select(PROFILE_COLS)
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (live) setProfile(data as any);
      });
    return () => {
      live = false;
    };
  }, [userId]);
  return profile;
}

function usePostsFeed(userId?: string) {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("community_posts")
      .select("id,user_id,content,category,likes_count,comments_count,reposts_count,created_at,linked_project_id")
      .eq("status", "published")
      .not("category", "like", "entity_%")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    let list = (data ?? []) as Post[];
    if (userId && list.length) {
      const ids = list.map((r) => r.id);
      const [likesRes, repostsRes] = await Promise.all([
        supabase.from("community_post_likes").select("post_id").eq("user_id", userId).in("post_id", ids),
        supabase.from("community_post_reposts").select("post_id").eq("user_id", userId).in("post_id", ids),
      ]);
      const liked = new Set((likesRes.data ?? []).map((r: any) => r.post_id));
      const reposted = new Set((repostsRes.data ?? []).map((r: any) => r.post_id));
      list = list.map((r) => ({ ...r, _liked: liked.has(r.id), _reposted: reposted.has(r.id) }));
    }
    const profiles = await profilesById(list.map((r) => r.user_id));
    list = list.map((r) => ({ ...r, profiles: profiles.get(r.user_id) ?? null }));
    setRows(list);
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { rows, loading, reload };
}

function useProjects(userId?: string) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("projects")
      .select("id,owner_id,ticker,name,description,cover_image_url,media_urls,sector,country,city,currency,current_price,share_price,total_cost,target_investment,funding_mode,marketplace_listed,shares_total,shares_sold,status,created_at,updated_at,last_bumped_at")
      .or(userId ? `status.eq.active,owner_id.eq.${userId}` : "status.eq.active")
      .order("last_bumped_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(40);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    const list = data ?? [];
    const profiles = await profilesById(list.map((r: any) => r.owner_id));
    setRows(list.map((r: any) => ({ ...r, profiles: profiles.get(r.owner_id) ?? null })));
    setLoading(false);
  }, [userId]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { rows, loading, reload };
}

function useAuctions(kind: "auction" | "tender") {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("auctions")
      .select("id,type,status,currency,current_price,start_price,min_increment,ends_at,project_id,owner_id,created_at,projects:project_id(id,name,description,cover_image_url,sector,country,currency,current_price,share_price)")
      .in("status", ["live", "scheduled"])
      .order("created_at", { ascending: false })
      .limit(40);
    q = kind === "tender" ? q.eq("type", "sealed") : q.neq("type", "sealed");
    const { data, error } = await q;
    if (error) toast.error(error.message);
    const list = data ?? [];
    const profiles = await profilesById(list.map((r: any) => r.owner_id));
    setRows(list.map((r: any) => ({ ...r, profiles: profiles.get(r.owner_id) ?? null })));
    setLoading(false);
  }, [kind]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { rows, loading, reload };
}

// ----- Sidebar Nav (shared by desktop aside + mobile sheet) -----
function SectionsNav({ section, onPick }: { section: SectionKey; onPick: (k: SectionKey) => void }) {
  return (
    <div className="space-y-1">
      {SECTIONS.map(({ key, label, hint, Icon }) => (
        <button
          key={key}
          onClick={() => onPick(key)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start transition active:scale-[0.99] ${
            section === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black">{label}</span>
            <span className="block truncate text-[11px] opacity-80">{hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

// ----- Compare Drawer -----
function CompareBar({ items, onRemove, onClear }: { items: any[]; onRemove: (id: string) => void; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <>
      <div className="fixed inset-x-0 bottom-16 z-30 mx-auto w-full max-w-3xl px-3 md:bottom-6">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/95 p-2.5 shadow-xl backdrop-blur">
          <div className="flex flex-1 items-center gap-2 overflow-x-auto">
            {items.map((p) => (
              <div key={p.id} className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-black">
                <Scale className="h-3 w-3 text-primary" />
                <span className="max-w-[120px] truncate">{p.name}</span>
                <button onClick={() => onRemove(p.id)} aria-label="إزالة" className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
          <Button size="sm" onClick={() => setOpen(true)} disabled={items.length < 2}>قارن ({items.length})</Button>
          <Button size="sm" variant="ghost" onClick={onClear} aria-label="مسح"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>مقارنة المشاريع</DialogTitle>
            <DialogDescription>مقارنة جنباً إلى جنب لاتخاذ قرار أسرع.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => {
              const price = Number(p?.current_price ?? p?.share_price ?? 0);
              const fundedPct = p?.shares_total ? Math.min(100, Math.round((Number(p.shares_sold || 0) / Number(p.shares_total)) * 100)) : 0;
              return (
                <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                  {p.cover_image_url && <img src={resolveStorageUrl(p.cover_image_url)} alt={p.name} className="mb-3 h-32 w-full rounded-md object-cover" loading="lazy" referrerPolicy="no-referrer" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}} />}
                  <h4 className="text-base font-black">{p.name}</h4>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <Row label="القطاع" value={p.sector || "—"} />
                    <Row label="الدولة" value={`${countryFlag(p.country) || ""} ${p.country || "—"}`} />
                    <Row label="السعر" value={price > 0 ? money(price, p.currency || "SAR") : "—"} />
                    <Row label="التمويل" value={`${fundedPct}%`} />
                  </div>
                  <Link to="/projects/$id" params={{ id: p.id }} className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-xs font-black text-primary-foreground">عرض المشروع</Link>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-dashed border-border pb-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}

// ----- Mobile bottom tabs (5 quick sections) -----
function MobileBottomNav({ section, onPick }: { section: SectionKey; onPick: (k: SectionKey) => void }) {
  const items = SECTIONS.filter((s) => ["feed", "projects", "auctions", "tenders", "ads"].includes(s.key));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {items.map(({ key, label, Icon }) => {
        const active = section === key;
        return (
          <button
            key={key}
            onClick={() => onPick(key)}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-black transition ${active ? "text-primary" : "text-muted-foreground"}`}
          >
            <Icon className={`h-5 w-5 ${active ? "scale-110" : ""}`} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export default function PlatformProjectsPage() {
  const { user } = useAuth();
  const search = useSearch({ strict: false }) as any;
  const [section, setSection] = useState<SectionKey>("projects");
  const [qInput, setQInput] = useState("");
  const q = useDebounce(qInput, 300);
  const [sector, setSector] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "ending_soon">("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [compare, setCompare] = useState<any[]>([]);
  const [projectsScope, setProjectsScope] = useState<"all" | "mine" | "invested">("all");
  const [investedIds, setInvestedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user?.id) { setInvestedIds(new Set()); return; }
    (async () => {
      const ids = new Set<string>();
      const [{ data: h }, { data: o }] = await Promise.all([
        supabase.from("share_holdings").select("project_id").eq("user_id", user.id),
        supabase.from("investment_offers").select("project_id").eq("investor_id", user.id).eq("status", "accepted"),
      ]);
      (h ?? []).forEach((r: any) => r.project_id && ids.add(r.project_id));
      (o ?? []).forEach((r: any) => r.project_id && ids.add(r.project_id));
      setInvestedIds(ids);
    })();
  }, [user?.id]);
  const currentProfile = useCurrentProfile(user?.id);
  const feed = usePostsFeed(user?.id);
  const projects = useProjects(user?.id);
  const auctions = useAuctions("auction");
  const tenders = useAuctions("tender");

  useEffect(() => {
    if (search?.section && SECTIONS.some((s) => s.key === search.section)) setSection(search.section as SectionKey);
  }, [search?.section]);

  useEffect(() => { setVisibleCount(12); }, [section, q, sector, country, sortBy]);

  useEffect(() => {
    const reloadAll = () => { feed.reload(); projects.reload(); auctions.reload(); tenders.reload(); };
    const ch = supabase
      .channel("platform_projects_unified_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, reloadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_post_likes" }, reloadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_post_comments" }, reloadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_post_reposts" }, reloadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, reloadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, reloadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, reloadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [feed.reload, projects.reload, auctions.reload, tenders.reload]);

  const sectors = useMemo(() => Array.from(new Set(projects.rows.map((p: any) => p.sector).filter(Boolean))).sort() as string[], [projects.rows]);
  const ARAB_COUNTRIES = [
    "السعودية","الإمارات","الكويت","قطر","البحرين","عُمان","اليمن",
    "العراق","سوريا","لبنان","الأردن","فلسطين",
    "مصر","ليبيا","تونس","الجزائر","المغرب","موريتانيا","السودان",
    "الصومال","جيبوتي","جزر القمر",
  ];
  const countries = useMemo(() => {
    const fromData = projects.rows.map((p: any) => p.country).filter(Boolean) as string[];
    return Array.from(new Set([...ARAB_COUNTRIES, ...fromData])).sort((a, b) => a.localeCompare(b, "ar"));
  }, [projects.rows]);

  // Per-row search index cache — avoids re-building lowercased blob on every keystroke.
  // Keyed by row identity (WeakMap) so it is garbage collected with the row.
  const searchIndexCache = useMemo(() => new WeakMap<object, string>(), []);
  const getSearchBlob = useCallback((p: any) => {
    if (!p || typeof p !== "object") return "";
    const cached = searchIndexCache.get(p);
    if (cached !== undefined) return cached;
    const blob = [p.name, p.description, p.sector, p.country, p.ticker].filter(Boolean).join(" ").toLowerCase();
    searchIndexCache.set(p, blob);
    return blob;
  }, [searchIndexCache]);

  const applyFilters = useCallback((rows: any[]) => {
    const needle = q.trim().toLowerCase();
    if (!needle && !sector && !country) return rows;
    const out: any[] = [];
    for (let i = 0; i < rows.length; i++) {
      const p = rows[i];
      if (sector && p.sector !== sector) continue;
      if (country && p.country !== country) continue;
      if (needle && !getSearchBlob(p).includes(needle)) continue;
      out.push(p);
    }
    return out;
  }, [q, sector, country, getSearchBlob]);

  const sortRows = useCallback((rows: any[], isAuction = false) => {
    if (rows.length < 2) return rows;
    const priceOf = (r: any) => Number((isAuction ? r.current_price ?? r.start_price : r.current_price ?? r.share_price) || 0);
    const arr = rows.slice();
    switch (sortBy) {
      case "price_asc": return arr.sort((a, b) => priceOf(a) - priceOf(b));
      case "price_desc": return arr.sort((a, b) => priceOf(b) - priceOf(a));
      case "ending_soon": return arr.sort((a, b) => new Date(a.ends_at || 0).getTime() - new Date(b.ends_at || 0).getTime());
      default: return arr.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }
  }, [sortBy]);

  // Map auction/tender rows once when source changes (was rebuilt on every filter change).
  const auctionProjects = useMemo(
    () => auctions.rows.map((a: any) => ({ ...a.projects, _a: a })),
    [auctions.rows]
  );
  const tenderProjects = useMemo(
    () => tenders.rows.map((a: any) => ({ ...a.projects, _a: a })),
    [tenders.rows]
  );

  const scopedProjectRows = useMemo(() => {
    if (projectsScope === "mine") return projects.rows.filter((r: any) => r.owner_id === user?.id);
    if (projectsScope === "invested") return projects.rows.filter((r: any) => investedIds.has(r.id));
    return projects.rows;
  }, [projects.rows, projectsScope, user?.id, investedIds]);

  const filteredProjects = useMemo(() => {
    const t0 = typeof performance !== "undefined" ? performance.now() : 0;
    const out = sortRows(applyFilters(scopedProjectRows));
    if (typeof performance !== "undefined" && import.meta.env.DEV) {
      const dt = performance.now() - t0;
      if (dt > 16) console.debug(`[PlatformProjects] filter+sort projects: ${dt.toFixed(1)}ms (${scopedProjectRows.length} → ${out.length})`);
    }
    return out;
  }, [scopedProjectRows, applyFilters, sortRows]);
  const filteredAuctions = useMemo(() => sortRows(applyFilters(auctionProjects), true).map((p: any) => p._a), [auctionProjects, applyFilters, sortRows]);
  const filteredTenders = useMemo(() => sortRows(applyFilters(tenderProjects), true).map((p: any) => p._a), [tenderProjects, applyFilters, sortRows]);

  const active = SECTIONS.find((s) => s.key === section) || SECTIONS[0];
  const ActiveIcon = active.Icon;
  const loading = section === "feed" ? feed.loading : section === "auctions" ? auctions.loading : section === "tenders" ? tenders.loading : projects.loading;

  const toggleCompare = (p: any) => {
    setCompare((prev) => {
      if (prev.find((x) => x.id === p.id)) return prev.filter((x) => x.id !== p.id);
      if (prev.length >= 3) { toast.error("الحد الأقصى 3 مشاريع للمقارنة"); return prev; }
      return [...prev, p];
    });
  };
  const removeCompare = (id: string) => setCompare((prev) => prev.filter((x) => x.id !== id));

  const resetFilters = () => { setQInput(""); setSector(""); setCountry(""); setSortBy("newest"); };
  const hasFilters = !!(qInput || sector || country || sortBy !== "newest");

  const renderCards = (rows: any[], kind: "project" | "auction" | "tender", scope: any = "all") => {
    const slice = rows.slice(0, visibleCount);
    if (!slice.length) {
      return (
        <EmptyState
          icon={kind === "auction" ? Gavel : kind === "tender" ? FileText : BriefcaseBusiness}
          title={hasFilters ? "لا توجد نتائج مطابقة" : kind === "auction" ? "لا توجد مزايدات نشطة" : kind === "tender" ? "لا توجد مناقصات نشطة" : "لا توجد مشاريع نشطة"}
          hint={hasFilters ? "جرّب تعديل الفلاتر أو مسحها." : "كن أول من يضيف فرصة جديدة في هذا القسم."}
          action={hasFilters ? <Button variant="outline" onClick={resetFilters}><RotateCcw className="h-4 w-4 ms-1" /> مسح الفلاتر</Button> : <Link to="/projects/new" search={{ edit: undefined }} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-black text-primary-foreground"><Plus className="h-4 w-4" /> أضف مشروعاً</Link>}
        />
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {slice.map((r: any) => (
          <EntityCard
            key={r.id}
            kind={kind}
            project={kind === "project" ? r : undefined}
            auction={kind !== "project" ? r : undefined}
            owner={r.profiles}
            currentProfile={currentProfile}
            onRefresh={kind === "project" ? projects.reload : kind === "auction" ? auctions.reload : tenders.reload}
            actionScope={scope}
            onToggleCompare={kind === "project" ? toggleCompare : undefined}
            compareSelected={kind === "project" ? !!compare.find((x) => x.id === r.id) : false}
          />
        ))}
        {rows.length > visibleCount && (
          <div className="col-span-full flex justify-center pt-2">
            <Button variant="outline" onClick={() => setVisibleCount((n) => n + 12)}>عرض المزيد ({rows.length - visibleCount})</Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="mx-auto grid max-w-7xl gap-6 px-3 py-4 sm:px-4 sm:py-6 lg:grid-cols-[270px_minmax(0,1fr)]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="mb-3 px-2">
              <h1 className="text-2xl font-black">مشاريع المنصة</h1>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">مجتمع، حراج، مناقصات، عروض وشراء مباشر في مكان واحد.</p>
            </div>
            <SectionsNav section={section} onPick={setSection} />
            <Link to="/profile" className="mt-3 flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-black hover:bg-muted">
              <UserCircle2 className="h-4 w-4" /> ملف شخصي
            </Link>
            <div className="mt-3 rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <div className="font-black text-foreground">إثبات الجدية</div>
              <div className="mt-1">العادي: $5 · الفضي: $4 · الذهبي: $2.5 · البلاتيني: $1</div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          {/* Header */}
          <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {/* Mobile sections drawer trigger */}
                <Sheet open={navOpen} onOpenChange={setNavOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="lg:hidden shrink-0" aria-label="الأقسام"><Menu className="h-4 w-4" /></Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[85vw] max-w-sm" dir="rtl">
                    <SheetHeader><SheetTitle>الأقسام</SheetTitle></SheetHeader>
                    <div className="mt-4"><SectionsNav section={section} onPick={(k) => { setSection(k); setNavOpen(false); }} /></div>
                  </SheetContent>
                </Sheet>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 text-xs font-black text-primary"><ActiveIcon className="h-4 w-4" /> {active.label}</div>
                  <h2 className="mt-0.5 truncate text-xl font-black sm:text-2xl">{section === "projects" ? "كل فرص المنصة" : active.label}</h2>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                {section !== "ads" && (
                  <div className="relative w-full md:w-72">
                    <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="ابحث عن مشروع، قطاع، أو دولة…" className="h-11 w-full rounded-md border border-border bg-background pe-3 ps-10 text-sm outline-none focus:border-primary" />
                  </div>
                )}
                {section !== "ads" && (
                  <Button variant={hasFilters ? "default" : "outline"} className="h-11" onClick={() => setFiltersOpen((v) => !v)} aria-label="فلاتر">
                    <Filter className="h-4 w-4 ms-1" /> فلاتر {hasFilters && <span className="ms-1 rounded-full bg-background/30 px-1.5 text-[10px]">●</span>}
                  </Button>
                )}
                <Button asChild className="h-11 shrink-0 gap-1 font-black">
                  <Link to="/ads/new"><Plus className="h-4 w-4" /> إنشاء إعلان</Link>
                </Button>
              </div>
            </div>

            {/* Filters panel */}
            {section !== "ads" && filtersOpen && (
              <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-4">
                <select value={sector} onChange={(e) => setSector(e.target.value)} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                  <option value="">كل القطاعات</option>
                  {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                  <option value="">كل الدول</option>
                  {countries.map((c) => <option key={c} value={c}>{countryFlag(c)} {c}</option>)}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                  <option value="newest">الأحدث</option>
                  <option value="price_asc">السعر ↑</option>
                  <option value="price_desc">السعر ↓</option>
                  <option value="ending_soon">الأقرب انتهاءً</option>
                </select>
                <Button variant="ghost" onClick={resetFilters} disabled={!hasFilters} className="h-10">
                  <RotateCcw className="h-4 w-4 ms-1" /> مسح الفلاتر
                </Button>
              </div>
            )}
          </div>

          {section === "feed" && <Composer currentProfile={currentProfile} onPosted={feed.reload} />}

          {section === "projects" && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2">
              {([
                { k: "all", label: "كل المشاريع", hint: projects.rows.length },
                { k: "mine", label: "مشاريعي", hint: user ? projects.rows.filter((r: any) => r.owner_id === user.id).length : 0 },
                { k: "invested", label: "استثمرت بها", hint: user ? projects.rows.filter((r: any) => investedIds.has(r.id)).length : 0 },
              ] as const).map((opt) => {
                const isActive = projectsScope === opt.k;
                const disabled = (opt.k === "mine" || opt.k === "invested") && !user;
                return (
                  <button
                    key={opt.k}
                    onClick={() => !disabled && setProjectsScope(opt.k)}
                    disabled={disabled}
                    className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-black transition ${isActive ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-foreground"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    title={disabled ? "سجّل الدخول لعرض هذا القسم" : undefined}
                  >
                    {opt.label}
                    <span className={`rounded-full px-1.5 text-[10px] ${isActive ? "bg-primary-foreground/20" : "bg-muted"}`}>{opt.hint}</span>
                  </button>
                );
              })}
              {!user && (
                <Link to="/auth" className="ms-auto text-xs text-primary underline">سجّل الدخول لعرض مشاريعك</Link>
              )}
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : section === "feed" ? (
            <FeedWithAds rows={feed.rows} reload={feed.reload} />
          ) : section === "auctions" ? (
            renderCards(filteredAuctions, "auction")
          ) : section === "tenders" ? (
            renderCards(filteredTenders, "tender")
          ) : section === "offers" ? (
            renderCards(filteredProjects, "project", "offer")
          ) : section === "purchases" ? (
            renderCards(filteredProjects, "project", "purchase")
          ) : section === "ads" ? (
            <AdsDashboard />
          ) : (
            renderCards(filteredProjects, "project")
          )}
        </section>
      </main>

      <CompareBar items={compare} onRemove={removeCompare} onClear={() => setCompare([])} />
      <MobileBottomNav section={section} onPick={setSection} />
    </div>
  );
}

function FeedWithAds({ rows, reload }: { rows: any[]; reload: () => void }) {
  const fetchAds = useServerFn(getFeedAds);
  const [ads, setAds] = useState<any[]>([]);
  useEffect(() => {
    fetchAds({ data: { limit: 3 } }).then((r) => setAds(r?.items ?? [])).catch(() => setAds([]));
  }, [fetchAds]);
  if (!rows.length && !ads.length) {
    return <EmptyState icon={Layers} title="لا توجد بزنسة بعد" hint="كن أول من يبدأ النقاش وانشر فكرتك للمجتمع." />;
  }
  const items: any[] = [];
  let adIdx = 0;
  rows.forEach((p, i) => {
    items.push(<PostCard key={p.id} post={p} onRefresh={reload} />);
    if ((i + 1) % 4 === 0 && ads[adIdx]) {
      items.push(<AdCard key={`ad-${ads[adIdx].id}`} ad={ads[adIdx]} />);
      adIdx++;
    }
  });
  while (adIdx < ads.length) {
    items.push(<AdCard key={`ad-${ads[adIdx].id}`} ad={ads[adIdx]} />);
    adIdx++;
  }
  return <div className="space-y-4">{items}</div>;
}