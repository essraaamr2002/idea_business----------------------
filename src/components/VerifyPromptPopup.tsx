import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const DISMISS_KEY = "verify_popup_dismissed_at";
const SNOOZE_HOURS = 24;

export function VerifyPromptPopup() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) { setVisible(false); return; }
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissed && Date.now() - dismissed < SNOOZE_HOURS * 3600 * 1000) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("verified_green")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data?.verified_green) {
          // small delay so it doesn't pop instantly on page load
          setTimeout(() => !cancelled && setVisible(true), 1500);
        }
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  if (!visible) return null;

  const close = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div
      dir="rtl"
      className="fixed bottom-4 left-4 z-[60] w-[300px] max-w-[calc(100vw-2rem)] rounded-2xl border border-amber-300/50 bg-gradient-to-br from-amber-50 to-white p-4 shadow-2xl dark:from-amber-950/40 dark:to-background dark:border-amber-700/40"
      role="dialog"
      aria-label="إعلان توثيق الحساب"
    >
      <button
        onClick={close}
        aria-label="إغلاق"
        className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground hover:bg-muted"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-amber-600 dark:text-amber-400">إعلان</div>
          <div className="mt-0.5 text-sm font-black text-foreground">وثّق حسابك الآن</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            احصل على العلامة الخضراء بجوار اسمك، صلاحيات أوسع، وثقة أكبر داخل المنصة.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Link
              to="/verify"
              onClick={close}
              className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-white shadow hover:bg-amber-600"
            >
              ابدأ التوثيق
            </Link>
            <button
              onClick={close}
              className="text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
