import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const KEY = "push_prompt_v1";

export function PushNotifications() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (localStorage.getItem(KEY)) return;
    if (Notification.permission !== "default") return;
    const t = setTimeout(() => setOpen(true), 12000);
    return () => clearTimeout(t);
  }, []);
  const enable = async () => {
    try {
      const r = await Notification.requestPermission();
      localStorage.setItem(KEY, r);
      setOpen(false);
      if (r === "granted") toast.success("تم تفعيل الإشعارات");
    } catch {}
  };
  const dismiss = () => { localStorage.setItem(KEY, "dismissed"); setOpen(false); };
  if (!open) return null;
  return (
    <div className="fixed bottom-20 start-4 z-[90] max-w-sm rounded-2xl border bg-card/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2"><Bell className="h-5 w-5 text-primary" /></div>
        <div className="flex-1">
          <div className="text-sm font-bold">لا تفوّت الفرص</div>
          <div className="text-xs text-muted-foreground">فعّل التنبيهات لمتابعة المشاريع الجديدة وتحديثات استثماراتك.</div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={enable}>تفعيل</Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>لاحقاً</Button>
          </div>
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
