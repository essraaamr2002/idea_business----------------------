import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

type OAuthProvider = "google" | "apple";

type OAuthInitiateSearch = {
  provider?: string;
  redirect_uri?: string;
};

function isOAuthProvider(provider: string | undefined): provider is OAuthProvider {
  return provider === "google" || provider === "apple";
}

function messageFor(error: unknown, lang: "ar" | "en") {
  const raw = error instanceof Error ? error.message : String(error || "");
  const lower = raw.toLowerCase();

  if (lower.includes("service_role") || lower.includes("connect supabase")) {
    return lang === "ar"
      ? "إعداد Supabase ناقص في Lovable Cloud. أضف SUPABASE_SERVICE_ROLE_KEY ثم جرّب مرة أخرى."
      : "Supabase is missing a Lovable Cloud server secret. Add SUPABASE_SERVICE_ROLE_KEY and try again.";
  }

  if (lower.includes("timeout")) {
    return lang === "ar"
      ? "لم يبدأ تحويل Google. غالباً إعدادات Lovable Cloud أو Supabase غير مكتملة."
      : "Google redirect did not start. Lovable Cloud or Supabase settings are likely incomplete.";
  }

  return lang === "ar"
    ? "تعذر بدء تسجيل الدخول بجوجل. راجع إعدادات Supabase في Lovable Cloud."
    : "Could not start Google sign-in. Check Supabase settings in Lovable Cloud.";
}

export function OAuthInitiatePage({ search }: { search: OAuthInitiateSearch }) {
  const navigate = useNavigate();
  const { lang, dir } = useI18n();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | undefined;

    async function redirect() {
      if (!isOAuthProvider(search.provider)) {
        navigate({ to: "/auth", replace: true });
        return;
      }

      timeoutId = window.setTimeout(() => {
        if (!mounted) return;
        setError(messageFor(new Error("oauth_timeout"), lang));
      }, 8000);

      try {
        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: search.provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (!mounted) return;
        if (timeoutId) window.clearTimeout(timeoutId);

        if (oauthError) {
          setError(messageFor(oauthError, lang));
          return;
        }

        if (!data.url) {
          setError(messageFor(new Error("oauth_no_redirect"), lang));
          return;
        }

        window.location.assign(data.url);
      } catch (e) {
        if (!mounted) return;
        if (timeoutId) window.clearTimeout(timeoutId);
        setError(messageFor(e, lang));
      }
    }

    redirect();
    return () => {
      mounted = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [navigate, search.provider, search.redirect_uri, lang]);

  return (
    <main dir={dir} className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        {error ? (
          <>
            <div className="text-base font-extrabold text-destructive">
              {lang === "ar" ? "تعذر تسجيل الدخول" : "Sign-in failed"}
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">{error}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={() => window.location.reload()}>
                {lang === "ar" ? "إعادة المحاولة" : "Try again"}
              </Button>
              <Link to="/auth">
                <Button type="button" variant="outline">
                  {lang === "ar" ? "العودة للدخول" : "Back to sign in"}
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-sm font-bold text-muted-foreground">
            {lang === "ar" ? "جاري تحويل تسجيل الدخول..." : "Redirecting sign-in..."}
          </div>
        )}
      </div>
    </main>
  );
}
