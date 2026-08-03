import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Mail, Lock, User, Eye, EyeOff, Check, Shield } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { SecurityStrip } from "@/components/SecurityBadges";

function friendlyAuthError(error: unknown) {
  const message =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";
  const lower = message.toLowerCase();

  if (lower.includes("missing oauth secret") || lower.includes("unsupported provider")) {
    return "تسجيل الدخول بهذا المزود غير مكتمل الإعداد. فعّل Google/Apple من Supabase Auth وأضف Client ID و Client Secret.";
  }
  if (lower.includes("invalid login credentials")) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  }
  if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
    return "يجب تأكيد البريد الإلكتروني أولاً. افتح رسالة التفعيل ثم جرّب تسجيل الدخول مرة أخرى.";
  }
  if (lower.includes("user already registered") || lower.includes("already registered")) {
    return "هذا البريد مسجل بالفعل. جرّب تسجيل الدخول أو استخدم استعادة كلمة المرور.";
  }
  if (lower.includes("password should") || lower.includes("weak password")) {
    return "كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل مع أرقام وحروف.";
  }
  if (lower.includes("signup is disabled")) {
    return "إنشاء الحسابات غير مفعّل حالياً من إعدادات Supabase Auth.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "تمت محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم جرّب مرة أخرى.";
  }

  return message || "تعذر تنفيذ عملية المصادقة. تحقق من البيانات وحاول مرة أخرى.";
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — iDEA Business" },
      { name: "description", content: "سجّل دخولك أو أنشئ حسابك في iDEA Business — المنصة العربية الأولى لتمويل وتداول المشاريع." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"login" | "register" | "staff">("login");

  // Capture ?ref=CODE on landing and persist for claim after sign-up/sign-in
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && /^[A-Za-z0-9]{4,16}$/.test(ref)) {
      try { localStorage.setItem("pending_referral_code", ref.toUpperCase()); } catch {}
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const code = localStorage.getItem("pending_referral_code");
        if (code) {
          await supabase.rpc("claim_referral", { p_code: code });
          localStorage.removeItem("pending_referral_code");
        }
      } catch {}
      nav({ to: "/dashboard" });
    })();
  }, [user, nav]);

  return (
    <div dir="rtl" className="grid min-h-screen lg:grid-cols-2">
      {/* ── VISUAL SIDE ── */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary-dark via-primary to-[#2E6FBE] p-12 lg:flex lg:flex-col lg:justify-center">
        {/* orbs + grid */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-orange/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-[350px] w-[350px] rounded-full bg-green-verified/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-md">
          <Link to="/" className="mb-12 flex items-center gap-4">
            <div className="rounded-2xl bg-white p-2 shadow-2xl">
              <BrandLogo size={160} />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-white">iDEA Business</div>
              <div className="text-sm text-white/60">IDEA BUSINESS</div>
            </div>
          </Link>

          <h1 className="mb-4 text-4xl font-black leading-tight text-white md:text-5xl">
            حوّل <em className="not-italic text-orange">فكرتك</em>
            <br />
            إلى استثمار
            <br />
            مربح ومضمون
          </h1>
          <p className="mb-10 max-w-sm text-base leading-relaxed text-white/60">
            انضم للمنصة الاستثمارية العربية الأولى مع ضمانات قانونية وذكاء اصطناعي متكامل.
          </p>


          <ul className="space-y-3">
            {[
              "ضمانات قانونية حقيقية لكل استثمار",
              "توقيع إلكتروني معتمد وآمن",
              "ذكاء اصطناعي يحلل المخاطر",
              "سوق داخلي لتداول الحصص",
              "محفظة مالية حقيقية متكاملة",
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-white/75">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── FORM SIDE ── */}
      <main className="flex items-center justify-center bg-background p-6 lg:bg-white lg:p-10">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <Link to="/" className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <BrandLogo size={140} />
            <span className="text-xl font-black text-primary-dark">iDEA Business</span>
          </Link>
          {/* Tabs */}
          {/* Tabs */}
          <div className="mb-7 flex gap-1 rounded-2xl bg-muted p-1">
            {(["login", "register", "staff"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-xl py-2.5 text-xs font-extrabold transition sm:text-sm ${
                  tab === t ? "bg-white text-primary-dark shadow-sm" : "text-muted-foreground"
                }`}
              >
                {t === "login" ? "تسجيل الدخول" : t === "register" ? "حساب جديد" : "دخول الموظفين"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <LoginForm />
          ) : tab === "register" ? (
            <RegisterForm onSuccess={() => setTab("login")} />
          ) : (
            <StaffLoginForm />
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            أو {tab === "login" ? "تابع باستخدام" : "أنشئ حساب باستخدام"}
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="flex gap-2.5">
            <SocialButton provider="google" label="Google" />
            <SocialButton provider="apple" label="Apple" />
          </div>

          <div className="mt-6">
            <SecurityStrip />
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">

            {tab === "login" ? "لا تملك حساب؟ " : "لديك حساب بالفعل؟ "}
            <button
              onClick={() => setTab(tab === "login" ? "register" : "login")}
              className="font-extrabold text-primary hover:underline"
            >
              {tab === "login" ? "أنشئ حساب جديد" : "سجّل دخولك"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

/* ───────────── FORMS ───────────── */

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(friendlyAuthError(error));
    toast.success("تم تسجيل الدخول بنجاح");
    nav({ to: "/dashboard" });
  };

  return (
    <form onSubmit={onSubmit}>
      <h2 className="mb-1.5 text-2xl font-black text-primary-dark">أهلاً بعودتك 👋</h2>
      <p className="mb-6 text-sm text-muted-foreground">أدخل بياناتك للدخول لحسابك</p>

      <Field label="البريد الإلكتروني" required>
        <InputIcon icon={<Mail className="h-4 w-4" />}>
          <input
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </InputIcon>
      </Field>

      <Field label="كلمة المرور" required>
        <InputIcon icon={<Lock className="h-4 w-4" />}>
          <input
            type={showPass ? "text" : "password"}
            required
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="أدخل كلمة المرور"
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
          >
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </InputIcon>
      </Field>

      <div className="-mt-2 mb-4 flex items-center justify-between">
        <Checkbox checked={remember} onChange={setRemember} label="تذكرني 30 يوماً" />
        <Link
          to="/forgot-password"
          className="text-xs font-extrabold text-primary hover:underline"
        >
          نسيت كلمة المرور؟
        </Link>
      </div>

      <SubmitButton loading={loading}>دخول ←</SubmitButton>
    </form>
  );
}

function StaffLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      return toast.error(error ? friendlyAuthError(error) : "تعذر تسجيل الدخول");
    }
    // verify staff role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    setLoading(false);
    const staffRoles = ["admin", "moderator", "seo", "accountant", "support"];
    const isStaff = (roles ?? []).some((r: { role: string }) => staffRoles.includes(r.role));
    if (!isStaff) {
      await supabase.auth.signOut();
      return toast.error("هذا الحساب ليس له صلاحيات موظف");
    }
    toast.success("مرحباً بك في لوحة الإدارة");
    nav({ to: "/admin" });
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="mb-6 flex items-center gap-3 rounded-xl border-2 border-primary/20 bg-primary/5 p-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <div className="text-sm font-black text-primary-dark">دخول الموظفين</div>
          <div className="text-xs text-muted-foreground">للوصول إلى لوحة الإدارة فقط</div>
        </div>
      </div>

      <Field label="البريد الإلكتروني للموظف" required>
        <InputIcon icon={<Mail className="h-4 w-4" />}>
          <input
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff@busniss.org"
            className={inputCls}
          />
        </InputIcon>
      </Field>

      <Field label="كلمة المرور" required>
        <InputIcon icon={<Lock className="h-4 w-4" />}>
          <input
            type={showPass ? "text" : "password"}
            required
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="أدخل كلمة المرور"
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
          >
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </InputIcon>
      </Field>

      <SubmitButton loading={loading}>دخول لوحة الإدارة ←</SubmitButton>
    </form>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return toast.error("يجب الموافقة على الشروط والأحكام");
    if (password.length < 8) return toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
      return toast.error("كلمة المرور يجب أن تحتوي على حروف وأرقام");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        data: { display_name: name },
      },
    });
    setLoading(false);
    if (error) return toast.error(friendlyAuthError(error));
    toast.success("تم إنشاء الحساب — تحقق من بريدك ثم سجّل الدخول");
    onSuccess();
  };

  return (
    <form onSubmit={onSubmit}>
      <h2 className="mb-1.5 text-2xl font-black text-primary-dark">أنشئ حسابك 🚀</h2>
      <p className="mb-6 text-sm text-muted-foreground">انضم لآلاف المستثمرين ورواد الأعمال</p>

      <Field label="الاسم الكامل" required>
        <InputIcon icon={<User className="h-4 w-4" />}>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="محمد أحمد"
            className={inputCls}
          />
        </InputIcon>
      </Field>

      <Field label="البريد الإلكتروني" required>
        <InputIcon icon={<Mail className="h-4 w-4" />}>
          <input
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
        </InputIcon>
      </Field>

      <Field label="كلمة المرور" required>
        <InputIcon icon={<Lock className="h-4 w-4" />}>
          <input
            type={showPass ? "text" : "password"}
            required
            minLength={8}
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8 أحرف على الأقل + أرقام"
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
          >
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </InputIcon>
        {password.length > 0 && (
          <div className="mt-2">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full transition ${
                    i < strength.score
                      ? ["bg-[#E74C3C]", "bg-orange", "bg-[#F39C12]", "bg-green-verified"][strength.score - 1]
                      : "bg-border"
                  }`}
                />
              ))}
            </div>
            <div className={`mt-1 text-[10px] font-extrabold ${strength.color}`}>{strength.label}</div>
          </div>
        )}
      </Field>

      <div className="mb-2 mt-4">
        <Checkbox
          checked={agreed}
          onChange={setAgreed}
          label={
            <span>
              أوافق على <a className="font-extrabold text-primary">شروط الاستخدام</a> و
              <a className="font-extrabold text-primary"> سياسة الخصوصية</a>
            </span>
          }
        />
      </div>

      <SubmitButton loading={loading} variant="orange">إنشاء الحساب ✨</SubmitButton>
    </form>
  );
}

/* ───────────── PRIMITIVES ───────────── */

const inputCls =
  "w-full rounded-xl border-2 border-border bg-white px-4 py-3 ps-11 pe-3 text-[15px] font-medium text-[#343A40] outline-none transition placeholder:text-muted-foreground placeholder:text-sm hover:border-[#DEE2E6] focus:border-primary focus:shadow-[0_0_0_4px_rgba(27,79,138,0.08)]";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[13px] font-extrabold text-[#495057]">
        {label}
        {required && <span className="text-[#E74C3C]"> *</span>}
      </label>
      {children}
    </div>
  );
}

function InputIcon({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <span
        onClick={() => onChange(!checked)}
        className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-2 transition ${
          checked ? "border-primary bg-primary text-white" : "border-[#DEE2E6] bg-white"
        }`}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="text-[13px] leading-relaxed text-muted-foreground">{label}</span>
    </label>
  );
}

function SubmitButton({
  children,
  loading,
  variant = "navy",
}: {
  children: React.ReactNode;
  loading?: boolean;
  variant?: "navy" | "orange";
}) {
  const bg =
    variant === "orange"
      ? "bg-orange hover:bg-[#C4610A] hover:shadow-[0_6px_20px_rgba(245,130,32,0.3)]"
      : "bg-primary hover:bg-primary-dark hover:shadow-[0_6px_20px_rgba(27,79,138,0.3)]";
  return (
    <button
      type="submit"
      disabled={loading}
      className={`mt-1 w-full rounded-xl py-3.5 text-base font-black text-white transition active:scale-[.98] disabled:opacity-60 ${bg}`}
    >
      {loading ? "..." : children}
    </button>
  );
}

function SocialButton({
  provider,
  label,
  disabled,
}: {
  provider: "google" | "apple";
  label: string;
  disabled?: boolean;
}) {
  const onClick = async () => {
    if (disabled) return;
    const { lovable } = await import("@/integrations/lovable");
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: typeof window !== "undefined" ? `${window.location.origin}/journey` : "",
    });
    if (result.error) toast.error(friendlyAuthError(result.error));
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-border bg-white px-3 py-2.5 text-sm font-extrabold text-[#495057] transition hover:border-[#DEE2E6] hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {provider === "google" ? <GoogleIcon /> : <AppleIcon />}
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function passwordStrength(p: string) {
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  const labels = ["", "ضعيفة", "متوسطة", "جيدة", "ممتازة"];
  const colors = ["", "text-[#E74C3C]", "text-orange", "text-[#F39C12]", "text-green-verified"];
  return { score: s, label: labels[s], color: colors[s] };
}
