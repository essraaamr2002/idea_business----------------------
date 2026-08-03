import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  Loader2,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { submitKyc, getMyKyc } from "@/lib/kyc-ai.functions";

export const Route = createFileRoute("/_authenticated/kyc")({
  head: () => ({
    meta: [
      { title: "التحقق من الهوية — iDEA Business" },
      { name: "description", content: "وثّق هويتك في دقائق وافتح كامل صلاحيات الاستثمار والتداول." },
    ],
  }),
  component: KycWizard,
});

type Country = { code: string; nameAr: string; flag: string };
const COUNTRIES: Country[] = [
  { code: "SA", nameAr: "السعودية", flag: "🇸🇦" },
  { code: "AE", nameAr: "الإمارات", flag: "🇦🇪" },
  { code: "EG", nameAr: "مصر", flag: "🇪🇬" },
  { code: "KW", nameAr: "الكويت", flag: "🇰🇼" },
  { code: "QA", nameAr: "قطر", flag: "🇶🇦" },
  { code: "BH", nameAr: "البحرين", flag: "🇧🇭" },
  { code: "OM", nameAr: "عُمان", flag: "🇴🇲" },
  { code: "JO", nameAr: "الأردن", flag: "🇯🇴" },
  { code: "MA", nameAr: "المغرب", flag: "🇲🇦" },
  { code: "DZ", nameAr: "الجزائر", flag: "🇩🇿" },
  { code: "TN", nameAr: "تونس", flag: "🇹🇳" },
  { code: "LB", nameAr: "لبنان", flag: "🇱🇧" },
  { code: "IQ", nameAr: "العراق", flag: "🇮🇶" },
  { code: "YE", nameAr: "اليمن", flag: "🇾🇪" },
  { code: "PS", nameAr: "فلسطين", flag: "🇵🇸" },
  { code: "SD", nameAr: "السودان", flag: "🇸🇩" },
  { code: "LY", nameAr: "ليبيا", flag: "🇱🇾" },
  { code: "SY", nameAr: "سوريا", flag: "🇸🇾" },
];

type DocType = "passport" | "national_id" | "residence" | "driver_license";
const DOC_LABELS: Record<DocType, { ar: string; desc: string }> = {
  national_id: { ar: "بطاقة الهوية الوطنية", desc: "البطاقة المدنية أو الهوية الوطنية" },
  passport: { ar: "جواز السفر", desc: "صفحة البيانات الرئيسية" },
  residence: { ar: "تصريح الإقامة", desc: "الإقامة سارية المفعول" },
  driver_license: { ar: "رخصة القيادة", desc: "للدول التي تقبلها" },
};

function steps() {
  return ["الدولة", "نوع الوثيقة", "رفع الوثيقة", "صورة شخصية", "المراجعة"];
}

function KycWizard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const submit = useServerFn(submitKyc);
  const fetchMine = useServerFn(getMyKyc);

  const [existing, setExisting] = useState<Awaited<ReturnType<typeof fetchMine>> | null>(null);
  const [loadingMine, setLoadingMine] = useState(true);

  const [step, setStep] = useState(0);
  const [country, setCountry] = useState<Country | null>(null);
  const [docType, setDocType] = useState<DocType | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [pledge, setPledge] = useState(false);
  const [arb, setArb] = useState(false);
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof submit>> | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const r = await fetchMine();
        setExisting(r);
      } catch {
        /* ignore */
      } finally {
        setLoadingMine(false);
      }
    })();
  }, [user, fetchMine]);

  if (loadingMine) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user already has a non-rejected verification, show its status
  if (existing && existing.status !== "rejected" && !result) {
    return <StatusPanel s={existing} onRetry={null} />;
  }

  async function uploadOne(file: File, kind: string): Promise<string> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user!.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("kyc-documents")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    return path;
  }

  async function onSubmit() {
    if (!country || !docType || !frontFile || !selfieFile) return;
    if (!pledge || !arb) {
      toast.error("يجب الموافقة على التعهد والتحكيم");
      return;
    }
    if (fullName.trim().length < 2) {
      toast.error("أدخل اسمك الكامل كما في الوثيقة");
      return;
    }
    setSubmitting(true);
    try {
      const frontPath = await uploadOne(frontFile, "doc-front");
      const backPath = backFile ? await uploadOne(backFile, "doc-back") : null;
      const selfiePath = await uploadOne(selfieFile, "selfie");
      const r = await submit({
        data: {
          countryCode: country.code,
          documentType: docType,
          documentFrontPath: frontPath,
          documentBackPath: backPath ?? undefined,
          selfiePath,
          pledgeAccepted: pledge,
          arbitrationAccepted: arb,
          pledgeFullName: fullName.trim(),
        },
      });
      setResult(r);
      toast.success("تم إرسال طلبك");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "فشل الإرسال";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <StatusPanel
        s={{
          ...result,
          face_match_score: null,
          liveness_score: null,
          authenticity_score: null,
          country_code: country?.code ?? null,
          document_type: docType,
          extracted_name: null,
          extracted_nationality: null,
          document_expiry: null,
          created_at: new Date().toISOString(),
        }}
        onRetry={result.status === "rejected" ? () => { setResult(null); setStep(0); } : null}
      />
    );
  }

  const stepNames = steps();
  const canNext =
    (step === 0 && !!country) ||
    (step === 1 && !!docType) ||
    (step === 2 && !!frontFile && (docType === "passport" || !!backFile)) ||
    (step === 3 && !!selfieFile) ||
    step === 4;

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="border-b bg-white">
        <div className="container flex items-center gap-3 py-4">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <div className="text-lg font-black text-primary-dark">التحقق من الهوية</div>
            <div className="text-xs text-muted-foreground">عملية آمنة — تستغرق 5 دقائق فقط</div>
          </div>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary">
            لاحقاً
          </Link>
        </div>
      </div>

      <div className="container max-w-2xl py-8">
        {/* Stepper */}
        <div className="mb-8 flex items-center justify-between">
          {stepNames.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black transition ${
                  i < step
                    ? "bg-green-verified text-white"
                    : i === step
                    ? "bg-primary text-white ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-center text-[11px] font-bold ${
                  i === step ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          {step === 0 && <CountryStep selected={country} onSelect={(c) => { setCountry(c); setStep(1); }} />}

          {step === 1 && (
            <DocTypeStep
              country={country!}
              selected={docType}
              onSelect={(d) => { setDocType(d); setStep(2); }}
            />
          )}

          {step === 2 && (
            <UploadStep
              docType={docType!}
              front={frontFile}
              back={backFile}
              onFront={setFrontFile}
              onBack={setBackFile}
            />
          )}

          {step === 3 && <SelfieStep selfie={selfieFile} onSelfie={setSelfieFile} />}

          {step === 4 && (
            <ReviewStep
              fullName={fullName}
              setFullName={setFullName}
              pledge={pledge}
              setPledge={setPledge}
              arb={arb}
              setArb={setArb}
            />
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || submitting}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-muted disabled:opacity-30"
            >
              ← رجوع
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                disabled={!canNext}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-black text-white transition hover:bg-primary-dark disabled:opacity-40"
              >
                التالي
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting || !pledge || !arb || fullName.trim().length < 2}
                className="flex items-center gap-2 rounded-xl bg-orange px-6 py-2.5 text-sm font-black text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                إرسال للتحقق الذكي
              </button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          🔒 وثائقك مشفّرة وتُحفظ في تخزين آمن. لن يطّلع عليها أحد إلا الذكاء الاصطناعي وفريق المراجعة عند الضرورة.
        </p>
      </div>
    </div>
  );
}

/* ────────── Steps ────────── */

function CountryStep({ selected, onSelect }: { selected: Country | null; onSelect: (c: Country) => void }) {
  const [q, setQ] = useState("");
  const list = COUNTRIES.filter((c) => c.nameAr.includes(q) || c.code.includes(q.toUpperCase()));
  return (
    <div>
      <h2 className="mb-1 text-xl font-black text-primary-dark">حدد دولتك</h2>
      <p className="mb-5 text-sm text-muted-foreground">نوع الوثيقة المطلوبة يختلف حسب الدولة</p>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="ابحث عن دولتك..."
        className="mb-4 w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary"
      />
      <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
        {list.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => onSelect(c)}
            className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-right transition hover:border-primary ${
              selected?.code === c.code ? "border-primary bg-primary/5" : "border-transparent bg-muted/40"
            }`}
          >
            <span className="text-2xl">{c.flag}</span>
            <span className="flex-1 font-bold">{c.nameAr}</span>
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}

function DocTypeStep({
  country,
  selected,
  onSelect,
}: {
  country: Country;
  selected: DocType | null;
  onSelect: (d: DocType) => void;
}) {
  const docs: DocType[] =
    country.code === "SA" || country.code === "AE" || country.code === "EG"
      ? ["national_id", "passport", "residence"]
      : ["passport", "national_id", "residence"];
  return (
    <div>
      <h2 className="mb-1 text-xl font-black text-primary-dark">اختر نوع الوثيقة</h2>
      <p className="mb-5 text-sm text-muted-foreground">الوثائق المدعومة لـ {country.nameAr}</p>
      <div className="space-y-3">
        {docs.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onSelect(d)}
            className={`group flex w-full items-center gap-4 rounded-xl border-2 p-4 text-right transition ${
              selected === d ? "border-primary bg-primary/5" : "border-border hover:border-primary"
            }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-black text-primary-dark">{DOC_LABELS[d].ar}</div>
              <div className="text-xs text-muted-foreground">{DOC_LABELS[d].desc}</div>
            </div>
            <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
          </button>
        ))}
      </div>
    </div>
  );
}

function UploadStep({
  docType,
  front,
  back,
  onFront,
  onBack,
}: {
  docType: DocType;
  front: File | null;
  back: File | null;
  onFront: (f: File | null) => void;
  onBack: (f: File | null) => void;
}) {
  return (
    <div>
      <h2 className="mb-1 text-xl font-black text-primary-dark">ارفع صور الوثيقة</h2>
      <p className="mb-5 text-sm text-muted-foreground">صورة واضحة، بدون انعكاسات، كل الزوايا مرئية</p>
      <FileSlot label="الوجه الأمامي" file={front} onPick={onFront} />
      {docType !== "passport" && (
        <div className="mt-4">
          <FileSlot label="الوجه الخلفي" file={back} onPick={onBack} />
        </div>
      )}
      <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <h4 className="mb-2 text-sm font-black text-primary-dark">💡 نصائح:</h4>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• الصورة واضحة وغير ضبابية</li>
          <li>• جميع الزوايا مرئية</li>
          <li>• لا انعكاسات ضوئية</li>
          <li>• النص مقروء بوضوح</li>
        </ul>
      </div>
    </div>
  );
}

function FileSlot({
  label,
  file,
  onPick,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const preview = file ? URL.createObjectURL(file) : null;
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-muted-foreground">{label}</label>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`flex h-44 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition ${
          file ? "border-green-verified bg-green-verified/5" : "border-border hover:border-primary"
        }`}
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full rounded-lg object-contain p-2" />
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-bold text-muted-foreground">اضغط للرفع</span>
            <span className="text-[10px] text-muted-foreground">JPG / PNG — حتى 10MB</span>
          </>
        )}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 10 * 1024 * 1024) {
            toast.error("الحد الأقصى 10MB");
            return;
          }
          onPick(f);
        }}
      />
    </div>
  );
}

function SelfieStep({ selfie, onSelfie }: { selfie: File | null; onSelfie: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const preview = selfie ? URL.createObjectURL(selfie) : null;
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <div>
      <h2 className="mb-1 text-xl font-black text-primary-dark">التقط صورة شخصية</h2>
      <p className="mb-5 text-sm text-muted-foreground">صورة سيلفي تُظهر وجهك بوضوح، ويفضّل بجانب الوثيقة</p>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`flex h-72 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition ${
          selfie ? "border-green-verified bg-green-verified/5" : "border-border hover:border-primary"
        }`}
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full rounded-lg object-contain p-2" />
        ) : (
          <>
            <Camera className="h-12 w-12 text-muted-foreground" />
            <span className="font-bold text-muted-foreground">اضغط لالتقاط/رفع صورة سيلفي</span>
            <span className="text-xs text-muted-foreground">سيتم استخدامها للتطابق مع الوثيقة</span>
          </>
        )}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 10 * 1024 * 1024) {
            toast.error("الحد الأقصى 10MB");
            return;
          }
          onSelfie(f);
        }}
      />
    </div>
  );
}

function ReviewStep({
  fullName,
  setFullName,
  pledge,
  setPledge,
  arb,
  setArb,
}: {
  fullName: string;
  setFullName: (s: string) => void;
  pledge: boolean;
  setPledge: (b: boolean) => void;
  arb: boolean;
  setArb: (b: boolean) => void;
}) {
  return (
    <div>
      <h2 className="mb-1 text-xl font-black text-primary-dark">المراجعة والإرسال</h2>
      <p className="mb-5 text-sm text-muted-foreground">سيقوم الذكاء الاصطناعي بالفحص الفوري</p>

      <label className="mb-1 block text-xs font-bold text-muted-foreground">
        الاسم الكامل كما في الوثيقة
      </label>
      <input
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="مثال: محمد عبدالله أحمد"
        className="mb-5 w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-sm outline-none focus:border-primary"
      />

      <div className="space-y-3">
        <Toggle
          checked={pledge}
          onChange={setPledge}
          label="أتعهّد بأن البيانات والوثائق المرفقة صحيحة وملك لي شخصياً."
        />
        <Toggle
          checked={arb}
          onChange={setArb}
          label="أوافق على بنود التحكيم وحل النزاعات حسب اللوائح المنشورة على المنصة."
        />
      </div>

      <div className="mt-5 rounded-xl border bg-muted/40 p-4">
        <div className="text-xs font-bold text-muted-foreground">ما الذي سيتم فحصه تلقائياً؟</div>
        <ul className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <li>✓ استخراج بيانات الوثيقة (OCR)</li>
          <li>✓ تطابق الوجه مع الوثيقة</li>
          <li>✓ فحص الحيوية (Liveness)</li>
          <li>✓ صلاحية الوثيقة وعدم التلاعب</li>
        </ul>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (b: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 hover:bg-muted/30">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-primary"
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </label>
  );
}

/* ────────── Status Panel (after submit OR when existing) ────────── */

type StatusShape = {
  id: string;
  status: string;
  ai_decision: string | null;
  ai_score: number | null;
  rejection_reason: string | null;
  face_match_score: number | null;
  liveness_score: number | null;
  authenticity_score: number | null;
  country_code: string | null;
  document_type: string | null;
  extracted_name: string | null;
  extracted_nationality: string | null;
  document_expiry: string | null;
  created_at: string;
};

function StatusPanel({ s, onRetry }: { s: StatusShape; onRetry: (() => void) | null }) {
  const approved = s.status === "approved" || s.status === "verified";
  const rejected = s.status === "rejected";
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container max-w-2xl py-12 text-center">
        {approved ? (
          <>
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-4 border-green-verified bg-green-verified/10">
              <CheckCircle2 className="h-10 w-10 text-green-verified" />
            </div>
            <h1 className="mb-2 text-2xl font-black text-primary-dark">تم التحقق بنجاح ✓</h1>
            <p className="mb-6 text-muted-foreground">حسابك موثّق الآن — استمتع بجميع مزايا المنصة</p>
          </>
        ) : rejected ? (
          <>
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-4 border-red-500 bg-red-500/10">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="mb-2 text-2xl font-black text-primary-dark">لم يتم قبول الطلب</h1>
            <p className="mb-6 text-muted-foreground">{s.rejection_reason ?? "يرجى إعادة المحاولة بصور أوضح."}</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 flex h-20 w-20 animate-pulse items-center justify-center rounded-full border-4 border-orange bg-orange/10">
              <Clock className="h-10 w-10 text-orange" />
            </div>
            <h1 className="mb-2 text-2xl font-black text-primary-dark">جاري المراجعة</h1>
            <p className="mb-6 text-muted-foreground">طلبك قيد المراجعة. ستصلك إشعار بالنتيجة فور الانتهاء.</p>
          </>
        )}

        {(s.face_match_score ?? null) !== null && (
          <div className="mx-auto mb-6 grid max-w-md grid-cols-3 gap-3">
            <ScoreCard label="تطابق الوجه" v={s.face_match_score} />
            <ScoreCard label="حيوية" v={s.liveness_score} />
            <ScoreCard label="أصالة" v={s.authenticity_score} />
          </div>
        )}

        <div className="flex justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-black text-white hover:bg-primary-dark"
            >
              إعادة المحاولة
            </button>
          )}
          <Link
            to="/dashboard"
            className="rounded-xl border-2 border-border bg-white px-6 py-2.5 text-sm font-black text-primary-dark hover:border-primary"
          >
            الذهاب للوحة التحكم
          </Link>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ label, v }: { label: string; v: number | null }) {
  const val = typeof v === "number" ? Math.round(v) : null;
  const color =
    val === null
      ? "text-muted-foreground"
      : val >= 80
      ? "text-green-verified"
      : val >= 55
      ? "text-orange"
      : "text-red-500";
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className={`text-2xl font-black ${color}`}>{val ?? "—"}</div>
      <div className="mt-1 text-[11px] font-bold text-muted-foreground">{label}</div>
    </div>
  );
}
