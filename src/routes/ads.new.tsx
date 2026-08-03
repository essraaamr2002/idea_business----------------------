import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Loader2, Megaphone, Upload, Wallet as WalletIcon } from "lucide-react";
import { ARAB_CURRENCIES } from "@/lib/currencies";
import { createAdCampaign, launchAdCampaign } from "@/lib/ads.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/ads/new")({
  head: () => ({ meta: [{ title: "إنشاء إعلان جديد" }] }),
  component: NewAdPage,
});

const COUNTRIES = [
  "SA","AE","KW","QA","BH","OM","EG","JO","IQ","LB","MA","TN","DZ","LY","SD","YE","SY","PS","US",
];
const COUNTRY_NAMES: Record<string, string> = {
  SA: "السعودية", AE: "الإمارات", KW: "الكويت", QA: "قطر", BH: "البحرين", OM: "عُمان",
  EG: "مصر", JO: "الأردن", IQ: "العراق", LB: "لبنان", MA: "المغرب", TN: "تونس",
  DZ: "الجزائر", LY: "ليبيا", SD: "السودان", YE: "اليمن", SY: "سوريا", PS: "فلسطين", US: "أمريكا",
};

function NewAdPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const createFn = useServerFn(createAdCampaign);
  const launchFn = useServerFn(launchAdCampaign);

  const [step, setStep] = useState(1);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    projectId: null as string | null,
    headline: "",
    body: "",
    mediaUrl: null as string | null,
    mediaType: null as "image" | "video" | null,
    ctaLabel: "اعرف المزيد",
    ctaUrl: "",
    dailyBudget: 50,
    durationDays: 7,
    currency: "SAR",
    objective: "views" as "views" | "investors" | "shares",
    targeting: {
      countries: [] as string[],
      age_min: 18,
      age_max: 65,
      gender: "any" as "any" | "male" | "female",
      audience_type: "all" as "all" | "investor" | "founder",
      interests: [] as string[],
    },
  });

  const totalBudget = useMemo(() => Number((form.dailyBudget * form.durationDays).toFixed(2)), [form.dailyBudget, form.durationDays]);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [loading, user, nav]);
  useEffect(() => {
    if (!user) return;
    supabase.from("projects").select("id, name").eq("owner_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setProjects((data as any) ?? []));
    supabase.from("wallets").select("balance, currency").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWalletBalance(Number((data as any).balance ?? 0));
          setForm((f) => ({ ...f, currency: (data as any).currency ?? "SAR" }));
        }
      });
  }, [user?.id]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 30 * 1024 * 1024) { toast.error("الحد الأقصى 30 ميغابايت"); return; }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("ad-media").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      // الحاوية خاصة — نولّد رابطًا موقّعًا طويل الأمد (~10 سنوات)
      const { data: signed, error: signErr } = await supabase.storage
        .from("ad-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl) throw signErr || new Error("تعذّر إنشاء رابط الوسائط");
      setForm((f) => ({
        ...f,
        mediaUrl: signed.signedUrl,
        mediaType: file.type.startsWith("video") ? "video" : "image",
      }));
      toast.success("تم رفع الوسائط");
    } catch (e: any) {
      toast.error(e.message || "فشل الرفع");
    } finally { setUploading(false); }
  };

  const canNext = () => {
    if (step === 1) return true; // project optional
    if (step === 2) {
      // يكفي وجود واحد على الأقل: نص أو عنوان أو وسائط
      const hasContent =
        form.headline.trim().length >= 3 ||
        form.body.trim().length >= 1 ||
        !!form.mediaUrl;
      // رابط الوجهة اختياري، لكن إن كُتب يجب أن يكون صحيحًا
      const ctaOk = !form.ctaUrl || /^https?:\/\//.test(form.ctaUrl);
      return hasContent && ctaOk;
    }
    if (step === 3) return form.dailyBudget > 0 && form.durationDays >= 1;
    return true;
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const headline = form.headline.trim() || (form.body.trim().slice(0, 60)) || "إعلان";
      const ctaUrl = form.ctaUrl.trim()
        || (form.projectId && typeof window !== "undefined" ? `${window.location.origin}/projects/${form.projectId}` : "")
        || (typeof window !== "undefined" ? window.location.origin : "https://busniss.org");
      const { id, total } = await createFn({ data: {
        projectId: form.projectId,
        headline,
        body: form.body || undefined,
        mediaUrl: form.mediaUrl,
        mediaType: form.mediaType,
        ctaLabel: form.ctaLabel,
        ctaUrl,
        dailyBudget: form.dailyBudget,
        durationDays: form.durationDays,
        currency: form.currency,
        objective: form.objective,
        targeting: form.targeting,
      } });
      const r = await launchFn({ data: { id } });
      if (r.status === "active") {
        toast.success("✅ تم إطلاق الحملة! المبلغ المخصوم: " + total + " " + form.currency);
        nav({ to: "/ads" });
      } else {
        toast.info("الرصيد غير كافٍ. الرجاء شحن المحفظة ثم إطلاق الحملة من لوحة الإعلانات.");
        nav({ to: "/wallet" });
      }
    } catch (e: any) {
      toast.error(e.message || "فشل إنشاء الحملة");
    } finally { setSubmitting(false); }
  };

  return (
    <WorkspaceShell>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3"><Megaphone className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-extrabold">إنشاء إعلان جديد</h1>
            <p className="text-sm text-muted-foreground">حملة إعلانية مستهدفة لجمهور محدد.</p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex-1 flex items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{s}</div>
              {s < 4 && <div className={`flex-1 h-0.5 mx-2 ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <Card>
          {step === 1 && (
            <>
              <CardHeader><CardTitle>١. الهدف من الإعلان</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">اختر مشروعًا للترويج له، أو أنشئ إعلانًا بدون مشروع لرابط خارجي.</p>
                <button
                  onClick={() => setForm({ ...form, projectId: null })}
                  className={`w-full rounded-xl border-2 p-4 text-start transition ${form.projectId === null ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="font-bold">إعلان بدون مشروع</div>
                  <div className="text-xs text-muted-foreground">للترويج لصفحة هبوط أو رابط خارجي.</div>
                </button>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setForm({ ...form, projectId: p.id, ctaUrl: form.ctaUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/projects/${p.id}` })}
                    className={`w-full rounded-xl border-2 p-4 text-start transition ${form.projectId === p.id ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <div className="font-bold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">يربط CTA تلقائيًا بصفحة المشروع.</div>
                  </button>
                ))}
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>٢. المحتوى الإبداعي</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">يكفي إضافة <strong>أحد</strong> العناصر التالية: نص أو عنوان أو صورة/فيديو.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>العنوان</Label>
                  <Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} maxLength={120} placeholder="عنوان جذاب وقصير (اختياري)" />
                </div>
                <div>
                  <Label>النص الإعلاني</Label>
                  <Textarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={1000} placeholder="وصف يشجع المشاهد على النقر (اختياري)" />
                </div>
                <div>
                  <Label>صورة أو فيديو (اختياري)</Label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border p-4 hover:bg-muted/30">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <span className="text-sm">{form.mediaUrl ? "تم الرفع — انقر للاستبدال" : "اختر ملف صورة/فيديو (حتى 30MB)"}</span>
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  </label>
                  {form.mediaUrl && form.mediaType === "image" && <img src={form.mediaUrl} alt="" className="mt-2 max-h-40 rounded-lg" />}
                  {form.mediaUrl && form.mediaType === "video" && <video src={form.mediaUrl} className="mt-2 max-h-40 rounded-lg" controls />}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>نص الزر (CTA)</Label>
                    <Input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} maxLength={40} />
                  </div>
                  <div>
                    <Label>رابط الوجهة (اختياري)</Label>
                    <Input value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} placeholder="https://" />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader><CardTitle>٣. الميزانية والمدة</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label>الميزانية اليومية *</Label>
                    <Input type="number" min={1} step={1} value={form.dailyBudget} onChange={(e) => setForm({ ...form, dailyBudget: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>العملة</Label>
                    <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ARAB_CURRENCIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>عدد الأيام *</Label>
                  <Input type="number" min={1} max={60} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Math.min(60, Math.max(1, Number(e.target.value))) })} />
                </div>
                <div className="rounded-xl bg-muted/50 p-4 space-y-1.5">
                  <div className="flex justify-between text-sm"><span>المجموع</span><strong className="text-base">{totalBudget.toLocaleString("ar")} {form.currency}</strong></div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><WalletIcon className="h-3 w-3" /> رصيد محفظتك</span>
                    <strong className={walletBalance < totalBudget ? "text-destructive" : ""}>
                      {walletBalance.toLocaleString("ar")} {form.currency}
                    </strong>
                  </div>
                  {walletBalance < totalBudget && (
                    <p className="text-xs text-amber-600">رصيدك أقل من الإجمالي. ستُنقل إلى صفحة شحن المحفظة بعد الإنشاء.</p>
                  )}
                </div>
              </CardContent>
            </>
          )}

          {step === 4 && (
            <>
              <CardHeader><CardTitle>٤. الجمهور والهدف</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>غرض الإعلان</Label>
                  <Select value={form.objective} onValueChange={(v: any) => setForm({ ...form, objective: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="views">زيادة المشاهدات</SelectItem>
                      <SelectItem value="investors">جذب مستثمرين</SelectItem>
                      <SelectItem value="shares">التسويق لأسهم في السوق الموازي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>نوع الجمهور</Label>
                  <Select value={form.targeting.audience_type} onValueChange={(v: any) => setForm({ ...form, targeting: { ...form.targeting, audience_type: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الجميع</SelectItem>
                      <SelectItem value="investor">مستثمرون</SelectItem>
                      <SelectItem value="founder">أصحاب مشاريع</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الدول (اتركها فارغة لاستهداف جميع الدول)</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {COUNTRIES.map((c) => {
                      const on = form.targeting.countries.includes(c);
                      return (
                        <button
                          key={c}
                          onClick={() => setForm({ ...form, targeting: { ...form.targeting, countries: on ? form.targeting.countries.filter((x) => x !== c) : [...form.targeting.countries, c] } })}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${on ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                        >
                          {COUNTRY_NAMES[c]}
                        </button>
                      );
                    })}
                  </div>
                  {form.targeting.countries.length > 0 && (
                    <Badge variant="secondary" className="mt-2">{form.targeting.countries.length} دولة محددة</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>العمر من</Label>
                    <Input type="number" min={0} max={99} value={form.targeting.age_min} onChange={(e) => setForm({ ...form, targeting: { ...form.targeting, age_min: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <Label>إلى</Label>
                    <Input type="number" min={1} max={99} value={form.targeting.age_max} onChange={(e) => setForm({ ...form, targeting: { ...form.targeting, age_max: Number(e.target.value) } })} />
                  </div>
                </div>
                <div>
                  <Label>الجنس</Label>
                  <Select value={form.targeting.gender} onValueChange={(v: any) => setForm({ ...form, targeting: { ...form.targeting, gender: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">الكل</SelectItem>
                      <SelectItem value="male">ذكور</SelectItem>
                      <SelectItem value="female">إناث</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </>
          )}

          <div className="flex items-center justify-between border-t border-border p-4">
            <Button variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>
              <ChevronRight className="h-4 w-4" /> السابق
            </Button>
            {step < 4 ? (
              <Button disabled={!canNext()} onClick={() => setStep(step + 1)} className="gradient-primary text-primary-foreground font-bold">
                التالي <ChevronLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button disabled={submitting} onClick={submit} className="gradient-primary text-primary-foreground font-bold">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "إطلاق الحملة الآن"}
              </Button>
            )}
          </div>
        </Card>
      </main>
    </WorkspaceShell>
  );
}
