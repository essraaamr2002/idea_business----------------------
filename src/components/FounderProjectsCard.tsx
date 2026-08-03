import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Store, StoreIcon, Users, Eye, Heart, ExternalLink, BarChart3, MessageSquare, RefreshCw, Calendar } from "lucide-react";
import { toast } from "sonner";
import { listMyProjects, deleteMyProject, toggleMarketplaceListing, listProjectInvestors, bumpMyProject } from "@/lib/founder-dashboard.functions";
import { listProjectOffers, respondToInvestmentOffer } from "@/lib/investment-offers.functions";
import { OwnerInsightsPanel } from "@/components/OwnerInsightsPanel";
import { resolveStorageUrl } from "@/lib/storage-url";

export function FounderProjectsCard() {
  const list = useServerFn(listMyProjects);
  const { data: projects = [], isLoading } = useQuery({ queryKey: ["my-projects"], queryFn: () => list() });

  if (isLoading) return <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">جارٍ التحميل…</div>;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold">مشاريعي (لوحة المؤسس)</h2>
        <Link to="/projects/new" search={{ edit: undefined }} className="rounded-full bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground">+ فكرة جديدة</Link>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">لم تنشر أي فكرة بعد. ابدأ بنشر بزنستك الأولى!</p>
      ) : (
        <div className="space-y-3">
          {projects.map((p: any) => <FounderProjectRow key={p.id} project={p} />)}
        </div>
      )}
    </div>
  );
}

function FounderProjectRow({ project: p }: { project: any }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const del = useServerFn(deleteMyProject);
  const toggle = useServerFn(toggleMarketplaceListing);
  const bump = useServerFn(bumpMyProject);

  const delMut = useMutation({
    mutationFn: () => del({ data: { project_id: p.id } }),
    onSuccess: () => { toast.success("تم حذف المشروع"); qc.invalidateQueries({ queryKey: ["my-projects"] }); },
    onError: (e: any) => toast.error(e.message || "تعذر الحذف"),
  });
  const toggleMut = useMutation({
    mutationFn: (listed: boolean) => toggle({ data: { project_id: p.id, listed } }),
    onSuccess: (_d, listed) => { toast.success(listed ? "تم النقل للسوق الموازي" : "تم السحب من السوق الموازي"); qc.invalidateQueries({ queryKey: ["my-projects"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const bumpMut = useMutation({
    mutationFn: () => bump({ data: { project_id: p.id } }),
    onSuccess: () => { toast.success("تم تحديث/رفع المشروع — سيظهر للأعلى"); qc.invalidateQueries({ queryKey: ["my-projects"] }); },
    onError: (e: any) => toast.error(e.message || "تعذر التحديث"),
  });

  const fundedPct = p.shares_total ? Math.round(((p.shares_sold ?? 0) / p.shares_total) * 100) : 0;
  const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString("ar", { year: "numeric", month: "short", day: "numeric" }) : "—";
  const canBump = !p.last_bumped_at || (Date.now() - new Date(p.last_bumped_at).getTime()) >= 3 * 86400_000;
  const nextBumpAt = p.last_bumped_at ? new Date(new Date(p.last_bumped_at).getTime() + 3 * 86400_000) : null;

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {p.cover_image_url ? <img src={resolveStorageUrl(p.cover_image_url)} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}} /> : <div className="flex h-full items-center justify-center text-xl">💡</div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to="/projects/$id" params={{ id: p.id }} className="truncate font-bold hover:underline">{p.name}</Link>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.status === "active" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
            {p.marketplace_listed && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">في السوق الموازي</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {p.views_count ?? 0}</span>
            <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {p.likes_count ?? 0}</span>
            <span>التمويل: {fundedPct}%</span>
            <span>{p.shares_sold ?? 0} / {p.shares_total ?? 0} سهم</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1" title="تاريخ النشر"><Calendar className="h-3 w-3 text-emerald-600" /> نُشر: {fmt(p.created_at)}</span>
            <span className="inline-flex items-center gap-1" title="آخر تعديل"><Pencil className="h-3 w-3 text-amber-600" /> عُدّل: {fmt(p.updated_at)}</span>
            <span className="inline-flex items-center gap-1" title="آخر تحديث (رفع)"><RefreshCw className="h-3 w-3 text-primary" /> حُدّث: {fmt(p.last_bumped_at)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Link to="/projects/new" search={{ edit: p.id } as any} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-bold hover:bg-muted">
              <Pencil className="h-3 w-3" /> تعديل الإعلان
            </Link>
            <button
              onClick={() => bumpMut.mutate()}
              disabled={!canBump || bumpMut.isPending}
              title={canBump ? "تحديث ورفع المشروع لأعلى القائمة" : `التحديث القادم: ${nextBumpAt?.toLocaleString("ar")}`}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-3 w-3 ${bumpMut.isPending ? "animate-spin" : ""}`} />
              {canBump ? "تحديث (كل 3 أيام)" : `متاح ${nextBumpAt?.toLocaleDateString("ar")}`}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Link to="/projects/$id" params={{ id: p.id }} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] hover:bg-muted"><ExternalLink className="h-3 w-3" /> فتح</Link>
          <button onClick={() => setExpanded((x) => !x)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] hover:bg-muted"><BarChart3 className="h-3 w-3" /> {expanded ? "إخفاء" : "إدارة"}</button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
          <div className="flex flex-wrap gap-2">
            <Link to="/projects/new" search={{ edit: p.id } as any} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted">
              <Pencil className="h-3 w-3" /> تعديل
            </Link>
            <button
              onClick={() => toggleMut.mutate(!p.marketplace_listed)}
              disabled={toggleMut.isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"
            >
              {p.marketplace_listed ? <><StoreIcon className="h-3 w-3" /> سحب من السوق الموازي</> : <><Store className="h-3 w-3" /> نقل للسوق الموازي</>}
            </button>
            <button
              onClick={() => { if (confirm(`حذف المشروع "${p.name}"؟ هذا الإجراء نهائي.`)) delMut.mutate(); }}
              disabled={delMut.isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" /> حذف
            </button>
          </div>

          <OwnerInsightsPanel projectId={p.id} />
          <PendingOffersBlock projectId={p.id} />
          <InvestorsBlock projectId={p.id} />
        </div>
      )}
    </div>
  );
}

function PendingOffersBlock({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const listOffers = useServerFn(listProjectOffers);
  const respond = useServerFn(respondToInvestmentOffer);
  const { data: offers = [] } = useQuery({ queryKey: ["project-offers", projectId], queryFn: () => listOffers({ data: { project_id: projectId } }) });
  const pending = (offers as any[]).filter((o) => o.status === "pending");

  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "reject" }) => respond({ data: { offer_id: id, action } }),
    onSuccess: () => { toast.success("تم"); qc.invalidateQueries({ queryKey: ["project-offers", projectId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (pending.length === 0) return (
    <div className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">
      <MessageSquare className="inline h-3 w-3" /> لا توجد عروض معلّقة
    </div>
  );

  return (
    <div>
      <div className="mb-1 text-[11px] font-bold text-muted-foreground">عروض معلّقة ({pending.length})</div>
      <ul className="space-y-1.5">
        {pending.map((o: any) => (
          <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 p-2 text-xs">
            <div>
              <span className="font-bold">{Number(o.amount).toLocaleString()} {o.currency}</span>
              <span className="text-muted-foreground"> · {o.shares} سهم @ {Number(o.price_per_share).toFixed(2)}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => act.mutate({ id: o.id, action: "accept" })} disabled={act.isPending} className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">قبول</button>
              <button onClick={() => act.mutate({ id: o.id, action: "reject" })} disabled={act.isPending} className="rounded bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">رفض</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InvestorsBlock({ projectId }: { projectId: string }) {
  const listInv = useServerFn(listProjectInvestors);
  const { data: investors = [] } = useQuery({ queryKey: ["project-investors", projectId], queryFn: () => listInv({ data: { project_id: projectId } }) });

  if ((investors as any[]).length === 0) return (
    <div className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">
      <Users className="inline h-3 w-3" /> لا يوجد مستثمرون بعد
    </div>
  );

  return (
    <div>
      <div className="mb-1 text-[11px] font-bold text-muted-foreground">المستثمرون الحاليون ({(investors as any[]).length})</div>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {(investors as any[]).map((inv) => {
          const prof = inv.profiles;
          const name = prof?.use_alias_default ? (prof?.alias_name || "مستثمر") : (prof?.display_name || "مستثمر");
          return (
            <li key={inv.user_id} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {prof?.avatar_url
                  ? <img src={resolveStorageUrl(prof.avatar_url)} alt="" className="h-6 w-6 rounded-full object-cover" referrerPolicy="no-referrer" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none';}} />
                  : <div className="h-6 w-6 rounded-full bg-muted" />}
                <span className="truncate">{name}</span>
              </div>
              <span className="font-bold text-primary">{inv.shares} سهم</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
