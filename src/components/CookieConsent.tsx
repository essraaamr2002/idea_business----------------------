import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const KEY = "fb_cookie_consent_v1";

export function CookieConsent() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {}
  }, []);

  if (!show) return null;

  const decide = (value: "accept" | "reject") => {
    try {
      localStorage.setItem(KEY, value);
    } catch {}
    setShow(false);
  };

  return (
    <div className="fixed inset-x-2 bottom-20 z-40 mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur md:bottom-4">
      <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-foreground">{t("cookie.message")}</p>
        <div className="flex gap-2">
          <button onClick={() => decide("reject")} className="rounded-md border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted">
            {t("cookie.reject")}
          </button>
          <button onClick={() => decide("accept")} className="rounded-md bg-primary px-3 py-1.5 text-xs font-extrabold text-primary-foreground hover:bg-primary/90">
            {t("cookie.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
