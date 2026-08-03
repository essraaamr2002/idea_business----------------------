import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gift, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const KEY = "fb_exit_intent_seen_v1";
const CODE = "WELCOME15";

export function ExitIntentBar() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { if (localStorage.getItem(KEY)) return; } catch {}

    let armed = false;
    const arm = setTimeout(() => { armed = true; }, 10000); // arm after 10s on site

    const onLeave = (e: MouseEvent) => {
      if (!armed) return;
      if (e.clientY <= 0 && e.relatedTarget == null) {
        setOpen(true);
        try { localStorage.setItem(KEY, "1"); } catch {}
        document.removeEventListener("mouseout", onLeave);
      }
    };
    document.addEventListener("mouseout", onLeave);
    return () => {
      clearTimeout(arm);
      document.removeEventListener("mouseout", onLeave);
    };
  }, []);

  if (!open) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CODE);
      setCopied(true);
      toast.success("تم نسخ الكود");
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="relative w-full max-w-md rounded-2xl border border-primary/40 bg-card p-6 shadow-2xl">
        <button
          aria-label="إغلاق"
          onClick={() => setOpen(false)}
          className="absolute end-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-foreground/10"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-primary text-2xl">🎁</div>
        <h3 className="text-xl font-black">قبل ما تروح…</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          خصم <span className="font-black text-primary">١٥٪</span> على عضويتك الأولى — هدية ترحيب.
        </p>
        <div className="my-4 flex items-stretch gap-2">
          <code dir="ltr" className="flex-1 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-center text-lg font-black text-primary">
            {CODE}
          </code>
          <button onClick={copy} className="rounded-lg border border-border px-3 hover:bg-foreground/5">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <Link
          to="/membership"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-extrabold text-primary-foreground hover:opacity-90"
        >
          <Gift className="h-4 w-4" />
          استخدم الكود الآن
        </Link>
      </div>
    </div>
  );
}
