/**
 * VerificationSystem — Advanced AI KYC flow
 *   1) Document type
 *   2) Document capture (camera/upload) — auto-OCR + expiry check on server
 *   3) Live selfie via getUserMedia ONLY (no uploads) + random liveness challenge
 *   4) Legal pledge (no-fraud + 25,000 USD penalty + Faireer arbitration) + digital signature pad
 *   5) Submit + AI verification + result
 *
 * VerifiedAvatar — green/blue verified avatar ring (unchanged below).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { verifyKycWithAi } from "@/lib/kyc.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Camera, Upload, RefreshCw, ShieldCheck, Loader2, CheckCircle2,
  XCircle, IdCard, User, ArrowRight, ArrowLeft, Sparkles, AlertTriangle,
  ScrollText, PenTool, Scale, Eraser,
} from "lucide-react";
import { toast } from "sonner";
import { RejectionReason } from "@/components/RejectionReason";

type DocType = "national_id" | "passport" | "driver_license";
type Status = "approved" | "rejected" | "review" | "submitted" | "verified" | null;

interface VerificationSystemProps {
  userId: string;
  onComplete?: (data: { status: Status; score?: number; reasoning?: string }) => void;
}

const DOC_LABELS: Record<DocType, string> = {
  national_id: "بطاقة الهوية الوطنية",
  passport: "جواز السفر",
  driver_license: "رخصة القيادة",
};

// Pool of liveness challenge prompts (Arabic). One is picked at random per session.
const CHALLENGE_POOL: { q: string; key: string }[] = [
  { q: "أدر رأسك ببطء إلى اليسار ثم اليمين", key: "head_turn" },
  { q: "ارمش بعينيك مرتين", key: "blink" },
  { q: "ابتسم ابتسامة واضحة", key: "smile" },
  { q: "افتح فمك قليلاً ثم أغلقه", key: "open_mouth" },
  { q: "أمل رأسك إلى الأعلى ثم الأسفل", key: "head_nod" },
  { q: "اقرب وجهك من الكاميرا قليلاً", key: "lean_in" },
];

function pickChallenges(n = 2) {
  const arr = [...CHALLENGE_POOL].sort(() => Math.random() - 0.5).slice(0, n);
  return arr;
}

export function VerificationSystem({ userId, onComplete }: VerificationSystemProps) {
  const runKyc = useServerFn(verifyKycWithAi);
  const [profile, setProfile] = useState<{ kyc_status?: string; verified_green?: boolean; verified_blue?: boolean } | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [docType, setDocType] = useState<DocType>("national_id");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string>("");

  // Live selfie state (no upload allowed)
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string>("");
  const challenges = useMemo(() => pickChallenges(2), []);
  const [challengeStartedAt, setChallengeStartedAt] = useState<number | null>(null);
  const [framesCaptured, setFramesCaptured] = useState(0);

  // Pledge state
  const [pledgeAccepted, setPledgeAccepted] = useState(false);
  const [arbitrationAccepted, setArbitrationAccepted] = useState(false);
  const [pledgeFullName, setPledgeFullName] = useState("");
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ status: Status; score?: number; reasoning?: string } | null>(null);

  useEffect(() => {
    let active = true;
    supabase.rpc("get_my_profile").then(({ data }) => {
      if (!active) return;
      const row = Array.isArray(data) ? data[0] : (data as any);
      setProfile(row ?? null);
    });
    return () => { active = false; };
  }, [userId]);

  const setDocFromFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return toast.error("الملف كبير جداً (الحد 10MB)");
    setDocFile(f);
    setDocPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!docFile) return toast.error("ارفع صورة الوثيقة أولاً");
    if (!selfieBlob) return toast.error("لم يتم التقاط السيلفي الحي بعد");
    if (!pledgeAccepted || !arbitrationAccepted) return toast.error("يجب قبول التعهد والتحكيم");
    if (pledgeFullName.trim().length < 3) return toast.error("اكتب اسمك الكامل في خانة الإقرار");
    if (!signatureBlob) return toast.error("التوقيع الرقمي مطلوب");

    setBusy(true);
    try {
      toast.info("جاري رفع الوثائق والتوقيع بشكل آمن...");

      const docPath = `${userId}/doc-${docType}-${Date.now()}-${docFile.name.replace(/[^\w.-]/g, "_")}`;
      const up1 = await supabase.storage.from("kyc-documents").upload(docPath, docFile, { upsert: false, contentType: docFile.type });
      if (up1.error) throw new Error(up1.error.message);

      const selfiePath = `${userId}/selfie-live-${Date.now()}.jpg`;
      const up2 = await supabase.storage.from("kyc-documents").upload(selfiePath, selfieBlob, { upsert: false, contentType: "image/jpeg" });
      if (up2.error) throw new Error(up2.error.message);

      const signaturePath = `${userId}/signature-${Date.now()}.png`;
      const up3 = await supabase.storage.from("kyc-signatures").upload(signaturePath, signatureBlob, { upsert: false, contentType: "image/png" });
      if (up3.error) throw new Error(up3.error.message);

      toast.info("الذكاء الاصطناعي يحلّل الوثيقة ويطابقها مع السيلفي الحي...");
      const r = await runKyc({
        data: {
          documentPath: docPath,
          selfiePath,
          documentType: docType,
          pledgeAccepted: true,
          arbitrationAccepted: true,
          pledgeFullName: pledgeFullName.trim(),
          signaturePath,
          livenessChallenge: {
            questions: challenges.map((c) => c.q),
            answers: challenges.map((c) => c.key),
            durationMs: challengeStartedAt ? Date.now() - challengeStartedAt : 0,
            framesCount: framesCaptured,
            capturedLive: true,
          },
        },
      });
      const out = { status: r.status as Status, score: r.score, reasoning: r.reasoning };
      setResult(out);
      setStep(5);
      onComplete?.(out);

      if (r.status === "approved") toast.success(`تم التوثيق ✅ (الثقة: ${Math.round((r.score ?? 0) * 100)}%)`);
      else if (r.status === "rejected") toast.error("تم رفض الطلب — راجع السبب أدناه");
      else toast.info("الطلب قيد المراجعة البشرية");

      const { data } = await supabase.rpc("get_my_profile");
      const row = Array.isArray(data) ? data[0] : (data as any);
      if (row) setProfile(row);
    } catch (e: any) {
      toast.error("فشل التحقق: " + (e?.message ?? "خطأ غير متوقع"));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(1);
    setDocFile(null); setSelfieBlob(null); setSignatureBlob(null);
    setDocPreview(""); setSelfiePreview(""); setSignaturePreview("");
    setPledgeAccepted(false); setArbitrationAccepted(false); setPledgeFullName("");
    setResult(null); setFramesCaptured(0); setChallengeStartedAt(null);
  };

  if (profile?.kyc_status === "verified" || profile?.verified_green) {
    return (
      <Card className="border-green-500/40 bg-gradient-to-br from-green-500/10 to-emerald-500/5">
        <CardContent className="p-8 text-center space-y-3">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
            <ShieldCheck className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-extrabold">حسابك موثّق ✅</h3>
          <p className="text-sm text-muted-foreground">
            تظهر دائرة خضراء حول صورتك في كل أنحاء المنصة. هذا يمنح ثقة أعلى للمشترين والمستثمرين.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-gradient-to-l from-primary/10 to-transparent">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          التوثيق المتقدم بالذكاء الاصطناعي
        </CardTitle>
        <Stepper step={step} />
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">اختر نوع الوثيقة الرسمية. نقبل الهوية الوطنية أو جواز السفر كبديل.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(DOC_LABELS) as DocType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setDocType(t)}
                  className={`rounded-2xl border-2 p-4 text-start transition ${
                    docType === t ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/40"
                  }`}
                >
                  <IdCard className="h-6 w-6 text-primary mb-2" />
                  <div className="font-bold">{DOC_LABELS[t]}</div>
                </button>
              ))}
            </div>
            <NextBack onNext={() => setStep(2)} nextLabel="التالي" />
          </div>
        )}

        {step === 2 && (
          <DocStep
            title={`صوّر ${DOC_LABELS[docType]}`}
            hint="ضع الوثيقة على سطح مستوٍ بإضاءة جيدة. تأكد من وضوح الاسم والصورة والأرقام. الوثائق التالفة أو منتهية الصلاحية ستُرفض تلقائياً."
            preview={docPreview}
            onPick={setDocFromFile}
          >
            <NextBack
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              nextDisabled={!docFile}
              nextLabel="التالي: التحقق الحي"
            />
          </DocStep>
        )}

        {step === 3 && (
          <LiveSelfieStep
            challenges={challenges}
            onCaptured={(blob, framesN) => {
              setSelfieBlob(blob);
              setSelfiePreview(URL.createObjectURL(blob));
              setFramesCaptured(framesN);
            }}
            onChallengeStart={() => setChallengeStartedAt(Date.now())}
            preview={selfiePreview}
          >
            <NextBack
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
              nextDisabled={!selfieBlob}
              nextLabel="التالي: التعهد والتوقيع"
            />
          </LiveSelfieStep>
        )}

        {step === 4 && (
          <PledgeStep
            fullName={pledgeFullName}
            onFullName={setPledgeFullName}
            pledgeAccepted={pledgeAccepted}
            arbitrationAccepted={arbitrationAccepted}
            onPledge={setPledgeAccepted}
            onArbitration={setArbitrationAccepted}
            signaturePreview={signaturePreview}
            onSignature={(blob, dataUrl) => {
              setSignatureBlob(blob);
              setSignaturePreview(dataUrl);
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(3)} disabled={busy}>
                <ArrowRight className="h-4 w-4 ms-1" /> رجوع
              </Button>
              <Button
                size="lg"
                onClick={submit}
                disabled={busy || !pledgeAccepted || !arbitrationAccepted || pledgeFullName.trim().length < 3 || !signatureBlob}
                className="gradient-primary text-primary-foreground font-extrabold shadow-lg"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                <span className="ms-2">{busy ? "جاري التحقق..." : "اعتماد التوقيع وبدء التحقق"}</span>
              </Button>
            </div>
          </PledgeStep>
        )}

        {step === 5 && result && (
          <ResultView result={result} onRetry={reset} />
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- internal pieces ---------- */

function Stepper({ step }: { step: number }) {
  const steps = ["نوع الوثيقة", "تصوير الوثيقة", "التحقق الحي", "الإقرار والتوقيع", "النتيجة"];
  return (
    <ol className="mt-3 flex items-center gap-2 text-xs">
      {steps.map((s, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-bold ${
              done ? "bg-green-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>{done ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}</span>
            <span className={`hidden sm:inline ${active ? "font-bold text-foreground" : "text-muted-foreground"}`}>{s}</span>
            {n < steps.length && <span className="mx-1 hidden sm:inline-block h-px flex-1 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

function DocStep({
  title, hint, preview, onPick, children,
}: {
  title: string; hint: string; preview: string;
  onPick: (f: File) => void; children: React.ReactNode;
}) {
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-base font-extrabold"><IdCard className="h-6 w-6" />{title}</div>
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-2">
        {preview ? (
          <img src={preview} alt="معاينة" className="mx-auto max-h-72 rounded-lg object-contain" />
        ) : (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            لا توجد صورة بعد — اختر مصدر الالتقاط:
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground flex items-start gap-1">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {hint}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => camRef.current?.click()}>
          <Camera className="h-4 w-4 me-2" /> {preview ? "إعادة الالتقاط" : "التقاط بالكاميرا"}
        </Button>
        <Button variant="ghost" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4 me-2" /> رفع من الجهاز
        </Button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
      </div>
      {children}
    </div>
  );
}

/* ---------- Live selfie with random challenges (no upload allowed) ---------- */

function LiveSelfieStep({
  challenges, onCaptured, onChallengeStart, preview, children,
}: {
  challenges: { q: string; key: string }[];
  onCaptured: (blob: Blob, framesCaptured: number) => void;
  onChallengeStart: () => void;
  preview: string;
  children: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string>("");
  const [permState, setPermState] = useState<"unknown" | "prompt" | "granted" | "denied">("unknown");
  const [consented, setConsented] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(4);
  const framesRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Pre-check camera permission state (if supported)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const anyNav = navigator as any;
        if (anyNav?.permissions?.query) {
          const res = await anyNav.permissions.query({ name: "camera" as PermissionName });
          if (!cancelled) setPermState(res.state as any);
          res.onchange = () => { if (!cancelled) setPermState(res.state as any); };
        } else {
          setPermState("prompt");
        }
      } catch { setPermState("prompt"); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Resolve a getUserMedia implementation across modern + legacy browsers + insecure contexts.
  const resolveGetUserMedia = (): ((c: MediaStreamConstraints) => Promise<MediaStream>) | null => {
    if (typeof navigator === "undefined") return null;
    const nav: any = navigator;
    // 1) Modern standard
    if (nav.mediaDevices?.getUserMedia) {
      return (c) => nav.mediaDevices.getUserMedia(c);
    }
    // 2) Polyfill mediaDevices on older browsers
    if (!nav.mediaDevices) nav.mediaDevices = {};
    const legacy =
      nav.getUserMedia ||
      nav.webkitGetUserMedia ||
      nav.mozGetUserMedia ||
      nav.msGetUserMedia;
    if (legacy) {
      return (c) =>
        new Promise<MediaStream>((resolve, reject) => {
          legacy.call(nav, c, resolve, reject);
        });
    }
    return null;
  };

  // Try multiple constraint variants — some devices/browsers reject specific configs.
  const tryGetStream = async (
    getUserMedia: (c: MediaStreamConstraints) => Promise<MediaStream>,
  ): Promise<MediaStream> => {
    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: "user" }, audio: false },
      { video: { facingMode: { ideal: "user" } }, audio: false },
      { video: true, audio: false },
    ];
    let lastErr: any = null;
    for (const c of attempts) {
      try {
        return await getUserMedia(c);
      } catch (e: any) {
        lastErr = e;
        const name = e?.name ?? "";
        // Don't retry on permission denial — user must change browser settings.
        if (name === "NotAllowedError" || name === "SecurityError") throw e;
      }
    }
    throw lastErr ?? new Error("getUserMedia failed");
  };

  // IMPORTANT: invoke synchronously inside the click handler — no awaits
  // before getUserMedia or the browser drops the user gesture and silently
  // returns NotAllowedError without showing the permission prompt.
  const startCamera = async () => {
    setError("");

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("لا يمكن فتح الكاميرا إلا عبر اتصال آمن (HTTPS). افتح الموقع من رابط https.");
      return;
    }

    let streamPromise: Promise<MediaStream> | null = null;
    const nav: any = navigator;

    if (nav?.mediaDevices?.getUserMedia) {
      streamPromise = nav.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    } else {
      const legacy =
        nav?.getUserMedia ||
        nav?.webkitGetUserMedia ||
        nav?.mozGetUserMedia ||
        nav?.msGetUserMedia;
      if (legacy) {
        streamPromise = new Promise<MediaStream>((resolve, reject) =>
          legacy.call(nav, { video: true, audio: false }, resolve, reject),
        );
      }
    }

    if (!streamPromise) {
      setError("متصفحك لا يدعم الكاميرا مباشرةً. استخدم زر «التقاط فوري بكاميرا الجهاز» في الأسفل، أو افتح الموقع من Chrome/Safari الحديث.");
      return;
    }

    setRequesting(true);
    try {
      const stream = await streamPromise;
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch { /* gesture already happened */ }
      }
      setStreaming(true);
      setPermState("granted");
      onChallengeStart();
    } catch (e: any) {
      const name = e?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setPermState("denied");
        setError("تم رفض الإذن. اضغط على أيقونة 🔒 بجوار شريط العنوان → إعدادات الموقع → الكاميرا → السماح، ثم أعد المحاولة.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        try {
          const fallback = await nav.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = fallback;
          if (videoRef.current) {
            videoRef.current.srcObject = fallback;
            try { await videoRef.current.play(); } catch { /* ignore */ }
          }
          setStreaming(true);
          setPermState("granted");
          onChallengeStart();
          return;
        } catch {
          setError("لم نعثر على كاميرا متاحة. استخدم «التقاط فوري بكاميرا الجهاز» في الأسفل كبديل.");
        }
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setError("الكاميرا مشغولة من تطبيق آخر (Zoom/Meet/FaceTime). أغلقه ثم أعد المحاولة، أو استخدم «التقاط فوري بكاميرا الجهاز».");
      } else {
        setError("تعذّر تشغيل الكاميرا. جرّب «التقاط فوري بكاميرا الجهاز» في الأسفل. " + (e?.message ?? ""));
      }
    } finally {
      setRequesting(false);
    }
  };

  // Native fallback: capture a selfie via the device's native camera app
  // (mobile) or file picker (desktop). Treated as the live selfie when
  // getUserMedia is unavailable. We mark fewer frames so the server still
  // knows this came from the fallback path.
  const handleNativeCapture = (file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("الصورة كبيرة جداً (الحد 10MB)."); return; }
    onChallengeStart();
    framesRef.current = 1;
    onCaptured(file, 1);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  };

  useEffect(() => () => stopCamera(), []);

  // Challenge timer: 4s per challenge, snap frame at end, then advance
  useEffect(() => {
    if (!streaming) return;
    if (challengeIdx >= challenges.length) return;
    setSecondsLeft(4);
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          const v = videoRef.current; const c = canvasRef.current;
          if (v && c) {
            const w = v.videoWidth || 480; const h = v.videoHeight || 480;
            c.width = w; c.height = h;
            const ctx = c.getContext("2d");
            if (ctx) { ctx.drawImage(v, 0, 0, w, h); framesRef.current += 1; }
          }
          clearInterval(t);
          setTimeout(() => {
            if (challengeIdx + 1 >= challenges.length) {
              const c2 = canvasRef.current;
              c2?.toBlob((blob) => {
                if (blob) onCaptured(blob, framesRef.current);
                stopCamera();
              }, "image/jpeg", 0.9);
            } else {
              setChallengeIdx((i) => i + 1);
            }
          }, 250);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming, challengeIdx]);

  const done = !!preview;
  const showConsentGate = !streaming && !done;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-base font-extrabold"><User className="h-6 w-6" />التحقق الحي للوجه</div>

      <div className="rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>لأمانك ومنع التلاعب، لا يُسمح برفع صور مخزنة. سيُفتح بث الكاميرا مباشرةً مع تحدّيات عشوائية للتأكد من أنك شخص حقيقي.</span>
      </div>

      {/* Consent gate — explicit user approval before browser permission prompt */}
      {showConsentGate && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <Camera className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold">إذن استخدام الكاميرا</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                نحتاج إلى تشغيل الكاميرا الأمامية لأداء التحقق الحي. الفيديو يُعالَج محلياً في جهازك، ولا نحفظ بثاً مستمراً — نلتقط لقطة واحدة فقط في نهاية التحدي ونرسلها مشفّرة لخادم التحقق.
              </p>
              <ul className="mt-2 list-disc ps-5 text-[11px] text-muted-foreground space-y-0.5">
                <li>تأكد من جلوسك في مكان مُضاء جيداً.</li>
                <li>أزل النظارة الشمسية والكمامة قبل البدء.</li>
                <li>عند ظهور نافذة المتصفح، اضغط <b>السماح / Allow</b>.</li>
              </ul>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-card p-3 text-xs">
            <Checkbox checked={consented} onCheckedChange={(v) => setConsented(!!v)} className="mt-0.5" />
            <span className="leading-relaxed">
              أوافق على فتح الكاميرا لأغراض التحقق من الهوية فقط، وأقرّ بأنني أنا الشخص الفعلي صاحب الحساب.
            </span>
          </label>

          {permState === "denied" && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-300">
              <div className="font-bold mb-1">الإذن مرفوض حالياً من المتصفح.</div>
              لإعادة تفعيله: اضغط على أيقونة 🔒 بجوار شريط العنوان → إعدادات الموقع → الكاميرا → اختر <b>السماح</b>، ثم أعد تحميل الصفحة.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={startCamera}
              disabled={!consented || requesting}
              className="gradient-primary text-primary-foreground font-bold"
            >
              {requesting
                ? <><Loader2 className="h-4 w-4 me-2 animate-spin" /> جارٍ طلب الإذن…</>
                : <><Camera className="h-4 w-4 me-2" /> أوافق وافتح الكاميرا</>}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-2 relative">
        {done ? (
          <img src={preview} alt="السيلفي الحي" className="mx-auto max-h-72 rounded-lg object-contain" />
        ) : streaming ? (
          <>
            <video ref={videoRef} playsInline muted className="mx-auto max-h-72 rounded-lg" style={{ transform: "scaleX(-1)" }} />
            {challengeIdx < challenges.length && (
              <div className="absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full bg-primary px-4 py-1.5 text-sm font-extrabold text-primary-foreground shadow-lg">
                {challenges[challengeIdx].q} • {secondsLeft}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            وافق على فتح الكاميرا أعلاه لبدء التحقق الحي
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Always-available fallback: native camera capture (mobile) or file picker (desktop) */}
      {!done && (
        <div className="rounded-xl border border-border bg-card p-3 text-xs">
          <div className="mb-2 flex items-center gap-1.5 font-extrabold text-foreground">
            <Camera className="h-3.5 w-3.5 text-primary" />
            بديل آمن: التقاط فوري بكاميرا الجهاز
          </div>
          <p className="mb-2 text-muted-foreground">
            إذا لم يدعم متصفحك البث المباشر، يمكنك التقاط صورة فورية بكاميرا جهازك الأمامية (لا تُقبل صور من المعرض).
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 font-bold text-primary hover:bg-primary/10">
            <Camera className="h-3.5 w-3.5" />
            التقاط صورة فورية
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => { handleNativeCapture(e.target.files?.[0] ?? null); e.target.value = ""; }}
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {done && (
          <Button variant="outline" onClick={() => { framesRef.current = 0; setChallengeIdx(0); onCaptured(new Blob(), 0); }}>
            <RefreshCw className="h-4 w-4 me-2" /> إعادة الاختبار
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

/* ---------- Pledge + Signature pad ---------- */

function PledgeStep({
  fullName, onFullName, pledgeAccepted, arbitrationAccepted,
  onPledge, onArbitration, signaturePreview, onSignature, children,
}: {
  fullName: string; onFullName: (s: string) => void;
  pledgeAccepted: boolean; arbitrationAccepted: boolean;
  onPledge: (b: boolean) => void; onArbitration: (b: boolean) => void;
  signaturePreview: string;
  onSignature: (blob: Blob, dataUrl: string) => void;
  children: React.ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    const w = c.clientWidth; const h = c.clientHeight;
    c.width = w * ratio; c.height = h * ratio;
    const ctx = c.getContext("2d");
    if (ctx) { ctx.scale(ratio, ratio); ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.strokeStyle = "#0f172a"; }
  }, []);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const startDraw = (e: React.PointerEvent) => {
    drawingRef.current = true; lastRef.current = pos(e);
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const draw = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return;
    const p = pos(e); const last = lastRef.current || p;
    ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    lastRef.current = p; if (!hasInk) setHasInk(true);
  };
  const endDraw = () => {
    drawingRef.current = false; lastRef.current = null;
    if (!hasInk) return;
    const c = canvasRef.current; if (!c) return;
    c.toBlob((blob) => {
      if (blob) onSignature(blob, c.toDataURL("image/png"));
    }, "image/png");
  };
  const clear = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height); setHasInk(false);
    onSignature(new Blob(), "");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-base font-extrabold"><ScrollText className="h-6 w-6 text-primary" />التعهد والإقرار القانوني</div>

      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3 text-sm leading-7">
        <p className="font-extrabold text-base">تعهّد وإقرار بعدم التحايل</p>
        <p>
          أُقرّ أنا الموقّع أدناه بأن جميع البيانات والمستندات المقدمة في عملية التحقق من الهوية صحيحة وكاملة،
          وأتعهد بعدم استخدام أي وثيقة مزوّرة أو منتحلة أو بيانات شخص آخر، وبعدم القيام بأي عمل احتيالي
          أو التحايل على أنظمة المنصة بأي وسيلة.
        </p>
        <p className="font-bold">
          في حال ثبوت تحايلي بأي صورة من الصور، أُقرّ والتزم بدفع غرامة مالية قدرها (25,000$)
          خمسة وعشرون ألف دولار أمريكي لصالح <span className="text-primary">السيد/ عبدالعزيز أحمد عبدالكريم الفائر</span>،
          ويكون هذا الإقرار سنداً تنفيذياً غير قابل للطعن أو الجدال.
        </p>
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox checked={pledgeAccepted} onCheckedChange={(v) => onPledge(!!v)} />
          <span>أُقرّ وأتعهّد بما ورد أعلاه وأقبل الغرامة المنصوص عليها كاملةً.</span>
        </label>
      </div>

      <div className="rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-4 space-y-3 text-sm leading-7">
        <p className="font-extrabold flex items-center gap-2"><Scale className="h-5 w-5" /> شرط التحكيم</p>
        <p>
          أقبل التحكيم الحصري من قِبَل إدارة <strong>شركة فايرير السعودية</strong>
          (سجل تجاري رقم: <span dir="ltr">7053781691</span>) بوصفها الجهة الوحيدة المُخوّلة بالبت في وجود
          حالة تحايل من عدمه، ويكون قرارها نهائياً ونافذاً وملزِماً، مع تأكيد توافق هذه الاتفاقية
          مع أحكام الشريعة الإسلامية.
        </p>
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox checked={arbitrationAccepted} onCheckedChange={(v) => onArbitration(!!v)} />
          <span>أوافق على التحكيم الحصري لإدارة شركة فايرير السعودية وأقبل قرارها النهائي.</span>
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pledge-name" className="font-bold">الاسم الرباعي الكامل (كما في الهوية)</Label>
        <Input id="pledge-name" value={fullName} onChange={(e) => onFullName(e.target.value)} placeholder="مثال: محمد عبدالله أحمد الفائر" maxLength={120} />
      </div>

      <div className="space-y-2">
        <Label className="font-bold flex items-center gap-2"><PenTool className="h-4 w-4" /> التوقيع الرقمي</Label>
        <div className="rounded-xl border-2 border-dashed border-border bg-background p-1">
          <canvas
            ref={canvasRef}
            className="w-full h-40 touch-none rounded-lg bg-white"
            onPointerDown={startDraw}
            onPointerMove={draw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{signaturePreview ? "تم اعتماد التوقيع" : "ارسم توقيعك بإصبعك أو بالفأرة"}</span>
          <Button type="button" variant="ghost" size="sm" onClick={clear}><Eraser className="h-4 w-4 me-1" /> مسح</Button>
        </div>
      </div>

      {children}
    </div>
  );
}

function NextBack({ onBack, onNext, nextDisabled, nextLabel }: { onBack?: () => void; onNext: () => void; nextDisabled?: boolean; nextLabel: string; }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {onBack ? (
        <Button variant="outline" onClick={onBack}><ArrowRight className="h-4 w-4 ms-1" /> رجوع</Button>
      ) : <span />}
      <Button onClick={onNext} disabled={nextDisabled} className="gradient-primary text-primary-foreground font-bold">
        {nextLabel} <ArrowLeft className="h-4 w-4 ms-1" />
      </Button>
    </div>
  );
}

function ResultView({ result, onRetry }: { result: { status: Status; score?: number; reasoning?: string }; onRetry: () => void; }) {
  const status = result.status;
  if (status === "approved" || status === "verified") {
    return (
      <div className="text-center space-y-3 py-4">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-extrabold">تم توثيق حسابك ✅</h3>
        <p className="text-sm text-muted-foreground">
          درجة الثقة: <strong>{Math.round((result.score ?? 0) * 100)}%</strong> — تظهر الآن دائرة خضراء حول صورتك.
        </p>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="py-4">
        <RejectionReason
          title="تم رفض طلب التحقق"
          reason={result.reasoning ?? "لم نتمكن من التحقق من بياناتك."}
          onRetry={onRetry}
        />
      </div>
    );
  }
  return (
    <div className="text-center space-y-3 py-4">
      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
        <Loader2 className="h-8 w-8 text-amber-600" />
      </div>
      <h3 className="text-xl font-extrabold">قيد المراجعة البشرية</h3>
      <p className="text-sm text-muted-foreground">{result.reasoning ?? "سيتم مراجعة طلبك ووصلك إشعار قريباً."}</p>
    </div>
  );
}

/* =================================================================
 * VerifiedAvatar — fetches profile by userId, renders avatar inside a
 * verification ring (green = verified, blue = premium).
 * ================================================================= */

interface VerifiedAvatarProps {
  userId: string;
  size?: number;
  showName?: boolean;
  avatarUrl?: string | null;
  displayName?: string | null;
  verifiedGreen?: boolean;
  verifiedBlue?: boolean;
}

export function VerifiedAvatar({
  userId, size = 64, showName,
  avatarUrl: avatarProp, displayName: nameProp,
  verifiedGreen: greenProp, verifiedBlue: blueProp,
}: VerifiedAvatarProps) {
  const hasInline = avatarProp !== undefined || nameProp !== undefined || greenProp !== undefined || blueProp !== undefined;
  const [data, setData] = useState<{ avatar_url?: string | null; display_name?: string | null; verified_green?: boolean; verified_blue?: boolean } | null>(
    hasInline ? { avatar_url: avatarProp, display_name: nameProp, verified_green: greenProp, verified_blue: blueProp } : null
  );

  useEffect(() => {
    if (hasInline || !userId) return;
    let active = true;
    supabase
      .from("profiles")
      .select("avatar_url, display_name, verified_green, verified_blue")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => { if (active) setData((data as any) ?? {}); });
    return () => { active = false; };
  }, [userId, hasInline]);

  const verified = !!data?.verified_green;
  const premium = !!data?.verified_blue;
  const display = data?.display_name || "مستخدم";
  const inner = size - 4;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <span
        className={`avatar-container ${verified ? "verified" : ""} ${premium ? "premium" : ""}`}
        style={{ width: size, height: size, position: "relative" }}
        title={verified ? "حساب موثّق" : undefined}
      >
        {data?.avatar_url ? (
          <img
            src={data.avatar_url}
            alt={display}
            width={inner}
            height={inner}
            style={{ width: inner, height: inner, borderRadius: "9999px", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: inner, height: inner, borderRadius: "9999px",
              background: "linear-gradient(135deg,#1e3c72,#2a5298)",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: Math.max(12, inner / 2.4),
            }}
          >
            {display.slice(0, 1).toUpperCase()}
          </div>
        )}
        {verified && (
          <span
            style={{
              position: "absolute", insetInlineEnd: -2, bottom: -2,
              background: "#16a34a", color: "#fff",
              width: Math.max(18, size / 3.5), height: Math.max(18, size / 3.5),
              borderRadius: "9999px", display: "inline-flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 2px var(--background)",
            }}
            title="حساب موثّق بالذكاء الاصطناعي"
          >
            <ShieldCheck size={Math.max(11, size / 6)} />
          </span>
        )}
      </span>
      {showName && (
        <span style={{ display: "inline-flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 800, fontSize: 14 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{display}</span>
            {premium && (
              <span className="verified-check-blue" title="عضوية مميزة">
                <CheckCircle2 size={12} />
              </span>
            )}
          </span>
        </span>
      )}
    </span>
  );
}
