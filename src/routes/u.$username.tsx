import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ShieldCheck, ShieldAlert, MapPin, Briefcase, Star, MessageCircle, UserPlus, Calendar, TrendingUp, FolderKanban, FileText, Award, AlertTriangle, Landmark, Clock, Trophy, Flag, ScrollText } from "lucide-react";
import { getPublicProfileBundle } from "@/lib/profile-public.functions";
import { resolveStorageUrl } from "@/lib/storage-url";
import { openConversation, sendMessage } from "@/lib/messages.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrustBadge } from "@/components/TrustBadge";

export const Route = createFileRoute("/u/$username")({
  loader: async ({ params }) => {
    // Accept either uuid or fallback param; treat as user id
    if (!/^[0-9a-f-]{36}$/i.test(params.username)) {
      return { bundle: { profile: null, projects: [], posts: [] }, userId: params.username };
    }
    const bundle = await getPublicProfileBundle({ data: { userId: params.username } });
    return { bundle, userId: params.username };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.bundle?.profile;
    const name = p?.display_name || "ملف عام";
    return {
      meta: [
        { title: `${name} | IDEA BUSINESS` },
        { name: "description", content: (p?.bio ?? `الملف العام لـ ${name} على IDEA BUSINESS`).slice(0, 160) },
        { property: "og:title", content: `${name} على IDEA BUSINESS` },
        { property: "og:description", content: (p?.bio ?? "").slice(0, 200) },
        ...(p?.avatar_url ? [{ property: "og:image", content: p.avatar_url }] : []),
      ],
    };
  },
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { bundle, userId } = Route.useLoaderData();
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);

  const p = bundle.profile as any;
  const projects = bundle.projects as any[];
  const posts = bundle.posts as any[];
  const trust = (bundle as any).trust as any | null;

  if (!p) {
    return (
      <div className="min-h-screen bg-background">        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-2xl font-black">الملف غير متاح</h1>
          <p className="mt-2 text-muted-foreground">إما أن المستخدم لم يفعّل الملف العام، أو أن الرابط غير صحيح.</p>
          <Link to="/community" className="mt-4 inline-block text-primary underline">العودة للمجتمع</Link>
        </main>
      </div>
    );
  }

  const isMe = me === p.id;
  const joinedYear = p.created_at ? new Date(p.created_at).getFullYear() : "";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <main className="mx-auto max-w-3xl pb-16">
        {/* Cover */}
        <div className="h-44 sm:h-56 w-full bg-gradient-to-tr from-primary/25 via-cyan-500/15 to-violet-500/25" />

        <div className="px-4 sm:px-6 -mt-14 sm:-mt-16">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="relative">
              <div className="h-28 w-28 sm:h-32 sm:w-32 overflow-hidden rounded-full ring-4 ring-background bg-muted">
                {p.avatar_url
                  ? <img src={resolveStorageUrl(p.avatar_url)} alt={p.display_name} className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}} />
                  : <div className="flex h-full w-full items-center justify-center text-3xl font-black text-muted-foreground">
                      {(p.display_name ?? "?").slice(0, 1).toUpperCase()}
                    </div>}
              </div>
            </div>
            <div className="flex gap-2 pb-2">
              {!isMe && me && (
                <>
                  <DmButton ownerId={p.id} ownerName={p.display_name} />
                  <FollowChip targetId={p.id} />
                </>
              )}
              {isMe && (
                <Link to="/profile"><Button variant="outline">تعديل الملف</Button></Link>
              )}
              {!me && (
                <Link to="/auth"><Button>سجّل الدخول للتواصل</Button></Link>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 flex-wrap">
              {p.display_name || "مستخدم"}
              {p.verified_green && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              {p.verified_blue && <ShieldCheck className="h-5 w-5 text-sky-500" />}
              {p.membership === "full" && <Badge className="bg-amber-500/90 text-black">الشاملة</Badge>}
              <TrustBadge userId={p.id} />
            </h1>
            {p.bio && <p className="mt-2 text-foreground/90 whitespace-pre-wrap leading-7">{p.bio}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {p.occupation && <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {p.occupation}</span>}
              {(p.city || p.country) && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {[p.city, p.country].filter(Boolean).join("، ")}</span>}
              {joinedYear && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> انضم {joinedYear}</span>}
              {typeof p.points === "number" && p.points > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-500"><Star className="h-3.5 w-3.5" /> {p.points.toLocaleString("ar")} نقطة</span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
              <StatChip n={projects.length} label="مشروع" />
              <StatChip n={trust?.deals_completed ?? 0} label="صفقة مكتملة" />
              <StatChip n={trust?.offers_received ?? 0} label="عرض استثمار" />
              <StatChip n={p.followers_count ?? 0} label="متابع" />
            </div>

            {trust && <TrustPanel trust={trust} />}
            {trust && Array.isArray(trust.achievements) && trust.achievements.length > 0 && (
              <AchievementsStrip achievements={trust.achievements} />
            )}
            {trust && Array.isArray(trust.top_sectors) && trust.top_sectors.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">قطاعات الخبرة:</span>
                {trust.top_sectors.map((s: any) => (
                  <Badge key={s.sector} variant="secondary">{s.sector} · {s.cnt}</Badge>
                ))}
              </div>
            )}
          </div>

          <Tabs defaultValue="projects" className="mt-8">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="projects"><FolderKanban className="h-4 w-4 ms-1" /> المشاريع ({projects.length})</TabsTrigger>
              <TabsTrigger value="posts"><FileText className="h-4 w-4 ms-1" /> المنشورات ({posts.length})</TabsTrigger>
              <TabsTrigger value="about">نبذة</TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="mt-4 space-y-3">
              {projects.length === 0 && <EmptyState text="لم يقم بنشر أي مشاريع عامة بعد." />}
              {projects.map((pr) => (
                <ProjectListCard key={pr.id} project={pr} isOwner={isMe} ownerId={p.id} ownerName={p.display_name} />
              ))}
            </TabsContent>

            <TabsContent value="posts" className="mt-4 space-y-3">
              {posts.length === 0 && <EmptyState text="لا توجد منشورات بعد." />}
              {posts.map((post) => (
                <Card key={post.id} className="border-border/60">
                  <CardContent className="p-4">
                    <p className="whitespace-pre-wrap leading-7">{post.content}</p>
                    {Array.isArray(post.media_urls) && post.media_urls[0] && (
                      <img src={post.media_urls[0]} alt="" className="mt-3 max-h-80 rounded-lg border object-cover" />
                    )}
                    {Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {post.hashtags.map((h: string) => (
                          <span key={h} className="text-xs text-primary">#{h}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 text-xs text-muted-foreground flex gap-4">
                      <span>♥ {post.likes_count ?? 0}</span>
                      <span>💬 {post.comments_count ?? 0}</span>
                      <span>↗ {post.shares_count ?? 0}</span>
                      <span className="ms-auto">{new Date(post.created_at).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="about" className="mt-4">
              <Card><CardContent className="p-5 space-y-2 text-sm">
                <Row label="الاسم">{p.display_name || "—"}</Row>
                {p.nationality && <Row label="الجنسية">{p.nationality}</Row>}
                {p.occupation && <Row label="المهنة">{p.occupation}</Row>}
                {(p.city || p.country) && <Row label="الموقع">{[p.city, p.country].filter(Boolean).join("، ")}</Row>}
                <Row label="عضو منذ">{p.created_at ? new Date(p.created_at).toLocaleDateString("ar") : "—"}</Row>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function StatChip({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 text-center">
      <div className="text-xl font-black text-primary">{n.toLocaleString("ar")}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex justify-between gap-3 border-b border-border/40 py-2 last:border-0"><span className="text-muted-foreground">{label}</span><span className="font-medium">{children}</span></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center text-sm text-muted-foreground">{text}</div>;
}

function TrustPanel({ trust }: { trust: any }) {
  const kycOk = trust.kyc_status === "approved";
  const ratings = Number(trust.ratings_avg ?? 0);
  const warnings: string[] = [];
  if (trust.is_new_account) warnings.push("حساب جديد — أقل من 30 يوم");
  if (!kycOk) warnings.push("لم يُكمل التحقق من الهوية (KYC)");
  if ((trust.disputes_open ?? 0) > 0) warnings.push(`لديه ${trust.disputes_open} نزاع مفتوح`);

  return (
    <Card className="mt-5 border-primary/30 bg-gradient-to-bl from-primary/5 to-transparent">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="font-black text-lg">لوحة الثقة</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <TrustItem
            ok={kycOk}
            icon={<ShieldCheck className="h-4 w-4" />}
            label="التحقق من الهوية"
            value={kycOk ? "موثّق" : (trust.kyc_status === "pending" ? "قيد المراجعة" : "غير موثّق")}
          />
          <TrustItem
            ok={!!trust.bank_verified}
            icon={<Landmark className="h-4 w-4" />}
            label="حساب بنكي"
            value={trust.bank_verified ? "مربوط ومُتحقَّق" : "غير مربوط"}
          />
          <TrustItem
            ok={!!trust.kyc_pledge}
            icon={<ScrollText className="h-4 w-4" />}
            label="تعهّد التحكيم"
            value={trust.kyc_pledge ? "موقَّع" : "غير موقَّع"}
          />
          <TrustItem
            ok={(trust.disputes_open ?? 0) === 0}
            icon={<Flag className="h-4 w-4" />}
            label="النزاعات"
            value={`مفتوحة ${trust.disputes_open ?? 0} · مغلقة ${trust.disputes_closed ?? 0}`}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg border border-border/60 p-3">
            <div className="text-xs text-muted-foreground">السمعة</div>
            <div className="font-black text-primary flex items-center gap-1">
              <Trophy className="h-4 w-4" /> {Number(trust.reputation_score ?? 0).toLocaleString("ar")}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <div className="text-xs text-muted-foreground">التقييم</div>
            <div className="font-black text-amber-500 flex items-center gap-1">
              <Star className="h-4 w-4 fill-current" />
              {ratings > 0 ? `${ratings.toFixed(2)} (${trust.ratings_count})` : "لا توجد تقييمات"}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <div className="text-xs text-muted-foreground">سرعة الردّ</div>
            <div className="font-black flex items-center gap-1">
              <Clock className="h-4 w-4" /> {trust.response_rate_pct ?? 0}%
            </div>
          </div>
          <div className="rounded-lg border border-border/60 p-3">
            <div className="text-xs text-muted-foreground">المشاريع النشطة</div>
            <div className="font-black flex items-center gap-1">
              <FolderKanban className="h-4 w-4" /> {trust.projects_active ?? 0} / {trust.projects_total ?? 0}
            </div>
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <div className="flex items-center gap-2 font-bold text-amber-600 mb-1">
              <AlertTriangle className="h-4 w-4" /> تنبيهات يجب أخذها بالاعتبار
            </div>
            <ul className="list-disc ps-5 text-amber-700/90 dark:text-amber-300/90 space-y-0.5">
              {warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrustItem({ ok, icon, label, value }: { ok: boolean; icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={`rounded-lg border p-3 ${ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/60 bg-muted/20"}`}>
      <div className={`flex items-center gap-1 text-xs ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
        {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="mt-1 text-sm font-bold flex items-center gap-1">{icon}{value}</div>
    </div>
  );
}

function AchievementsStrip({ achievements }: { achievements: any[] }) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 mb-2">
        <Award className="h-4 w-4 text-amber-500" />
        <h3 className="font-bold">الإنجازات ({achievements.length})</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {achievements.slice(0, 12).map((a) => (
          <div key={a.id} title={a.name_ar} className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium flex items-center gap-1">
            <span>{a.icon || "🏆"}</span>
            <span>{a.name_ar}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectListCard({ project, isOwner, ownerId, ownerName }: { project: any; isOwner: boolean; ownerId: string; ownerName: string }) {
  const remaining = (project.shares_total ?? 0) - (project.shares_sold ?? 0);
  const currency = project.currency || "SAR";
  return (
    <Card className="overflow-hidden border-border/60 hover:border-primary/50 transition">
      <div className="flex flex-col sm:flex-row">
        {project.cover_image_url && (
          <Link to="/projects/$id" params={{ id: project.id }} className="sm:w-48 shrink-0">
            <img src={project.cover_image_url} alt={project.name} className="h-40 sm:h-full w-full object-cover" />
          </Link>
        )}
        <CardContent className="flex-1 p-4 space-y-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <Link to="/projects/$id" params={{ id: project.id }} className="font-bold text-lg hover:underline">{project.name}</Link>
            <Badge variant="secondary">{project.sector || "—"}</Badge>
          </div>
          {project.description && <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
            <span><TrendingUp className="inline h-3 w-3 ms-1" /> سعر السهم: {Number(project.current_price ?? project.share_price ?? 0).toLocaleString("ar")} {currency}</span>
            <span>متبقي: {remaining.toLocaleString("ar")} / {(project.shares_total ?? 0).toLocaleString("ar")}</span>
            <span>👁 {project.views_count ?? 0}</span>
          </div>
          {!isOwner && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Link to="/projects/$id" params={{ id: project.id }}>
                <Button size="sm">شراء فوري</Button>
              </Link>
              <Link to="/projects/$id" params={{ id: project.id }}>
                <Button size="sm" variant="outline">تقديم عرض</Button>
              </Link>
              <DmButton ownerId={ownerId} ownerName={ownerName} compact />
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

function DmButton({ ownerId, ownerName, compact }: { ownerId: string; ownerName: string | null; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const nav = useNavigate();
  const start = useServerFn(openConversation);
  const send = useServerFn(sendMessage);
  const m = useMutation({
    mutationFn: async () => {
      const { conversationId } = await start({ data: { otherUserId: ownerId } });
      if (msg.trim()) await send({ data: { conversationId, content: msg.trim() } });
      return conversationId;
    },
    onSuccess: (cid) => { toast.success("تم فتح المحادثة"); setOpen(false); nav({ to: "/messages", search: { c: cid } as any }); },
    onError: (e: any) => toast.error(e?.message || "تعذر فتح المحادثة"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={compact ? "sm" : "default"} variant={compact ? "ghost" : "default"}>
          <MessageCircle className="h-4 w-4 ms-1" /> رسالة خاصة
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>رسالة إلى {ownerName || "المستخدم"}</DialogTitle></DialogHeader>
        <Textarea rows={5} placeholder="اكتب رسالتك..." value={msg} onChange={(e) => setMsg(e.target.value)} />
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !msg.trim()}>
            {m.isPending ? "..." : "إرسال"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FollowChip({ targetId }: { targetId: string }) {
  const [following, setFollowing] = useState(false);
  useEffect(() => {
    supabase.from("community_follows").select("follower_id").eq("follower_id", (window as any).__uid ?? "").eq("followee_id", targetId).maybeSingle().then(({ data }) => setFollowing(!!data));
  }, [targetId]);
  const toggle = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("سجّل الدخول أولاً");
    if (following) {
      await supabase.from("community_follows").delete().eq("follower_id", u.user.id).eq("followee_id", targetId);
      setFollowing(false);
    } else {
      const { error } = await supabase.from("community_follows").insert({ follower_id: u.user.id, followee_id: targetId });
      if (error) return toast.error(error.message);
      setFollowing(true);
    }
  };
  return (
    <Button variant={following ? "outline" : "default"} onClick={toggle}>
      <UserPlus className="h-4 w-4 ms-1" /> {following ? "متابَع" : "متابعة"}
    </Button>
  );
}
