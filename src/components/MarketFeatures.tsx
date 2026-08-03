// @ts-nocheck
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeProjectAI, boostProject, createEscrow, fileBuyerProtectionClaim, compareProjects } from "@/lib/market-features.functions";
import { Sparkles, ShieldCheck, Zap, Scale, FileSignature, TrendingUp, AlertTriangle, Flame, Trophy, Clock, Target, Users, Wallet, Bot, Star, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const BADGE_MAP: Record<string, { label: string; icon: any; cls: string }> = {
  trending:        { label: "رائج",        icon: TrendingUp, cls: "bg-rose-100 text-rose-700 border-rose-200" },
  hot_deal:        { label: "صفقة اليوم",  icon: Flame,      cls: "bg-orange-100 text-orange-700 border-orange-200" },
  ai_recommended:  { label: "موصى به AI",  icon: Sparkles,   cls: "bg-violet-100 text-violet-700 border-violet-200" },
  ending_soon:     { label: "ينتهي قريباً", icon: Clock,      cls: "bg-amber-100 text-amber-700 border-amber-200" },
  verified_seller: { label: "بائع موثّق",   icon: ShieldCheck, cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  top_rated:       { label: "الأعلى تقييماً", icon: Trophy,   cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
};

export function QualityBadges({ badges }: { badges?: string[] | null }) {
  if (!badges?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => {
        const m = BADGE_MAP[b];
        if (!m) return null;
        const Icon = m.icon;
        return (
          <span key={b} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${m.cls}`}>
            <Icon className="h-3 w-3" /> {m.label}
          </span>
        );
      })}
    </div>
  );
}

export function ProjectAIAnalysisCard({ projectId }: { projectId: string }) {
  const analyze = useServerFn(analyzeProjectAI);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("project_ai_analysis" as any).select("*").eq("project_id", projectId).maybeSingle()
      .then(({ data }) => setData(data));
  }, [projectId]);

  const run = async () => {
    setLoading(true);
    try {
      const res = await analyze({ data: { projectId } });
      setData(res);
      toast.success("تم تحليل المشروع");
    } catch (e: any) {
      toast.error(e?.message || "تعذّر التحليل");
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 dark:from-violet-950/20 dark:border-violet-800/40">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-black">
          <Bot className="h-4 w-4 text-violet-600" /> تحليل ذكي بالـ AI
        </h3>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          <Sparkles className="h-3.5 w-3.5 me-1" /> {data ? "تحديث" : "حلّل الآن"}
        </Button>
      </div>
      {!data && <p className="text-xs text-muted-foreground">احصل على تحليل ذكي شامل: ROI متوقع، درجة مخاطر، نقاط قوة وضعف.</p>}
      {data && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={Target} label="ROI" value={`${data.roi_estimate ?? "—"}%`} tone="emerald" />
            <Stat icon={AlertTriangle} label="مخاطر" value={`${Math.round(data.risk_score ?? 0)}/100`} tone="rose" />
            <Stat icon={Star} label="ملاءمة" value={`${Math.round(data.market_fit_score ?? 0)}/100`} tone="amber" />
          </div>
          {data.ai_summary && <p className="text-xs leading-relaxed text-foreground">{data.ai_summary}</p>}
          <div className="grid grid-cols-2 gap-2">
            <List title="نقاط القوة" items={data.strengths} tone="emerald" />
            <List title="نقاط الضعف" items={data.weaknesses} tone="rose" />
            <List title="الفرص" items={data.opportunities} tone="sky" />
            <List title="التهديدات" items={data.threats} tone="amber" />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: any) {
  return (
    <div className={`rounded-lg border p-2 text-center bg-${tone}-50 border-${tone}-200`}>
      <Icon className={`mx-auto h-4 w-4 text-${tone}-600`} />
      <div className="mt-1 text-xs font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
function List({ title, items, tone }: any) {
  if (!items?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background/50 p-2">
      <div className={`mb-1 text-[10px] font-extrabold text-${tone}-700`}>{title}</div>
      <ul className="space-y-0.5 text-[11px] text-foreground">
        {items.slice(0, 4).map((i: string, n: number) => <li key={n} className="leading-tight">• {i}</li>)}
      </ul>
    </div>
  );
}

export function BoostProjectButton({ projectId }: { projectId: string }) {
  const boost = useServerFn(boostProject);
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const r = await boost({ data: { projectId, days } });
      toast.success(`تم تمييز المشروع لمدة ${days} يوم — التكلفة $${r.cost}`);
      setOpen(false);
    } catch (e: any) { toast.error(e?.message || "فشل التمييز"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50">
          <Zap className="h-3.5 w-3.5" /> ميّز المشروع
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>تمييز المشروع (Boost)</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">يظهر مشروعك في أعلى قوائم السوق بمبلغ $5 لكل يوم.</p>
        <div className="space-y-2">
          <label className="text-xs font-bold">عدد الأيام</label>
          <Input type="number" min={1} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} />
          <div className="text-sm font-bold">التكلفة الإجمالية: ${days * 5}</div>
        </div>
        <Button onClick={submit} disabled={loading}>{loading ? "جاري التنفيذ…" : "تأكيد التمييز"}</Button>
      </DialogContent>
    </Dialog>
  );
}

export function EscrowButton({ projectId, sellerId, suggestedAmount }: { projectId: string; sellerId: string; suggestedAmount?: number }) {
  const create = useServerFn(createEscrow);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(suggestedAmount || 1000);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await create({ data: { projectId, sellerId, amount, currency: "USD" } });
      toast.success("تم فتح حساب الضمان (Escrow) — الأموال محفوظة حتى إكمال الشروط");
      setOpen(false);
    } catch (e: any) { toast.error(e?.message || "فشل فتح Escrow"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
          <ShieldCheck className="h-3.5 w-3.5" /> ادفع عبر Escrow
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>حساب ضمان آمن</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          أموالك تبقى محتجزة لدى المنصة ولن تُحوّل للبائع إلا بعد إكمال الشروط واستلامك للمشروع.
        </p>
        <div className="space-y-2">
          <label className="text-xs font-bold">المبلغ (USD)</label>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <Button onClick={submit} disabled={loading}>{loading ? "جاري…" : "فتح Escrow"}</Button>
      </DialogContent>
    </Dialog>
  );
}

export function BuyerProtectionButton({ projectId, sellerId }: { projectId: string; sellerId: string }) {
  const file = useServerFn(fileBuyerProtectionClaim);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (reason.length < 20) { toast.error("اكتب سبباً واضحاً (20 حرفاً+)"); return; }
    setLoading(true);
    try {
      await file({ data: { projectId, sellerId, amount: amount || 1, currency: "USD", reason } });
      toast.success("تم تقديم طلب حماية المشتري — سيتم مراجعته خلال 48 ساعة");
      setOpen(false);
    } catch (e: any) { toast.error(e?.message || "فشل تقديم الطلب"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1 text-rose-600 hover:bg-rose-50">
          <Scale className="h-3.5 w-3.5" /> حماية المشتري
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>طلب استرداد ضمن نافذة الحماية (14 يوم)</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <label className="text-xs font-bold">المبلغ المطلوب استرداده</label>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          <label className="text-xs font-bold">سبب الاسترداد (تفصيلي)</label>
          <Textarea rows={5} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اشرح ما حدث بالتفصيل…" />
        </div>
        <Button onClick={submit} disabled={loading} variant="destructive">{loading ? "…" : "تقديم الطلب"}</Button>
      </DialogContent>
    </Dialog>
  );
}

export function MarketFeaturesToolbar({ projectId, sellerId, isOwner }: { projectId: string; sellerId: string; isOwner: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 p-2">
      <span className="text-[11px] font-extrabold text-muted-foreground">أدوات السوق:</span>
      {!isOwner && <EscrowButton projectId={projectId} sellerId={sellerId} />}
      {!isOwner && <BuyerProtectionButton projectId={projectId} sellerId={sellerId} />}
      {isOwner && <BoostProjectButton projectId={projectId} />}
      <span className="text-[10px] text-muted-foreground">
        <FileSignature className="inline h-3 w-3" /> عقود رقمية موقّعة · <Users className="inline h-3 w-3" /> شراء جماعي · <GitCompare className="inline h-3 w-3" /> مقارنة
      </span>
    </div>
  );
}
