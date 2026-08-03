import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("جاري إكمال تسجيل الدخول...");

  useEffect(() => {
    let mounted = true;

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
          throw new Error("لم يتم إنشاء جلسة تسجيل دخول.");
        }

        navigate({ to: "/dashboard", replace: true });
      } catch (error) {
        console.error("[auth/callback]", error);
        if (mounted) setMessage("تعذر إكمال تسجيل الدخول. سيتم الرجوع لصفحة الدخول...");
        window.setTimeout(() => navigate({ to: "/auth", replace: true }), 1200);
      }
    }

    completeAuth();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-background px-4">
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="text-sm font-bold text-muted-foreground">{message}</div>
      </div>
    </main>
  );
}
