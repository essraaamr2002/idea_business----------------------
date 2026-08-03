import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gift, Sparkles, X } from "lucide-react";

const KEY = "fb_inv3win_dismissed_v1";

// End of current month
function endOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
}

export function Invite3WinBanner() {
  const [show, setShow] = useState(false);
  const [left, setLeft] = useState(() => endOfMonth() - Date.now());

  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setShow(true); } catch {}
    const i = setInterval(() => setLeft(endOfMonth() - Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!show) return null;

  const d = Math.max(0, Math.floor(left / 86400000));
  const h = Math.max(0, Math.floor((left % 86400000) / 3600000));
  const m = Math.max(0, Math.floor((left % 3600000) / 60000));

  return (
    <div className="relative z-20 bg-gradient-to-l from-amber-500/20 via-primary/15 to-amber-500/20 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-2 text-xs">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        <span className="font-black text-amber-700 dark:text-amber-300">حملة "ادعُ ٣ — اربح شهر كامل"</span>
        <span className="text-muted-foreground">ينتهي خلال:</span>
        <span dir="ltr" className="rounded-md bg-foreground/10 px-2 py-0.5 font-extrabold tabular-nums">
          {d}d {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
        </span>
        <Link to="/referrals" className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 font-extrabold text-primary-foreground hover:opacity-90">
          <Gift className="h-3.5 w-3.5" />
          شارك الآن
        </Link>
        <button
          aria-label="إغلاق"
          onClick={() => { try { localStorage.setItem(KEY, "1"); } catch {} setShow(false); }}
          className="ms-1 rounded p-1 hover:bg-foreground/10"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
