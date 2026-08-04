import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Rocket,
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Loader2,
  Download,
  Shield,
  Users,
  User,
  Pencil,
} from "lucide-react";
import { ARAB_CURRENCIES, GUARANTEE_TYPES, type GuaranteeType } from "@/lib/currencies";
import {
  createProjectFromWizard,
  getMyProjectForEdit,
  updateMyProject,
} from "@/lib/project-wizard.functions";
import { AiAssistantPanel } from "@/components/project-wizard/AiAssistantPanel";
import { PageState } from "@/components/PageState";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/projects/new")({
  validateSearch: (s: Record<string, unknown>) => ({
    edit: typeof s.edit === "string" ? s.edit : undefined,
  }),
  head: () => ({
    meta: [
      { title: "أنشئ مشروعك — IDEA BUSINESS" },
      {
        name: "description",
        content: "معالج تفاعلي مدعوم بالذكاء الاصطناعي لإطلاق إعلان مشروعك في دقائق.",
      },
    ],
  }),
  component: NewProjectWizard,
});

const STEPS = [
  { key: "status", title: "حالة المشروع" },
  { key: "description", title: "الوصف والوسائط" },
  { key: "cost", title: "التكلفة والعملة" },
  { key: "funding", title: "نمط الاستثمار" },
  { key: "guarantee", title: "الضمانات" },
  { key: "shares", title: "الأسهم والإطلاق" },
] as const;

const ARAB_COUNTRIES = [
  "السعودية",
  "الإمارات",
  "الكويت",
  "قطر",
  "البحرين",
  "عُمان",
  "اليمن",
  "مصر",
  "السودان",
  "ليبيا",
  "تونس",
  "الجزائر",
  "المغرب",
  "موريتانيا",
  "الأردن",
  "فلسطين",
  "لبنان",
  "سوريا",
  "العراق",
  "الصومال",
  "جيبوتي",
  "جزر القمر",
];

type State = {
  is_existing: boolean;
  name: string;
  description: string;
  sector: string;
  country: string;
  media: string[];
  total_cost: number;
  currency: string;
  funding_mode: "marketplace" | "single_investor";
  publish_in_community: boolean;
  target_investment: number;
  shares_total: number;
  min_share_lot: number;
  guarantee_type: GuaranteeType;
  guarantee_amount: number;
  guarantee_currency: string;
  guarantor_full_name: string;
  guarantor_id_number: string;
  guarantee_doc_url: string;
  guarantee_notes: string;
};

function NewProjectWizard() {
  const { user, loading } = useAuth();
  const { lang, dir } = useI18n();
  const isEn = lang === "en";
  const router = useRouter();
  const { edit: editId } = Route.useSearch();
  const isEdit = !!editId;
  const submitFn = useServerFn(createProjectFromWizard);
  const updateFn = useServerFn(updateMyProject);
  const loadFn = useServerFn(getMyProjectForEdit);

  const [stepIdx, setStepIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEdit);
  const mediaRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const [s, setS] = useState<State>({
    is_existing: false,
    name: "",
    description: "",
    sector: "تكنولوجيا",
    country: "السعودية",
    media: [],
    total_cost: 100000,
    currency: "SAR",
    funding_mode: "marketplace",
    publish_in_community: true,
    target_investment: 50000,
    shares_total: 1000,
    min_share_lot: 100,
    guarantee_type: "sand_lamr",
    guarantee_amount: 50000,
    guarantee_currency: "SAR",
    guarantor_full_name: "",
    guarantor_id_number: "",
    guarantee_doc_url: "",
    guarantee_notes: "",
  });

  const set = <K extends keyof State>(k: K, v: State[K]) => setS((p) => ({ ...p, [k]: v }));

  // Prefill state in edit mode
  useEffect(() => {
    if (!isEdit || !editId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await loadFn({ data: { project_id: editId } });
        if (cancelled) return;
        const p: any = r.project;
        const g: any = r.guarantee;
        setS((prev) => ({
          ...prev,
          is_existing: !!p.is_existing,
          name: p.name ?? "",
          description: p.description ?? "",
          sector: p.sector ?? prev.sector,
          country: p.country ?? prev.country,
          media:
            Array.isArray(p.media_urls) && p.media_urls.length
              ? p.media_urls
              : p.cover_image_url
                ? [p.cover_image_url]
                : [],
          total_cost: Number(p.total_cost ?? prev.total_cost),
          currency: p.currency ?? prev.currency,
          funding_mode: p.funding_mode === "single_investor" ? "single_investor" : "marketplace",
          publish_in_community: !!p.marketplace_listed,
          target_investment: Number(p.target_investment ?? prev.target_investment),
          shares_total: Math.max(1000, Number(p.shares_total ?? prev.shares_total)),
          min_share_lot: Math.max(1, Number(p.min_share_lot ?? prev.min_share_lot ?? 100)),
          guarantee_type: (g?.guarantee_type as GuaranteeType) ?? prev.guarantee_type,
          guarantee_amount: Number(g?.amount ?? prev.guarantee_amount),
          guarantee_currency: g?.currency ?? p.currency ?? prev.guarantee_currency,
          guarantor_full_name: g?.guarantor_name ?? "",
          guarantor_id_number: g?.guarantor_id ?? "",
          guarantee_doc_url: g?.document_url ?? "",
          guarantee_notes: g?.notes ?? "",
        }));
      } catch (e: any) {
        toast.error(
          e?.message === "forbidden" ? "ليس لديك صلاحية تعديل هذا المشروع" : "تعذّر تحميل المشروع",
        );
        router.navigate({ to: "/dashboard" });
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, editId]);

  const step = STEPS[stepIdx];
  const ctx = useMemo(
    () => ({
      is_existing: s.is_existing,
      title: s.name,
      description: s.description,
      sector: s.sector,
      country: s.country,
      total_cost: s.total_cost,
      currency: s.currency,
      target_investment: s.target_investment,
      funding_mode: s.funding_mode,
      shares_total: s.shares_total,
      guarantee_type: s.guarantee_type,
    }),
    [s],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir={dir}>
        <main className="mx-auto max-w-3xl px-4 py-20">
          <PageState
            kind="loading"
            title={isEn ? "Checking your session" : "جارٍ فحص جلستك"}
            description={isEn ? "We are preparing the project wizard." : "نجهّز معالج إنشاء المشروع."}
          />
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background" dir={dir}>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h1 className="text-2xl font-bold">
              {isEn ? "Sign in to launch your project" : "سجّل الدخول لإطلاق مشروعك"}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
              {isEn
                ? "Project listings require an account so we can save drafts, attach guarantees, review ownership, and route investor conversations safely."
                : "إنشاء المشروع يحتاج حساباً حتى نحفظ المسودة، ونربط الضمانات، ونتحقق من الملكية، ونحمي تواصل المستثمرين داخل المنصة."}
            </p>
            <div className="mt-5 grid gap-2 text-start text-sm text-muted-foreground sm:grid-cols-3">
              <div className="rounded-xl border bg-background p-3">
                {isEn ? "Your draft is saved to your account." : "مسودتك تُحفظ داخل حسابك."}
              </div>
              <div className="rounded-xl border bg-background p-3">
                {isEn ? "Guarantees are reviewed before publishing." : "الضمانات تُراجع قبل النشر."}
              </div>
              <div className="rounded-xl border bg-background p-3">
                {isEn ? "Investors contact you safely in-platform." : "التواصل مع المستثمرين يتم بأمان."}
              </div>
            </div>
            <button
              onClick={() => router.navigate({ to: "/auth", search: { redirect: "/projects/new" } as never })}
              className="mt-6 rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground"
            >
              {isEn ? "Continue to sign in" : "المتابعة لتسجيل الدخول"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingEdit) {
    return (
      <div className="min-h-screen bg-background" dir={dir}>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
          جارٍ تحميل بيانات المشروع للتعديل…
        </div>
      </div>
    );
  }

  const uploadMedia = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    try {
      const out: string[] = [];
      for (const file of Array.from(files).slice(0, 8 - s.media.length)) {
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`${file.name}: الحجم يتجاوز 25MB`);
          continue;
        }
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/projects/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("community-media")
          .upload(path, file, { upsert: false });
        if (error) {
          toast.error(error.message);
          continue;
        }
        const { data: signed } = await supabase.storage
          .from("community-media")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed?.signedUrl) out.push(signed.signedUrl);
      }
      set("media", [...s.media, ...out]);
    } finally {
      setUploading(false);
      if (mediaRef.current) mediaRef.current.value = "";
    }
  };

  const uploadDoc = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    if (file.size > 15 * 1024 * 1024) {
      toast.error("الحجم يتجاوز 15MB");
      return;
    }
    setDocUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${user.id}/guarantees/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("kyc-documents")
        .upload(path, file, { upsert: false });
      if (error) {
        toast.error(error.message);
        return;
      }
      const { data: signed } = await supabase.storage
        .from("kyc-documents")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) {
        set("guarantee_doc_url", signed.signedUrl);
        toast.success("تم رفع المستند");
      }
    } finally {
      setDocUploading(false);
      if (docRef.current) docRef.current.value = "";
    }
  };

  const canNext = (): boolean => {
    switch (step.key) {
      case "status":
        return true;
      case "description":
        return s.name.trim().length >= 2 && s.description.trim().length >= 10;
      case "cost":
        return s.total_cost > 0 && !!s.currency;
      case "funding":
        return !!s.funding_mode;
      case "guarantee":
        return s.guarantee_amount > 0 && (!!s.guarantee_doc_url || s.guarantee_notes.length > 5);
      case "shares":
        return s.shares_total >= 1000 && s.target_investment > 0;
    }
  };

  const submit = async () => {
    if (!canNext()) return;
    setSubmitting(true);
    try {
      const payload = {
        is_existing: s.is_existing,
        name: s.name.trim(),
        description: s.description.trim(),
        sector: s.sector || "عام",
        country: s.country || "السعودية",
        total_cost: s.total_cost,
        currency: s.currency,
        funding_mode: s.funding_mode,
        publish_in_community: s.publish_in_community,
        target_investment: s.target_investment,
        shares_total: s.shares_total,
        min_share_lot: Math.max(1, Math.min(s.shares_total, s.min_share_lot || 100)),
        media_urls: s.media,
        guarantee: {
          type: s.guarantee_type,
          amount: s.guarantee_amount,
          currency: s.guarantee_currency,
          signed_document_url: s.guarantee_doc_url || undefined,
          guarantor_full_name: s.guarantor_full_name || undefined,
          guarantor_id_number: s.guarantor_id_number || undefined,
          notes: s.guarantee_notes || undefined,
        },
      };
      if (isEdit && editId) {
        await updateFn({ data: { project_id: editId, ...payload } });
        toast.success("تم حفظ التعديلات");
        router.navigate({ to: "/projects/$id", params: { id: editId } });
      } else {
        const r = await submitFn({ data: payload });
        toast.success(r.status === "pending_review" ? "تم الإرسال للمراجعة" : "تم حفظ المسوّدة");
        router.navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      console.error("[wizard.submit] failed", err);
      // Unwrap server-function / fetch errors so the user sees the real cause
      // instead of a generic "حدث خطأ" that looks like a programming bug.
      const raw =
        err?.message ||
        err?.error?.message ||
        err?.data?.message ||
        (typeof err === "string" ? err : "") ||
        "تعذّر إنشاء المشروع — تأكد من البيانات وحاول مجدداً";
      const msg = String(raw);
      if (msg.includes("quota_exceeded")) {
        const { notifyError } = await import("@/lib/quota");
        notifyError(new Error("quota_exceeded"));
      } else if (msg.toLowerCase().includes("unauthorized")) {
        toast.error("انتهت الجلسة — سجّل الدخول مجدداً", {
          action: { label: "تسجيل الدخول", onClick: () => router.navigate({ to: "/auth" }) },
        });
      } else {
        toast.error(isEdit ? "فشل حفظ التعديلات" : "فشل إطلاق المشروع", {
          description: msg.slice(0, 280),
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f8fb] dark:bg-background" dir={dir}>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-6 rounded-3xl border border-cyan-100 bg-white/90 p-5 shadow-[0_18px_55px_rgba(6,48,68,0.08)] dark:border-border dark:bg-card/80 sm:p-6">
          <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-2xl bg-primary/10 p-3">
            {isEdit ? (
              <Pencil className="h-5 w-5 text-primary" />
            ) : (
              <Rocket className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-tight text-primary-dark dark:text-foreground sm:text-3xl">{isEdit ? "تعديل المشروع" : "أنشئ إعلان مشروعك"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {isEdit
                ? "حدّث بيانات مشروعك في الخطوات الست — كل البيانات قابلة للتعديل."
                : "معالج ذكي من 6 خطوات — مدعوم بالذكاء الاصطناعي."}
            </p>
          </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6 overflow-x-auto rounded-2xl border border-cyan-100 bg-white/85 p-2 shadow-sm dark:border-border dark:bg-card/70">
          <div className="flex min-w-max items-center gap-2">
          {STEPS.map((st, i) => (
            <div key={st.key} className="flex items-center gap-2">
              <div
                className={`flex h-10 min-w-10 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 text-xs font-extrabold transition sm:px-4 ${
                  i < stepIdx
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : i === stepIdx
                      ? "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(6,182,212,0.22)]"
                      : "bg-slate-100 text-slate-600 dark:bg-muted dark:text-muted-foreground"
                }`}
              >
                {i < stepIdx ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                <span className="hidden md:inline">{st.title}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />}
            </div>
          ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Step content */}
          <div className="min-w-0 rounded-3xl border border-cyan-100 bg-white/95 p-5 shadow-[0_18px_55px_rgba(6,48,68,0.08)] dark:border-border dark:bg-card sm:p-6">
            <h2 className="mb-6 text-lg font-black text-foreground">
              {stepIdx + 1}. {step.title}
            </h2>

            {step.key === "status" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  هل المشروع قائم وعامل بالفعل، أم فكرة جديدة تبحث عن تمويل؟
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => set("is_existing", true)}
                    className={`min-h-28 rounded-2xl border p-5 text-start transition ${s.is_existing ? "border-primary bg-primary/10 shadow-[0_12px_30px_rgba(6,182,212,0.12)]" : "border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-white dark:border-border dark:bg-background"}`}
                  >
                    <div className="mb-2 text-lg font-bold">نعم، المشروع قائم</div>
                    <p className="text-xs leading-6 text-muted-foreground">
                      مشروع يعمل بالفعل ويحتاج لتوسعة أو رأس مال إضافي.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => set("is_existing", false)}
                    className={`min-h-28 rounded-2xl border p-5 text-start transition ${!s.is_existing ? "border-primary bg-primary/10 shadow-[0_12px_30px_rgba(6,182,212,0.12)]" : "border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-white dark:border-border dark:bg-background"}`}
                  >
                    <div className="mb-2 text-lg font-bold">لا، فكرة جديدة</div>
                    <p className="text-xs leading-6 text-muted-foreground">
                      فكرة لم تُنفّذ بعد وتبحث عن مستثمرين لتأسيسها.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {step.key === "description" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700">
                  <strong>تنبيه مهم:</strong> لا تُدرج وسائل تواصل مباشرة (جوال، واتساب، إيميل،
                  تلغرام) في أي خانة — كل التواصل يتم داخل المنصة فقط.
                </div>
                <Field label="اسم المشروع / عنوان الإعلان">
                  <input
                    className={inp}
                    value={s.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="مثال: مطعم وجبات صحية في الرياض"
                  />
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    اجعله 4–8 كلمات جذابة، بدون رموز تعبيرية أو أرقام أو روابط أو حروف كبيرة
                    بالكامل.
                  </span>
                </Field>
                <Field label="القطاع">
                  <input
                    className={inp}
                    value={s.sector}
                    onChange={(e) => set("sector", e.target.value)}
                    placeholder="تكنولوجيا، أغذية، تجزئة..."
                  />
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    اكتب 1–2 كلمة تصف مجال المشروع فقط.
                  </span>
                </Field>
                <Field label="الدولة">
                  <select
                    className={inp}
                    value={s.country}
                    onChange={(e) => set("country", e.target.value)}
                  >
                    {ARAB_COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    اختر الدولة التي سيظهر بها الإعلان في البحث والتصفية.
                  </span>
                </Field>
                <Field label="شرح المشروع">
                  <textarea
                    rows={7}
                    className={inp}
                    value={s.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="اشرح IDEA BUSINESSك، السوق المستهدف، الميزة التنافسية، وكيف ستستخدم رأس المال..."
                  />
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    4–7 أسطر تغطي: الفكرة، السوق المستهدف، الميزة التنافسية، كيفية استخدام التمويل،
                    والعائد المتوقع. لا تضع معلومات تواصل خارجية.
                  </span>
                </Field>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      صور وفيديوهات الإعلان (حتى 8 ملفات، 25MB لكل ملف)
                    </span>
                    <button
                      type="button"
                      onClick={() => mediaRef.current?.click()}
                      disabled={uploading || s.media.length >= 8}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold hover:bg-accent disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      رفع
                    </button>
                  </div>
                  <input
                    ref={mediaRef}
                    type="file"
                    hidden
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => uploadMedia(e.target.files)}
                  />
                  {s.media.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                      {s.media.map((u, i) => (
                        <div
                          key={i}
                          className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                        >
                          {u.match(/\.(mp4|webm|mov)/i) ? (
                            <video src={u} className="h-full w-full object-cover" />
                          ) : (
                            <img src={u} alt="" className="h-full w-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              set(
                                "media",
                                s.media.filter((_, j) => j !== i),
                              )
                            }
                            className="absolute end-1 top-1 rounded-full bg-black/60 p-1 opacity-0 transition group-hover:opacity-100"
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      <div className="flex gap-2">
                        <ImageIcon className="h-5 w-5" />
                        <VideoIcon className="h-5 w-5" />
                      </div>
                      أضف صوراً أو فيديوهات لجذب المستثمرين بصرياً
                    </div>
                  )}
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    لا ترفع صور مسروقة، صور هويات شخصية، أو فيديوهات تحتوي على أرقام تواصل.
                  </span>
                </div>
              </div>
            )}

            {step.key === "cost" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  حدّد التكلفة الكاملة للمشروع والعملة.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="التكلفة الإجمالية للمشروع">
                    <input
                      type="number"
                      min={1}
                      className={inp}
                      value={s.total_cost}
                      onChange={(e) => set("total_cost", Number(e.target.value))}
                    />
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      المبلغ الكلي لتأسيس/تشغيل المشروع كاملاً — لا تخلطه مع المبلغ المطلوب من
                      المستثمرين في خطوة لاحقة.
                    </span>
                  </Field>
                  <Field label="العملة">
                    <select
                      className={inp}
                      value={s.currency}
                      onChange={(e) => {
                        set("currency", e.target.value);
                        set("guarantee_currency", e.target.value);
                      }}
                    >
                      {ARAB_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="rounded-lg bg-primary/5 p-3 text-xs">
                  <strong>تنويه:</strong> هذا المبلغ يمثّل التكلفة الكلية لإنشاء/تشغيل المشروع.
                  ستحدد في خطوة لاحقة المبلغ الذي تطلبه من المستثمرين.
                </div>
              </div>
            )}

            {step.key === "funding" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">كيف تريد جمع التمويل؟</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => set("funding_mode", "marketplace")}
                    className={`min-h-32 rounded-2xl border p-5 text-start transition ${s.funding_mode === "marketplace" ? "border-primary bg-primary/10 shadow-[0_12px_30px_rgba(6,182,212,0.12)]" : "border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-white dark:border-border dark:bg-background"}`}
                  >
                    <Users className="mb-2 h-6 w-6 text-primary" />
                    <div className="mb-1 font-bold">السوق الموازي</div>
                    <p className="text-xs leading-6 text-muted-foreground">
                      جذب عدة مستثمرين عبر بيع أسهم في السوق العامة — تمويل أكبر.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => set("funding_mode", "single_investor")}
                    className={`min-h-32 rounded-2xl border p-5 text-start transition ${s.funding_mode === "single_investor" ? "border-primary bg-primary/10 shadow-[0_12px_30px_rgba(6,182,212,0.12)]" : "border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-white dark:border-border dark:bg-background"}`}
                  >
                    <User className="mb-2 h-6 w-6 text-primary" />
                    <div className="mb-1 font-bold">مستثمر واحد</div>
                    <p className="text-xs leading-6 text-muted-foreground">
                      شريك أو ممول واحد فقط — تواصل مباشر بدون تجزئة.
                    </p>
                  </button>
                </div>
                <label className="flex items-start gap-2 rounded-lg border border-border bg-background p-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={s.publish_in_community}
                    onChange={(e) => set("publish_in_community", e.target.checked)}
                  />
                  <span>
                    <span className="font-semibold">نشر الإعلان في قسم "المشاريع المعروضة"</span>
                    <span className="block text-xs text-muted-foreground">
                      يظهر مشروعك للجميع. إلغاء التحديد يحفظه كمسوّدة خاصة.
                    </span>
                  </span>
                </label>
              </div>
            )}

            {step.key === "guarantee" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  لحماية المستثمرين، يجب توفير ضمان قانوني.
                </div>

                <Field label="نوع الضمان">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {GUARANTEE_TYPES.map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => set("guarantee_type", g.value)}
                        className={`min-h-12 rounded-xl border px-3 py-2 text-center text-xs font-bold leading-5 transition ${s.guarantee_type === g.value ? "border-primary bg-primary/10 text-primary" : "border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-white dark:border-border dark:bg-background"}`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    اختر النوع الذي يناسبك — يمكنك تحميل قالب جاهز للتعبئة والطباعة.
                  </span>
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="مبلغ الضمان">
                    <input
                      type="number"
                      min={1}
                      className={inp}
                      value={s.guarantee_amount}
                      onChange={(e) => set("guarantee_amount", Number(e.target.value))}
                    />
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      المبلغ الذي تتعهّد به كضمان — يجب أن يكون واقعياً ومتوافقاً مع المستند.
                    </span>
                  </Field>
                  <Field label="عملة الضمان">
                    <select
                      className={inp}
                      value={s.guarantee_currency}
                      onChange={(e) => set("guarantee_currency", e.target.value)}
                    >
                      {ARAB_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="الاسم الكامل للضامن">
                    <input
                      className={inp}
                      value={s.guarantor_full_name}
                      onChange={(e) => set("guarantor_full_name", e.target.value)}
                      placeholder="الاسم بالكامل كما في الهوية"
                    />
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      يجب أن يطابق الاسم في الهوية أو السجل التجاري بالضبط.
                    </span>
                  </Field>
                  <Field label="رقم الهوية / السجل">
                    <input
                      className={inp}
                      value={s.guarantor_id_number}
                      onChange={(e) => set("guarantor_id_number", e.target.value)}
                      placeholder="رقم الهوية الوطنية أو الإقامة"
                    />
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      أدخل الرقم بدون مسافات — يجب أن يتطابق مع المستند المرفق.
                    </span>
                  </Field>
                </div>

                {GUARANTEE_TYPES.find((g) => g.value === s.guarantee_type)?.hasTemplate && (
                  <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-xs">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <strong>قالب جاهز للتعبئة والطباعة</strong>
                      <a
                        href={
                          s.guarantee_type === "sand_lamr"
                            ? "/templates/sand-lamr.html"
                            : "/templates/wasl-amanah.html"
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground hover:opacity-90"
                      >
                        <Download className="h-3 w-3" /> فتح القالب
                      </a>
                    </div>
                    <p className="text-muted-foreground">
                      افتح القالب في تبويب جديد، اطبعه أو احفظه PDF، عبّئه بخط اليد ووقّعه، ثم صوّره
                      أو امسحه ضوئياً وارفعه أدناه.
                    </p>
                  </div>
                )}

                <Field label="رفع المستند الموقّع (PDF أو صورة)">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => docRef.current?.click()}
                      disabled={docUploading}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-50"
                    >
                      {docUploading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      اختر الملف
                    </button>
                    {s.guarantee_doc_url && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <FileText className="h-3 w-3" /> تم الرفع
                      </div>
                    )}
                  </div>
                  <input
                    ref={docRef}
                    type="file"
                    hidden
                    accept="application/pdf,image/*"
                    onChange={(e) => uploadDoc(e.target.files)}
                  />
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    المستند يجب أن يكون موقّعاً — لا تُرفع مستندات فارغة أو غير موقعة. الحد الأقصى
                    15MB.
                  </span>
                </Field>

                <Field label="ملاحظات (اختياري)">
                  <textarea
                    rows={2}
                    className={inp}
                    value={s.guarantee_notes}
                    onChange={(e) => set("guarantee_notes", e.target.value)}
                    placeholder="أي تفاصيل إضافية عن الضمان..."
                  />
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    معلومات إضافية قد تفيد فريق المراجعة — اختياري.
                  </span>
                </Field>
              </div>
            )}

            {step.key === "shares" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  المبلغ المطلوب وعدد الأسهم — هذا الرقم يظهر للمستثمرين في كرت الإعلان.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={`المبلغ المطلوب للاستثمار (${s.currency})`}>
                    <input
                      type="number"
                      min={1}
                      className={inp}
                      value={s.target_investment}
                      onChange={(e) => set("target_investment", Number(e.target.value))}
                    />
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      هذا الرقم سيظهر في كرت الإعلان — يجب ألا يتجاوز التكلفة الإجمالية للمشروع.
                    </span>
                  </Field>
                  <Field label="عدد الأسهم (1000 كحد أدنى)">
                    <input
                      type="number"
                      min={1000}
                      step={100}
                      className={inp}
                      value={s.shares_total}
                      onChange={(e) => set("shares_total", Math.max(1000, Number(e.target.value)))}
                    />
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      سعر السهم = {(s.target_investment / Math.max(s.shares_total, 1)).toFixed(2)}{" "}
                      {s.currency}
                    </span>
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-1">
                  <Field label="الحد الأدنى لعدد الأسهم في صفقة بيع واحدة">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      max={s.shares_total}
                      className={inp}
                      value={s.min_share_lot}
                      onChange={(e) =>
                        set(
                          "min_share_lot",
                          Math.max(1, Math.min(s.shares_total, Number(e.target.value))),
                        )
                      }
                    />
                    <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                      🛈 هذا الحد يطبَّق في <strong>السوق الموازي</strong> وفي{" "}
                      <strong>المزايدات والمناقصات</strong>.<br />• <strong>مزايدة</strong>:
                      المستثمر يطلب عدداً <em>أقل</em> من هذا الحد مقابل سعر سهم <em>أعلى</em> من
                      سعر السوق.
                      <br />• <strong>مناقصة</strong>: المستثمر يلتزم بهذا الحد أو أكثر مقابل سعر
                      سهم <em>أقل</em> من سعر السوق، ويدفع وديعة جدية.
                    </span>
                  </Field>
                </div>

                <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-5">
                  <div className="mb-3 text-xs font-bold text-primary">معاينة كرت الإعلان</div>
                  <div className="text-lg font-bold">{s.name || "اسم المشروع"}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {s.description || "وصف المشروع"}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <div className="rounded-full bg-primary/20 px-3 py-1 font-bold text-primary">
                      مطلوب: {s.target_investment.toLocaleString()} {s.currency}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.shares_total.toLocaleString()} سهم
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.funding_mode === "marketplace" ? "سوق موازي" : "مستثمر واحد"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Nav buttons */}
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                disabled={stepIdx === 0}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-border dark:bg-background sm:w-auto"
              >
                <ChevronRight className="h-4 w-4" /> السابق
              </button>
              {stepIdx < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    canNext() ? setStepIdx((i) => i + 1) : toast.error("أكمل بيانات هذه الخطوة")
                  }
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-2 text-sm font-black text-primary-foreground shadow-[0_10px_24px_rgba(6,182,212,0.24)] transition hover:opacity-90 sm:w-auto"
                >
                  التالي <ChevronLeft className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting || !canNext()}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-2 text-sm font-black text-primary-foreground shadow-[0_10px_24px_rgba(6,182,212,0.24)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isEdit ? (
                    <Pencil className="h-4 w-4" />
                  ) : (
                    <Rocket className="h-4 w-4" />
                  )}
                  {isEdit ? "حفظ التعديلات" : "إطلاق الإعلان"}
                </button>
              )}
            </div>
          </div>

          {/* AI panel */}
          <div className="hidden lg:block">
            <AiAssistantPanel
              step={step.key}
              ctx={ctx}
              onApplyDescription={(t: string) => set("description", t)}
              onApplyTitle={(t: string) => set("name", t)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

const inp =
  "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
