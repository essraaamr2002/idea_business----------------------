import { useEffect, useState } from "react";
import { TrendingUp, Users, CheckCircle2 } from "lucide-react";

const EVENTS = [
  { icon: <Users className="h-4 w-4" />, text: "انضم ٢٣ مستثمراً جديداً اليوم" },
  { icon: <TrendingUp className="h-4 w-4" />, text: "مشروع \"مطعم الواحة\" تجاوز ٨٠٪ من التمويل" },
  { icon: <CheckCircle2 className="h-4 w-4" />, text: "صفقة جديدة مكتملة بنجاح خلال الساعة الماضية" },
  { icon: <Users className="h-4 w-4" />, text: "أحمد من الرياض اشترك بعضوية كاملة" },
  { icon: <TrendingUp className="h-4 w-4" />, text: "+١٢ مشروع جديد هذا الأسبوع" },
];

const KEY = "fb_socialproof_off_v1";

export function SocialProofToast() {
  const [idx, setIdx] = useState(-1);

  useEffect(() => {
    try { if (localStorage.getItem(KEY)) return; } catch {}
    const start = setTimeout(() => setIdx(0), 8000);
    const interval = setInterval(() => {
      setIdx((i) => (i + 1) % EVENTS.length);
    }, 12000);
    return () => { clearTimeout(start); clearInterval(interval); };
  }, []);

  if (idx < 0) return null;
  const e = EVENTS[idx];

  return (
    <div
      key={idx}
      className="fixed bottom-20 start-4 z-40 hidden max-w-xs animate-in fade-in slide-in-from-bottom-4 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur md:flex md:items-start md:gap-2"
    >
      <div className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-verified/15 text-green-verified">
        {e.icon}
      </div>
      <div className="flex-1">
        <div className="text-xs font-bold">{e.text}</div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">منذ لحظات</div>
      </div>
      <button
        aria-label="إغلاق"
        onClick={() => { try { localStorage.setItem(KEY, "1"); } catch {} setIdx(-1); }}
        className="text-muted-foreground hover:text-foreground"
      >
        ✕
      </button>
    </div>
  );
}
