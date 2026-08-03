import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getProjectPublic, createInvestmentOffer, respondToInvestmentOffer, listProjectOffers, postOfferMessage, listOfferMessages } from "@/lib/investment-offers.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TrendingUp, Handshake, MessageSquare, Coins, MessageCircle, Sparkles, Users } from "lucide-react";
import { ShareButtons } from "@/components/ShareButtons";
import { openConversation, sendMessage } from "@/lib/messages.functions";
import { useNavigate } from "@tanstack/react-router";

import { ROISlider } from "@/components/ROISlider";
import { FollowSectorButton } from "@/components/FollowSectorButton";
import { OwnerInsightsPanel } from "@/components/OwnerInsightsPanel";
import { DownloadContractButton } from "@/components/DownloadContractButton";
import { createPartnershipRequest } from "@/lib/project-intel.functions";
import { ProjectQA } from "@/components/ProjectQA";
import { ProjectReviews } from "@/components/ProjectReviews";
import { ProjectUpdates } from "@/components/ProjectUpdates";
import { TrustBadges } from "@/components/TrustBadges";
import { NegotiationPanel } from "@/components/NegotiationPanel";
import { ProjectAuctionPanel } from "@/components/ProjectAuctionPanel";
import { ProjectShareLotBidsPanel } from "@/components/ProjectShareLotBidsPanel";
import { MarketFeaturesToolbar } from "@/components/MarketFeatures";
import { WatchlistButton } from "@/components/WatchlistButton";
import { submitUrlsForIndexing } from "@/lib/seo-index.functions";

export const Route = createFileRoute("/projects/$id")({
  loader: async ({ params }) => {
    const project = await getProjectPublic({ data: { id: params.id } });
    if (!project) throw notFound();
    return { project };
  },
  errorComponent: ({ error }) => (
    <div className="container mx-auto p-8 text-center text-red-600">حدث خطأ: {String(error?.message || error)}</div>
  ),
  notFoundComponent: () => (
    <div className="container mx-auto p-8 text-center">المشروع غير موجود</div>
  ),
  head: ({ params, loaderData }) => {
    const p: any = loaderData?.project ?? {};
    const url = `https://busniss.org/projects/${params.id}`;
    const title = `${p.name ?? "مشروع"} — IDEA BUSINESS`;
    const desc = (p.description ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
    const img = p.cover_image_url || "https://busniss.org/og-logo.png";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "robots", content: "index,follow,max-image-preview:large,max-snippet:-1" },
        { property: "og:title", content: p.name ?? "مشروع" },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: img },
        { property: "og:site_name", content: "IDEA BUSINESS" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: p.name ?? "مشروع" },
        { name: "twitter:description", content: desc },
        { name: "twitter:image", content: img },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: p.name,
            description: desc,
            image: img ? [img] : undefined,
            inLanguage: "ar",
            url,
            mainEntityOfPage: url,
            datePublished: p.created_at,
            dateModified: p.updated_at ?? p.created_at,
            author: { "@type": "Organization", name: "IDEA BUSINESS" },
            publisher: {
              "@type": "Organization",
              name: "IDEA BUSINESS",
              logo: { "@type": "ImageObject", url: "https://busniss.org/og-logo.png" },
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "الرئيسية", item: "https://busniss.org/" },
              { "@type": "ListItem", position: 2, name: "المشاريع", item: "https://busniss.org/community" },
              { "@type": "ListItem", position: 3, name: p.name ?? "مشروع", item: url },
            ],
          }),
        },
      ],
    };
  },
  component: ProjectDetail,
});

function ProjectDetail() {
  const { project } = Route.useLoaderData();
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const isOwner = me && me === project.owner_id;
  const remaining = (project.shares_total ?? 0) - (project.shares_sold ?? 0);
  const currency = project.currency || "SAR";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container mx-auto max-w-5xl p-4 sm:p-8 space-y-6">
        {project.cover_image_url && (
          <img src={project.cover_image_url} alt={project.name} className="w-full max-h-[420px] object-cover rounded-2xl border" />
        )}

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
              {project.sector && <Badge variant="secondary">{project.sector}</Badge>}
              {project.country && <Badge variant="outline">{project.country}{project.city ? ` — ${project.city}` : ""}</Badge>}
              <Badge>{project.status}</Badge>
              
              <FollowSectorButton sector={project.sector} />
            </div>
          </div>
          <div className="text-left">
            <div className="text-sm text-muted-foreground">المبلغ المطلوب</div>
            <div className="text-2xl font-bold text-primary">
              {Number(project.target_investment ?? project.total_cost ?? 0).toLocaleString("ar")} {currency}
            </div>
        </div>

        <div className="rounded-xl border border-border bg-card/60 p-3 backdrop-blur">
          <div className="mb-2 text-xs font-bold text-muted-foreground">شارك هذا المشروع</div>
          <ShareButtons url={`/projects/${project.id}`} title={project.name} />
        </div>

        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <StatCard icon={<Coins className="size-4" />} label="سعر السهم" value={`${Number(project.current_price ?? project.share_price ?? 0).toLocaleString("ar")} ${currency}`} />
          <StatCard icon={<TrendingUp className="size-4" />} label="أسهم متبقية" value={`${remaining.toLocaleString("ar")} / ${(project.shares_total ?? 0).toLocaleString("ar")}`} />
          <StatCard icon={<Handshake className="size-4" />} label="الحد الأدنى للصفقة" value={`${Number((project as any).min_share_lot ?? 100).toLocaleString("ar")} سهم`} />
        </div>


        
        {!isOwner && me && project.status === "active" && remaining > 0 && (
          <ROISlider
            sharePrice={Number(project.current_price ?? project.share_price ?? 0)}
            currency={currency}
            remaining={remaining}
            targetRoiPct={(project as any).target_roi_pct}
          />
        )}

        {project.description && (
          <Card>
            <CardHeader><CardTitle>عن المشروع</CardTitle></CardHeader>
            <CardContent className="whitespace-pre-wrap leading-7 text-foreground/90">{project.description}</CardContent>
          </Card>
        )}

        {!isOwner && me && project.status === "active" && remaining > 0 && (
          <InvestActions
            projectId={project.id}
            currency={currency}
            sharePrice={Number(project.current_price ?? project.share_price ?? 0)}
            remaining={remaining}
          />
        )}

        {!isOwner && me && project.owner_id && (
          <div className="flex flex-wrap gap-2">
            <Link to="/u/$username" params={{ username: project.owner_id }}>
              <Button variant="outline">عرض ملف صاحب المشروع</Button>
            </Link>
            <DirectMessageButton ownerId={project.owner_id} projectName={project.name} />
            <PartnershipButton projectId={project.id} projectName={project.name} />
          </div>
        )}

        {isOwner && <OwnerInsightsPanel projectId={project.id} />}
        {isOwner && <SubmitToSearchEnginesCard projectId={project.id} />}

        {me && <MarketFeaturesToolbar projectId={project.id} sellerId={project.owner_id} isOwner={!!isOwner} />}

        {!me && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <p className="mb-3">سجّل دخولك للاستثمار في هذا المشروع.</p>
              <Button asChild><Link to="/auth">تسجيل الدخول</Link></Button>
            </CardContent>
          </Card>
        )}

        {isOwner && <OwnerOffersPanel projectId={project.id} currency={currency} />}
        {me && !isOwner && <InvestorThread projectId={project.id} />}

        {/* Trust + Watchlist row */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
          <TrustBadges project={project} />
          {me && !isOwner && <WatchlistButton projectId={project.id} />}
        </div>

        {/* Negotiation panel (investors only) */}
        {me && !isOwner && <NegotiationPanel projectId={project.id} currentUserId={me} />}

        {/* Auctions & Tenders */}
        <ProjectAuctionPanel projectId={project.id} isOwner={!!isOwner} currency={currency} servicesEnabled={(project as any).services_enabled ?? {}} />

        {/* Share-lot bids & tenders (per the new bidding/tender system) */}
        <ProjectShareLotBidsPanel
          projectId={project.id}
          isOwner={!!isOwner}
          currentUserId={me}
          basePrice={Number(project.current_price ?? project.share_price ?? 0)}
          minShareLot={Number((project as any).min_share_lot ?? 100)}
          currency={currency}
          remainingShares={remaining}
        />


        {/* Updates + Q&A + Reviews grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <ProjectUpdates projectId={project.id} isOwner={!!isOwner} />
          <ProjectQA projectId={project.id} isOwner={!!isOwner} />
        </div>
        <ProjectReviews projectId={project.id} canReview={!!me && !isOwner} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">{icon}{label}</div>
        <div className="text-xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

// ---------- Submit to Search Engines (owner) ----------
function SubmitToSearchEnginesCard({ projectId }: { projectId: string }) {
  const submit = useServerFn(submitUrlsForIndexing);
  const [busy, setBusy] = useState(false);
  type LogRow = { engine: string; status: string; code: number | null; note?: string };
  const [logs, setLogs] = useState<LogRow[]>([]);
  const run = async () => {
    setBusy(true);
    try {
      const url = `https://busniss.org/projects/${projectId}`;
      const res = await submit({ data: { urls: [url] } });
      setLogs(res.logs);
      const ok = res.logs.filter((l) => l.status === "sent").length;
      if (ok > 0) toast.success(`تم إرسال طلب الأرشفة إلى ${ok} محرك`);
      else toast.error("لم يُقبل أي محرك — راجع التفاصيل");
    } catch (e: any) {
      toast.error(e?.message || "فشل الإرسال");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="size-4 text-amber-600" />
          أرشفة المشروع في محركات البحث (Google / Bing / Yandex)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          عند الضغط، نُرسل رابط مشروعك فوراً إلى IndexNow (Bing + Yandex) + Google Indexing API + ping للسايتماب. عادةً يظهر المشروع في نتائج البحث خلال دقائق إلى ساعات.
          العنوان والوصف الذي سيظهر في Google مأخوذ من اسم ووصف مشروعك.
        </p>
        <Button onClick={run} disabled={busy} size="sm">
          {busy ? "جارٍ الإرسال…" : "أرشف الآن في محركات البحث"}
        </Button>
        {logs.length > 0 && (
          <div className="text-xs space-y-1 pt-2 border-t">
            {logs.map((l, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span>{l.engine}</span>
                <span className={l.status === "sent" ? "text-green-600" : "text-red-600"}>
                  {l.status} {l.code ? `(${l.code})` : ""} {l.note ? `· ${l.note}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function InvestActions({ projectId, currency, sharePrice, remaining }: { projectId: string; currency: string; sharePrice: number; remaining: number }) {
  const [openOffer, setOpenOffer] = useState(false);
  const [openBuy, setOpenBuy] = useState(false);
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-5 flex flex-wrap gap-3 justify-between items-center">
        <div>
          <div className="font-semibold text-lg">استثمر في هذا المشروع</div>
          <div className="text-sm text-muted-foreground">اشتر بسعر السوق مباشرة أو فاوض المالك على عرض خاص.</div>
        </div>
        <div className="flex gap-2">
          <Dialog open={openBuy} onOpenChange={setOpenBuy}>
            <DialogTrigger asChild><Button><TrendingUp className="size-4 ml-1" />شراء فوري</Button></DialogTrigger>
            <BuyNowDialog projectId={projectId} currency={currency} sharePrice={sharePrice} remaining={remaining} onClose={() => setOpenBuy(false)} />
          </Dialog>
          <Dialog open={openOffer} onOpenChange={setOpenOffer}>
            <DialogTrigger asChild><Button variant="outline"><Handshake className="size-4 ml-1" />تفاوض — إرسال عرض</Button></DialogTrigger>
            <MakeOfferDialog projectId={projectId} currency={currency} sharePrice={sharePrice} remaining={remaining} onClose={() => setOpenOffer(false)} />
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

function BuyNowDialog({ projectId, currency, sharePrice, remaining, onClose }: any) {
  const [shares, setShares] = useState(1);
  const [success, setSuccess] = useState<{ txRef: string; shares: number } | null>(null);
  const { project } = Route.useLoaderData();
  const [me, setMe] = useState<any>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMe(data.user)); }, []);
  const total = shares * sharePrice;
  const m = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("buy_shares", { _project_id: projectId, _shares: shares });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (orderId) => { toast.success("تمت عملية الشراء بنجاح"); setSuccess({ txRef: orderId, shares }); },
    onError: (e: any) => toast.error(e.message || "تعذر تنفيذ الشراء"),
  });
  return (
    <DialogContent dir="rtl">
      <DialogHeader><DialogTitle>{success ? "تم الشراء بنجاح" : "شراء أسهم بسعر السوق"}</DialogTitle></DialogHeader>
      {!success ? (
        <>
          <div className="space-y-3">
            <label className="text-sm">عدد الأسهم (الحد الأقصى {remaining})</label>
            <Input type="number" min={1} max={remaining} value={shares} onChange={(e) => setShares(Math.max(1, Math.min(remaining, Number(e.target.value) || 1)))} />
            <div className="text-sm text-muted-foreground">سعر السهم: {sharePrice.toLocaleString("ar")} {currency}</div>
            <div className="font-bold">الإجمالي: {total.toLocaleString("ar")} {currency}</div>
          </div>
          <DialogFooter>
            <Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "..." : "تأكيد الشراء"}</Button>
          </DialogFooter>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">تم تخصيص {success.shares} سهم باسمك. يمكنك تحميل مسودة العقد الآن:</p>
          <DownloadContractButton
            projectName={project.name}
            investorName={me?.user_metadata?.display_name || me?.email || "مستثمر"}
            ownerName={"صاحب المشروع"}
            shares={success.shares}
            pricePerShare={sharePrice}
            currency={currency}
            txReference={success.txRef}
          />
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>إغلاق</Button>
          </DialogFooter>
        </div>
      )}
    </DialogContent>
  );
}


function PartnershipButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(`مرحباً، أرغب في شراكة تنفيذية على مشروع "${projectName}". خبرتي/مساهمتي المقترحة:`);
  const fn = useServerFn(createPartnershipRequest);
  const m = useMutation({
    mutationFn: () => fn({ data: { project_id: projectId, message: msg } }),
    onSuccess: () => { toast.success("تم إرسال طلب الشراكة"); setOpen(false); },
    onError: (e: any) => toast.error(e.message || "فشل الإرسال"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Users className="size-4 ml-1" />طلب شراكة تنفيذية</Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>طلب شراكة (شريك مؤسس)</DialogTitle></DialogHeader>
        <Textarea rows={6} value={msg} onChange={(e) => setMsg(e.target.value)} />
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={m.isPending || msg.trim().length < 10}>{m.isPending ? "..." : "إرسال الطلب"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MakeOfferDialog({ projectId, currency, sharePrice, remaining, onClose }: any) {
  const [amount, setAmount] = useState<number>(sharePrice * 10);
  const [shares, setShares] = useState<number>(10);
  const [message, setMessage] = useState("");
  const create = useServerFn(createInvestmentOffer);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => create({ data: { project_id: projectId, amount, shares, message: message || undefined } }),
    onSuccess: () => { toast.success("تم إرسال العرض إلى صاحب المشروع"); qc.invalidateQueries({ queryKey: ["offers", projectId] }); onClose(); },
    onError: (e: any) => toast.error(e.message || "تعذر إرسال العرض"),
  });
  return (
    <DialogContent dir="rtl">
      <DialogHeader><DialogTitle>إرسال عرض تفاوض</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">المبلغ ({currency})</label>
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="text-sm">عدد الأسهم (≤ {remaining})</label>
            <Input type="number" min={1} max={remaining} value={shares} onChange={(e) => setShares(Number(e.target.value) || 1)} />
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          سعر السهم في عرضك: {shares > 0 ? (amount / shares).toFixed(2) : 0} {currency} (السوق: {sharePrice.toLocaleString("ar")} {currency})
        </div>
        <Textarea placeholder="رسالة لصاحب المشروع (اختياري)" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <DialogFooter>
        <Button onClick={() => m.mutate()} disabled={m.isPending || amount <= 0 || shares <= 0}>{m.isPending ? "..." : "إرسال العرض"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ---------- Owner panel ----------
function OwnerOffersPanel({ projectId, currency }: { projectId: string; currency: string }) {
  const list = useServerFn(listProjectOffers);
  const { data: offers = [], refetch } = useQuery({
    queryKey: ["offers", projectId],
    queryFn: () => list({ data: { project_id: projectId } }),
  });
  return (
    <Card>
      <CardHeader><CardTitle>عروض الاستثمار الواردة</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {offers.length === 0 && <div className="text-muted-foreground text-sm">لا توجد عروض بعد.</div>}
        {offers.map((o: any) => (
          <OfferRow key={o.id} offer={o} currency={currency} onChanged={refetch} isOwner />
        ))}
      </CardContent>
    </Card>
  );
}

function InvestorThread({ projectId }: { projectId: string }) {
  const list = useServerFn(listProjectOffers);
  const { data: offers = [], refetch } = useQuery({
    queryKey: ["offers", projectId],
    queryFn: () => list({ data: { project_id: projectId } }),
  });
  if (!offers.length) return null;
  return (
    <Card>
      <CardHeader><CardTitle>عروضي على هذا المشروع</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {offers.map((o: any) => <OfferRow key={o.id} offer={o} currency={o.currency} onChanged={refetch} />)}
      </CardContent>
    </Card>
  );
}

function OfferRow({ offer, currency, onChanged, isOwner }: { offer: any; currency: string; onChanged: () => void; isOwner?: boolean }) {
  const respond = useServerFn(respondToInvestmentOffer);
  const [counter, setCounter] = useState(false);
  const [cAmount, setCAmount] = useState<number>(offer.amount);
  const [cShares, setCShares] = useState<number>(offer.shares);
  const [note, setNote] = useState("");

  const m = useMutation({
    mutationFn: (action: "accept" | "reject" | "counter" | "withdraw") =>
      respond({ data: { offer_id: offer.id, action, note: note || undefined, counter_amount: action === "counter" ? cAmount : undefined, counter_shares: action === "counter" ? cShares : undefined } }),
    onSuccess: () => { toast.success("تم"); onChanged(); setCounter(false); },
    onError: (e: any) => toast.error(e.message || "فشل"),
  });

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-700",
    accepted: "bg-green-500/10 text-green-700",
    rejected: "bg-red-500/10 text-red-700",
    countered: "bg-blue-500/10 text-blue-700",
    withdrawn: "bg-gray-500/10 text-gray-700",
    expired: "bg-gray-500/10 text-gray-700",
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="font-semibold">{Number(offer.amount).toLocaleString("ar")} {currency} · {offer.shares} سهم</div>
          <div className="text-xs text-muted-foreground">سعر السهم: {Number(offer.price_per_share).toFixed(2)} · {new Date(offer.created_at).toLocaleString("ar")}</div>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${statusColor[offer.status] || ""}`}>{offer.status}</span>
      </div>
      {offer.message && <div className="text-sm bg-muted/40 rounded p-2">{offer.message}</div>}
      {offer.response_note && <div className="text-sm bg-muted/40 rounded p-2">رد: {offer.response_note}</div>}

      {offer.status === "pending" && isOwner && (
        <div className="space-y-2 pt-1">
          <Textarea placeholder="ملاحظة (اختياري)" value={note} onChange={(e) => setNote(e.target.value)} className="text-sm" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => m.mutate("accept")} disabled={m.isPending}>قبول</Button>
            <Button size="sm" variant="destructive" onClick={() => m.mutate("reject")} disabled={m.isPending}>رفض</Button>
            <Button size="sm" variant="outline" onClick={() => setCounter((s) => !s)}>عرض مضاد</Button>
          </div>
          {counter && (
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Input type="number" placeholder="المبلغ" value={cAmount} onChange={(e) => setCAmount(Number(e.target.value) || 0)} />
              <Input type="number" placeholder="الأسهم" value={cShares} onChange={(e) => setCShares(Number(e.target.value) || 1)} />
              <Button size="sm" className="col-span-2" onClick={() => m.mutate("counter")} disabled={m.isPending || cAmount <= 0 || cShares <= 0}>إرسال العرض المضاد</Button>
            </div>
          )}
        </div>
      )}

      {offer.status === "pending" && !isOwner && (
        <Button size="sm" variant="outline" onClick={() => m.mutate("withdraw")} disabled={m.isPending}>سحب العرض</Button>
      )}

      <OfferThread offerId={offer.id} />
    </div>
  );
}

function OfferThread({ offerId }: { offerId: string }) {
  const list = useServerFn(listOfferMessages);
  const post = useServerFn(postOfferMessage);
  const { data: msgs = [], refetch } = useQuery({
    queryKey: ["offer-thread", offerId],
    queryFn: () => list({ data: { offer_id: offerId } }),
  });
  const [body, setBody] = useState("");
  const m = useMutation({
    mutationFn: () => post({ data: { offer_id: offerId, body } }),
    onSuccess: () => { setBody(""); refetch(); },
    onError: (e: any) => toast.error(e.message || "تعذر إرسال الرسالة"),
  });
  return (
    <details className="pt-2">
      <summary className="cursor-pointer text-sm text-muted-foreground">محادثة التفاوض ({msgs.length})</summary>
      <div className="space-y-2 pt-2">
        {msgs.map((m: any) => (
          <div key={m.id} className="text-sm border rounded p-2"><b>•</b> {m.body}<div className="text-xs text-muted-foreground mt-1">{new Date(m.created_at).toLocaleString("ar")}</div></div>
        ))}
        <div className="flex gap-2">
          <Input placeholder="اكتب رسالة..." value={body} onChange={(e) => setBody(e.target.value)} />
          <Button size="sm" onClick={() => m.mutate()} disabled={!body.trim() || m.isPending}>إرسال</Button>
        </div>
      </div>
    </details>
  );
}

function DirectMessageButton({ ownerId, projectName }: { ownerId: string; projectName: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(`مرحباً، بخصوص مشروع "${projectName}"...`);
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
        <Button variant="outline"><MessageCircle className="size-4 ml-1" /> رسالة خاصة لصاحب المشروع</Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>رسالة خاصة</DialogTitle></DialogHeader>
        <Textarea rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} />
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={m.isPending || !msg.trim()}>
            {m.isPending ? "..." : "إرسال"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
