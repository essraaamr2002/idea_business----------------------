import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Megaphone, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const KEY = "fb_ann_dismissed_v1";

export function AnnouncementBar() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {}
  }, []);

  if (!show) return null;

  return (
    <div className="relative z-30 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 text-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2 text-xs">
        <Megaphone className="h-3.5 w-3.5 text-primary" />
        <span className="font-bold">{t("announcement.badge")}</span>
        <span className="text-muted-foreground">{t("announcement.message")}</span>
        <Link to="/referrals" className="font-extrabold text-primary hover:underline">
          {t("cta.learnMore")}
        </Link>
        <button
          aria-label={t("announcement.close")}
          onClick={() => {
            try {
              localStorage.setItem(KEY, "1");
            } catch {}
            setShow(false);
          }}
          className="ms-2 rounded p-1 hover:bg-foreground/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
