import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Check } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "إعادة تعيين كلمة المرور — iDEA Business" },
      { name: "description", content: "اختر كلمة مرور جديدة لحسابك في iDEA Business." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // Supabase auto-exchanges the recovery token from the URL hash into a session.
  // We wait for that, then allow updateUser({ password }).
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted && data.session) setReady(true);
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("كلمة المرور 8 أحرف على الأقل");
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password))
      return toast.error("كلمة المرور يجب أن تحتوي على حروف وأرقام");
    if (password !== confirm) return toast.error("كلمتا المرور غير متطابقتين");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("تم تحديث كلمة المرور بنجاح");
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  };

  return (
    <div dir="rtl" className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border-2 border-border bg-white p-8 shadow-sm">
        <Link to="/" className="mb-6 flex items-center justify-center gap-3">
          <BrandLogo size={64} />
          <span className="text-lg font-black text-primary-dark">iDEA Business</span>
        </Link>

        <h1 className="mb-1.5 text-center text-2xl font-black text-primary-dark">
          كلمة مرور جديدة
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          اختر كلمة مرور قوية لحماية حسابك
        </p>

        {!ready ? (
          <div className="rounded-xl bg-muted p-5 text-center text-sm text-muted-foreground">
            جاري التحقق من رابط الاستعادة...
            <br />
            <span className="text-xs">إذا انتظرت طويلاً، أعد طلب الرابط من صفحة نسيت كلمة المرور.</span>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <PasswordField
              label="كلمة المرور الجديدة"
              value={password}
              onChange={setPassword}
              show={show}
              setShow={setShow}
            />
            <PasswordField
              label="تأكيد كلمة المرور"
              value={confirm}
              onChange={setConfirm}
              show={show}
              setShow={setShow}
            />
            {password && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                <Rule ok={password.length >= 8}>8 أحرف على الأقل</Rule>
                <Rule ok={/[A-Za-z]/.test(password) && /\d/.test(password)}>
                  حروف وأرقام
                </Rule>
                <Rule ok={password === confirm && confirm.length > 0}>كلمتا المرور متطابقتان</Rule>
              </ul>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3.5 text-base font-black text-white transition hover:bg-primary-dark active:scale-[.98] disabled:opacity-60"
            >
              {loading ? "..." : "تحديث كلمة المرور"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  setShow,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  setShow: (s: boolean) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-extrabold text-[#495057]">
        {label} <span className="text-[#E74C3C]">*</span>
      </span>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          required
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          minLength={8}
          className="w-full rounded-xl border-2 border-border bg-white px-4 py-3 ps-11 pe-11 text-[15px] font-medium outline-none transition focus:border-primary focus:shadow-[0_0_0_4px_rgba(27,79,138,0.08)]"
        />
        <Lock className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "text-green-verified" : ""}`}>
      <Check className={`h-3 w-3 ${ok ? "opacity-100" : "opacity-30"}`} strokeWidth={3} />
      {children}
    </li>
  );
}
