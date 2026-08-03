import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { toast } from "sonner";

export function CopyLinkButton({ url, label = "نسخ الرابط" }: { url?: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    const target = url ?? (typeof window !== "undefined" ? window.location.href : "");
    try {
      await navigator.clipboard.writeText(target);
      setDone(true); toast.success("تم نسخ الرابط");
      setTimeout(() => setDone(false), 1500);
    } catch { toast.error("تعذّر النسخ"); }
  };
  return (
    <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card/60 px-3 py-1.5 text-xs font-bold hover:border-primary hover:text-primary">
      {done ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
      {done ? "تم النسخ" : label}
    </button>
  );
}
