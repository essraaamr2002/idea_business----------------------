import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, ArrowRight } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "نسيت كلمة المرور — iDEA Business" },
      { name: "description", content: "استعد كلمة المرور لحسابك في iDEA Business عبر رابط آمن يُرسل إلى بريدك." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo:
        typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
    });
    setLoading(false);
    if (error) {
      // Show same message either way (avoid email enumeration)
      if (/rate|limit|too many/i.test(error.message)) {
        return toast.error("تم تجاوز الحد الأقصى للمحاولات — حاول لاحقاً");
      }
    }
    setSent(true);
    toast.success("إذا كان البريد مسجلاً، ستصلك رسالة الاستعادة خلال دقائق");
  };

  return (
    <div dir="rtl" className="grid min-h-screen place-items-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border-2 border-border bg-white p-8 shadow-sm">
        <Link to="/" className="mb-6 flex items-center justify-center gap-3">
          <BrandLogo size={64} />
          <span className="text-lg font-black text-primary-dark">iDEA Business</span>
        </Link>

        <h1 className="mb-1.5 text-center text-2xl font-black text-primary-dark">
          نسيت كلمة المرور؟
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          أدخل بريدك وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
        </p>

        {sent ? (
          <div className="rounded-xl bg-green-verified/10 p-5 text-center text-sm leading-relaxed text-green-verified">
            ✅ تم إرسال الرابط (إن كان البريد مسجلاً).<br />
            تحقق من البريد الوارد ومن مجلد الـ Spam.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-extrabold text-[#495057]">
                البريد الإلكتروني <span className="text-[#E74C3C]">*</span>
              </span>
              <div className="relative">
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border-2 border-border bg-white px-4 py-3 ps-11 text-[15px] font-medium outline-none transition focus:border-primary focus:shadow-[0_0_0_4px_rgba(27,79,138,0.08)]"
                />
                <Mail className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3.5 text-base font-black text-white transition hover:bg-primary-dark active:scale-[.98] disabled:opacity-60"
            >
              {loading ? "..." : "إرسال رابط الاستعادة"}
            </button>
          </form>
        )}

        <Link
          to="/auth"
          className="mt-6 flex items-center justify-center gap-1 text-sm font-extrabold text-primary hover:underline"
        >
          العودة لتسجيل الدخول <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
