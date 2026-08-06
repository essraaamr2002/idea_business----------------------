import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { lang, dir } = useI18n();
  const [message, setMessage] = useState(
    lang === "ar" ? "جاري إكمال تسجيل الدخول..." : "Completing sign-in...",
  );

  useEffect(() => {
    let mounted = true;
    const timeoutId = window.setTimeout(() => {
      if (!mounted) return;
      setMessage(
        lang === "ar"
          ? "استغرق تسجيل الدخول وقتًا أطول من المتوقع. ستتم إعادتك إلى صفحة الدخول..."
          : "Sign-in took longer than expected. Returning to the sign-in page...",
      );
      window.setTimeout(() => navigate({ to: "/auth", replace: true }), 1200);
    }, 12_000);

    async function completeAuth() {
      try {
        const url = new URL(window.location.href);
        const errorDescription =
          url.searchParams.get("error_description") || url.searchParams.get("error") || "";

        if (errorDescription) {
          throw new Error(errorDescription);
        }

        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          throw new Error("No auth session was created.");
        }

        window.clearTimeout(timeoutId);
        navigate({ to: "/dashboard", replace: true });
      } catch (error) {
        console.error("[auth/callback]", error);
        if (mounted) {
          setMessage(
            lang === "ar"
              ? "تعذر إكمال تسجيل الدخول. سيتم الرجوع لصفحة الدخول..."
              : "Could not complete sign-in. Returning to the sign-in page...",
          );
        }
        window.setTimeout(() => navigate({ to: "/auth", replace: true }), 1200);
      }
    }

    completeAuth();
    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [navigate, lang]);

  return (
    <main dir={dir} className="grid min-h-screen place-items-center bg-background px-4">
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="text-sm font-bold text-muted-foreground">{message}</div>
      </div>
    </main>
  );
}
