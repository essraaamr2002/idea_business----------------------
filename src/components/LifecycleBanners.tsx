import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, Cake, HeartHandshake, Gift } from "lucide-react";
import { claimBirthdayIfDue, shouldShowMissedYou, addPoints } from "@/lib/loyalty";
import { toast } from "sonner";

const BIRTHDAY_DISMISS = "fb_bday_dismiss_v1";
const MISSED_DISMISS = "fb_missed_dismiss_v1";

export function LifecycleBanners() {
  const [bday, setBday] = useState(false);
  const [missed, setMissed] = useState(false);

  useEffect(() => {
    try {
      const claimed = claimBirthdayIfDue();
      if (claimed) {
        toast.success("🎂 كل عام وأنت بخير — أضفنا لك ٢٠٠ نقطة هدية!");
      }
      const today = new Date().toISOString().slice(0, 10);
      const lastB = localStorage.getItem(BIRTHDAY_DISMISS);
      if (claimed && lastB !== today) setBday(true);

      const lastM = localStorage.getItem(MISSED_DISMISS);
      if (shouldShowMissedYou() && lastM !== today) setMissed(true);
    } catch {}
  }, []);

  if (bday) {
    return (
      <Banner
        color="from-pink-500/20 via-rose-500/15 to-amber-500/20"
        icon={<Cake className="h-4 w-4 text-rose-500" />}
        text={<>🎉 <b>كل عام وأنت بخير!</b> أضفنا ٢٠٠ نقطة ولاء — استخدمها في متجر المكافآت.</>}
        cta="استبدل النقاط"
        href="/loyalty/shop"
        onClose={() => {
          try { localStorage.setItem(BIRTHDAY_DISMISS, new Date().toISOString().slice(0, 10)); } catch {}
          setBday(false);
        }}
      />
    );
  }

  if (missed) {
    return (
      <Banner
        color="from-primary/20 via-primary/10 to-amber-500/15"
        icon={<HeartHandshake className="h-4 w-4 text-primary" />}
        text={<><b>اشتقنا لك!</b> هدية رجوع: ٥٠ نقطة ولاء + كوبون <code className="rounded bg-foreground/10 px-1.5 font-black">COMEBACK20</code></>}
        cta="استلم الهدية"
        href="/loyalty"
        onClose={() => {
          addPoints(50);
          try { localStorage.setItem(MISSED_DISMISS, new Date().toISOString().slice(0, 10)); } catch {}
          setMissed(false);
          toast.success("تم إضافة ٥٠ نقطة لرصيدك");
        }}
      />
    );
  }
  return null;
}

function Banner({ color, icon, text, cta, href, onClose }: {
  color: string; icon: React.ReactNode; text: React.ReactNode; cta: string; href: string; onClose: () => void;
}) {
  return (
    <div className={`relative z-20 bg-gradient-to-l ${color} backdrop-blur`}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-2 text-xs">
        {icon}
        <span>{text}</span>
        <Link to={href as "/loyalty"} onClick={onClose} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 font-extrabold text-primary-foreground hover:opacity-90">
          <Gift className="h-3 w-3" /> {cta}
        </Link>
        <button aria-label="إغلاق" onClick={onClose} className="ms-1 rounded p-1 hover:bg-foreground/10">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
