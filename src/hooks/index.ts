// ============================================================
// src/hooks/index.ts — React hooks موصولة بقاعدة بيانات Lovable Cloud الحالية
// تُصدِّر: useAuth, usePosts, useAuctions, useTenders,
//          useProjects, useWallet, useNotifications
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth as useAuthBase } from "@/hooks/useAuth";

// إعادة تصدير useAuth مع shape مختصر متوافق مع README
export function useAuth() {
  const base = useAuthBase();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    if (!base.user) { setProfile(null); return; }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", base.user.id)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setProfile(data); });
    return () => { cancelled = true; };
  }, [base.user?.id]);

  const updateProfile = useCallback(async (updates: any) => {
    if (!base.user) return null;
    const { data, error } = await supabase
      .from("profiles").update(updates).eq("id", base.user.id).select().single();
    if (error) throw error;
    setProfile(data);
    return data;
  }, [base.user?.id]);

  return {
    ...base,
    profile,
    updateProfile,
    logout: base.signOut,
  };
}

// ===== usePosts =====
export function usePosts(filter: "foryou" | "following" | "trending" = "foryou") {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthBase();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("community_posts")
        .select("*, profiles:user_id(username,full_name,avatar_url,is_verified,badge)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(50);

      if (filter === "trending") q = q.order("likes_count", { ascending: false });
      if (filter === "following" && user) {
        const { data: follows } = await supabase
          .from("community_follows").select("following_id").eq("follower_id", user.id);
        const ids = (follows ?? []).map((f: any) => f.following_id);
        if (ids.length === 0) { setPosts([]); setLoading(false); return; }
        q = q.in("user_id", ids);
      }

      const { data, error } = await q;
      if (error) throw error;
      setPosts(data ?? []);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "خطأ في تحميل المنشورات");
    } finally { setLoading(false); }
  }, [filter, user?.id]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel("community_posts_feed")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "community_posts" },
        () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchPosts]);

  const createPost = useCallback(async (input: { content: string; media_urls?: string[]; category?: string }) => {
    if (!user) throw new Error("يجب تسجيل الدخول");
    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        user_id: user.id,
        content: input.content,
        media_urls: input.media_urls ?? [],
        category: input.category ?? "general",
        status: "published",
      })
      .select().single();
    if (error) throw error;
    setPosts((p) => [data, ...p]);
    return data;
  }, [user?.id]);

  const toggleLike = useCallback(async (postId: string) => {
    if (!user) throw new Error("يجب تسجيل الدخول");
    const { data: existing } = await supabase
      .from("community_post_likes")
      .select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
    if (existing) {
      await supabase.from("community_post_likes")
        .delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("community_post_likes")
        .insert({ post_id: postId, user_id: user.id });
    }
    fetchPosts();
  }, [user?.id, fetchPosts]);

  return { posts, loading, error, refresh: fetchPosts, createPost, toggleLike };
}

// ===== useAuctions =====
export function useAuctions(status: "live" | "ended" | "all" = "live") {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthBase();

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("auctions")
        .select("*, projects:project_id(title,thumbnail_url,sector)")
        .order("ends_at", { ascending: true })
        .limit(60);
      if (status === "live") q = q.eq("status", "live");
      if (status === "ended") q = q.in("status", ["ended", "awarded", "cancelled"]);
      const { data, error } = await q;
      if (error) throw error;
      setAuctions(data ?? []);
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { fetchAuctions(); }, [fetchAuctions]);

  useEffect(() => {
    const ch = supabase
      .channel("auctions_live")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "auctions" },
        () => fetchAuctions())
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "bids" },
        () => fetchAuctions())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAuctions]);

  const placeBid = useCallback(async (auctionId: string, amount: number) => {
    if (!user) throw new Error("يجب تسجيل الدخول للمزايدة");
    const { data, error } = await supabase
      .from("bids")
      .insert({ auction_id: auctionId, bidder_id: user.id, amount, status: "active" })
      .select().single();
    if (error) throw new Error(error.message);
    return data;
  }, [user?.id]);

  return { auctions, loading, error, refresh: fetchAuctions, placeBid };
}

// ===== useTenders (alias to project_purchase_requests) =====
export function useTenders() {
  const [tenders, setTenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("project_purchase_requests")
        .select("*, projects:project_id(title,sector,thumbnail_url)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setTenders(data ?? []);
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { tenders, loading, error, refresh: fetch };
}

// ===== useProjects =====
export function useProjects(opts: { sector?: string; ownerOnly?: boolean } = {}) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthBase();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (opts.sector) q = q.eq("sector", opts.sector);
      if (opts.ownerOnly && user) q = q.eq("owner_id", user.id);
      else q = q.eq("status", "active");
      const { data, error } = await q;
      if (error) throw error;
      setProjects(data ?? []);
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [opts.sector, opts.ownerOnly, user?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  const createProject = useCallback(async (payload: any) => {
    if (!user) throw new Error("يجب تسجيل الدخول");
    const { data, error } = await supabase
      .from("projects").insert({ ...payload, owner_id: user.id }).select().single();
    if (error) throw error;
    fetch();
    return data;
  }, [user?.id, fetch]);

  return { projects, loading, error, refresh: fetch, createProject };
}

// ===== useWallet =====
export function useWallet() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthBase();

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: w }, { data: tx }] = await Promise.all([
        supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("transactions").select("*").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(30),
      ]);
      setWallet(w);
      setTransactions(tx ?? []);
      setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`wallet_${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        () => fetch())
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` },
        () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, fetch]);

  return { wallet, transactions, loading, error, refresh: fetch };
}

// ===== useNotifications =====
export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthBase();
  const ready = useRef(false);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("notifications").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(50);
    setNotifications(data ?? []);
    setUnread((data ?? []).filter((n: any) => !n.read_at).length);
    setLoading(false);
    ready.current = true;
  }, [user?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`notif_${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, fetch]);

  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", user.id);
    fetch();
  }, [user?.id, fetch]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .is("read_at", null).eq("user_id", user.id);
    fetch();
  }, [user?.id, fetch]);

  return { notifications, unread, loading, refresh: fetch, markAsRead, markAllRead };
}
